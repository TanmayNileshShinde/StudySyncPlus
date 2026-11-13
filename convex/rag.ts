"use node";

import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

declare const process: {
  env: Record<string, string | undefined>;
};

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

/** Get the server-side NVIDIA API key safely without exposing it. */
function getNvidiaApiKey(): string {
  const key = process.env.NVIDIA_API_KEY || process.env.NVIDEA_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      "NVIDIA_API_KEY environment variable is not configured. Please add your NVIDIA API key to .env.local and set it on your Convex deployment."
    );
  }
  return key.trim();
}

/** Get configured embedding model (defaults to nvidia/nemotron-3.5-embed-1b which supports 1024 dims). */
function getEmbeddingModel(): string {
  return process.env.NVIDIA_EMBEDDING_MODEL || "nvidia/nemotron-3.5-embed-1b";
}

/** Get configured chat model (defaults to nvidia/nemotron-3.5-lightning-30b-a3b). */
function getChatModel(): string {
  return process.env.NVIDIA_CHAT_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";
}

/**
 * Generate 1024-dimensional embeddings via NVIDIA NIM API.
 * Uses nvidia/nemotron-3.5-embed-1b with explicit 1024-dimension projection.
 * Exported for reuse by the automatic ingestion pipeline (convex/ingest.ts).
 */
export async function callNvidiaEmbeddings(
  texts: string[],
  inputType: "passage" | "query" = "passage"
): Promise<number[][]> {
  const apiKey = getNvidiaApiKey();
  const model = getEmbeddingModel();

  const payload: Record<string, unknown> = {
    input: texts,
    model,
    input_type: inputType,
    dimensions: 1024,
    encoding_format: "float",
  };

  const response = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA Embeddings API failed [${response.status}]: ${errorText}`);
  }

  const json = await response.json();
  const embeddings: number[][] = json.data.map(
    (item: { embedding: number[] }) => item.embedding
  );

  // Assert dimension alignment with Convex schema (1024 dimensions)
  if (embeddings.length > 0 && embeddings[0].length !== 1024) {
    throw new Error(
      `Embedding dimension mismatch: NVIDIA model '${model}' returned ${embeddings[0].length} dimensions, but Convex schema expects 1024.`
    );
  }

  return embeddings;
}

/** Split clean page/slide text into overlapping semantic chunks with provenance. */
export function chunkPageText(
  pageText: string,
  pageNum: number,
  startSeq: number
): Array<{ seq: number; page: number; text: string }> {
  const normalized = pageText.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
  if (normalized.length < 30) return [];

  const chunks: Array<{ seq: number; page: number; text: string }> = [];
  const chunkSize = 750; // ~150-200 words
  const overlap = 150;

  let start = 0;
  let currentSeq = startSeq;

  while (start < normalized.length) {
    let end = start + chunkSize;
    if (end < normalized.length) {
      // Look for natural boundary (newline or period) near the end
      const lastNewline = normalized.lastIndexOf("\n", end);
      const lastPeriod = normalized.lastIndexOf(". ", end);
      const boundary = Math.max(lastNewline, lastPeriod);
      if (boundary > start + chunkSize / 2) {
        end = boundary + 1;
      }
    } else {
      end = normalized.length;
    }

    const chunkStr = normalized.slice(start, end).trim();
    if (chunkStr.length >= 40) {
      chunks.push({
        seq: currentSeq++,
        page: pageNum,
        text: chunkStr,
      });
    }

    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}

/**
 * Public action: Ingest a catalogued PDF resource from Convex File Storage into
 * documentChunks with 1024-d embeddings. Fully idempotent with duplicate check.
 */
export const ingestResourcePages = action({
  args: {
    resourceId: v.id("resources"),
    forceReindex: v.optional(v.boolean()),
    clearBefore: v.optional(v.boolean()),
    startSeq: v.optional(v.number()),
    pages: v.array(
      v.object({
        num: v.number(),
        text: v.string(),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    status: string;
    message: string;
    totalPages?: number;
    chunksIndexed: number;
    nextSeq?: number;
  }> => {
    // Step 1: Check existing chunks for duplicate protection
    const existingCount: number = await ctx.runQuery(
      internal.ragInternal.getExistingChunksCount,
      { resourceId: args.resourceId }
    );

    if (existingCount > 0 && !args.forceReindex && !args.clearBefore && args.startSeq === undefined) {
      return {
        status: "already_indexed",
        message: `Resource already indexed with ${existingCount} chunks. Set forceReindex=true to rebuild.`,
        chunksIndexed: existingCount,
      };
    }

    // Step 2: Fetch resource metadata
    const resource = await ctx.runQuery(
      internal.ragInternal.getResourceForIngestion,
      { resourceId: args.resourceId }
    );
    if (!resource) {
      throw new Error(`Resource ${args.resourceId} not found.`);
    }

    if (!args.pages || args.pages.length === 0) {
      throw new Error("No pages provided for ingestion.");
    }

    // Clear existing chunks if explicit re-indexing or clearBefore
    if ((args.forceReindex || args.clearBefore) && existingCount > 0) {
      await ctx.runMutation(internal.ragInternal.clearChunks, {
        resourceId: args.resourceId,
      });
    }

    // Step 3: Chunk document preserving page numbers
    const allChunks: Array<{ seq: number; page: number; text: string }> = [];
    let seqCounter = args.startSeq ?? 0;
    for (const page of args.pages) {
      const pageChunks = chunkPageText(page.text, page.num, seqCounter);
      allChunks.push(...pageChunks);
      seqCounter += pageChunks.length;
    }

    if (allChunks.length === 0) {
      return {
        status: "empty_chunks",
        message: "No readable text chunks could be produced from these pages.",
        totalPages: args.pages.length,
        chunksIndexed: 0,
        nextSeq: seqCounter,
      };
    }

    // Step 4: Generate embeddings in batches and persist
    const BATCH_SIZE = 24;
    let savedTotal = 0;

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.text);
      const embeddings = await callNvidiaEmbeddings(texts, "passage");

      const chunksWithEmbeddings = batch.map((c, idx) => ({
        resourceId: args.resourceId,
        semesterId: resource.semesterId,
        subjectId: resource.subjectId,
        seq: c.seq,
        page: c.page,
        text: c.text,
        embedding: embeddings[idx],
      }));

      await ctx.runMutation(internal.ragInternal.saveChunkBatch, {
        chunks: chunksWithEmbeddings,
      });
      savedTotal += chunksWithEmbeddings.length;
    }

    return {
      status: "success",
      message: `Indexed ${args.pages.length} pages into ${savedTotal} vector chunks for "${resource.title}".`,
      totalPages: args.pages.length,
      chunksIndexed: savedTotal,
      nextSeq: seqCounter,
    };
  },
});

/**
 * Public action: Semantic retrieval across Convex Vector Search.
 * Supports Library, Semester, Subject, and Individual Document modes.
 */
export const search = action({
  args: {
    query: v.string(),
    mode: v.union(
      v.literal("library"),
      v.literal("semester"),
      v.literal("subject"),
      v.literal("resource")
    ),
    resourceId: v.optional(v.id("resources")),
    semesterId: v.optional(v.id("semesters")),
    subjectId: v.optional(v.id("subjects")),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      chunkId: Id<"documentChunks">;
      resourceId: Id<"resources">;
      resourceTitle: string;
      courseCode: string;
      fileKind: "pdf" | "ppt" | "pptx" | null;
      page?: number;
      text: string;
      score: number;
    }>
  > => {
    const trimmedQuery = args.query.trim();
    if (trimmedQuery.length === 0) return [];

    // Step 1: Generate query embedding
    const [queryEmbedding] = await callNvidiaEmbeddings([trimmedQuery], "query");

    // Step 2: Configure vector search filter based on chat mode
    let searchFilter;
    if (args.mode === "resource" && args.resourceId) {
      searchFilter = (q: any) => q.eq("resourceId", args.resourceId);
    } else if (args.mode === "subject" && args.subjectId) {
      // Subject chat: retrieve across ALL documents belonging to that subject.
      searchFilter = (q: any) => q.eq("subjectId", args.subjectId);
    } else if (args.mode === "semester" && args.semesterId) {
      searchFilter = (q: any) => q.eq("semesterId", args.semesterId);
    }

    // Step 3: Run Vector Search in Convex
    const rawResults = await ctx.vectorSearch("documentChunks", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit ?? 6,
      ...(searchFilter ? { filter: searchFilter } : {}),
    });

    if (rawResults.length === 0) return [];

    // Filter out very low similarity hits
    const viableHits = rawResults.filter((h) => h._score >= 0.22);
    if (viableHits.length === 0) return [];

    // Step 4: Hydrate chunk records and resource metadata
    return await ctx.runQuery(internal.ragInternal.hydrateChunkResults, {
      hits: viableHits.map((h) => ({ id: h._id, score: h._score })),
    });
  },
});

/**
 * Public action: Complete RAG Chat loop.
 * Retrieves grounded context -> passes to NVIDIA LLM -> persists thread and messages.
 */
export const chat = action({
  args: {
    threadId: v.optional(v.id("chatThreads")),
    ownerKey: v.string(),
    mode: v.union(
      v.literal("library"),
      v.literal("semester"),
      v.literal("subject"),
      v.literal("resource")
    ),
    resourceId: v.optional(v.id("resources")),
    semesterId: v.optional(v.id("semesters")),
    subjectId: v.optional(v.id("subjects")),
    message: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    threadId: Id<"chatThreads">;
    reply: string;
    citations: Array<{
      chunkId: Id<"documentChunks">;
      resourceId: Id<"resources">;
      resourceTitle: string;
      fileKind?: string;
      page?: number;
      textSnippet: string;
      score: number;
    }>;
  }> => {
    const userText = args.message.trim();
    if (!userText) throw new Error("Message cannot be empty.");

    const apiKey = getNvidiaApiKey();
    const chatModel = getChatModel();

    // Step 1: Ensure active thread
    let threadId: Id<"chatThreads">;
    if (!args.threadId) {
      const defaultTitle = userText.slice(0, 50) + (userText.length > 50 ? "…" : "");
      threadId = await ctx.runMutation(api.chat.createThread, {
        ownerKey: args.ownerKey,
        title: defaultTitle,
        mode: args.mode,
        resourceId: args.resourceId,
        semesterId: args.semesterId,
        subjectId: args.subjectId,
      });
    } else {
      threadId = args.threadId;
    }

    // Save user message to thread
    await ctx.runMutation(api.chat.appendUserMessage, {
      threadId,
      content: userText,
    });

    // Step 2: Retrieve relevant context chunks using vector search
    let citations: Array<{
      chunkId: Id<"documentChunks">;
      resourceId: Id<"resources">;
      resourceTitle: string;
      courseCode: string;
      fileKind: "pdf" | "ppt" | "pptx" | null;
      page?: number;
      text: string;
      score: number;
    }> = [];

    try {
      citations = await ctx.runAction(api.rag.search, {
        query: userText,
        mode: args.mode,
        resourceId: args.resourceId,
        semesterId: args.semesterId,
        subjectId: args.subjectId,
        limit: 5,
      });
    } catch (err) {
      console.error("Vector search retrieval failed:", err);
      // Fallback: Proceed without context or indicate search error
    }

    // Step 3: Fetch existing chat history for context continuity
    const history = await ctx.runQuery(api.chat.listMessages, { threadId });
    // Keep last 6 messages before current user turn
    const recentHistory = (history as Array<{ role: string; content: string }>)
      .slice(-7, -1)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Step 4: Construct Grounded System Prompt
    const hasContext = citations.length > 0;
    /** "Page 28" for PDFs, "Slide 5" for PowerPoint decks. */
    const refLabel = (kind: string | null | undefined, page?: number): string => {
      if (!page) return "";
      return kind && kind !== "pdf" ? ` · Slide ${page}` : ` · Page ${page}`;
    };
    const contextBlock = hasContext
      ? citations
          .map(
            (c, i) =>
              `[SOURCE ${i + 1}] Document: "${c.resourceTitle}" (${c.courseCode})${refLabel(c.fileKind, c.page)}\nContent:\n${c.text}`
          )
          .join("\n\n---\n\n")
      : "NO RELEVANT COURSE DOCUMENTS FOUND FOR THIS QUERY.";

    const systemPrompt = `You are StudySync AI, the authoritative academic study assistant for Semester III Computer Engineering students at Shah & Anchor Kutchhi Engineering College (SAKEC).

CRITICAL RESPONSE GUIDELINES (STRICTLY ENFORCED):

1. CONCISE & SUMMARIZED (ZERO FLUFF):
   - Deliver tight, summarized, high-yield academic answers. Answer ONLY what the student asked for.
   - Do NOT add wordy greetings, lengthy historical background essays, or repetitive conclusions.
   - If asked for a table: output the table directly with a brief 1-2 sentence explanation.
   - If asked for code: output the clean, commented code snippet with time/space complexity notes.
   - If asked for a flowchart: output the Mermaid block directly with a concise 1-2 sentence walkthrough.
   - Keep total text under 250–350 words unless explicitly asked for an exhaustive explanation.

2. TABLES & COMPARISONS (MANDATORY WHEN REQUESTED):
   - Whenever the student mentions "table", "tabular", "compare", "comparison", "trace", or asks for step-by-step conversion steps (e.g., infix-to-postfix table, postfix evaluation table, stack vs queue comparison):
     YOU MUST ALWAYS OUTPUT A CLEAN GFM MARKDOWN TABLE (| Header 1 | Header 2 | ...).
   - For expression conversions / traces, format every step in a clear table:
     | Step | Symbol Scanned | Stack State | Expression / Output | Action / Rule Applied |
   - Never replace a requested table with bullet points or paragraphs.

3. ACCURATE GROUNDING WITH HELPFUL EXTENSION:
   - Base answers on the provided official course documents below and cite exact source document titles with their page or slide references (e.g., "[Data Structures MSE Guide, Page 28]" or "[Unit 2 Deck, Slide 5]").
   - If a requested topic is related to syllabus material but slightly outside the specific PDF notes (e.g., the notes explicitly detail Infix-to-Postfix on p.26–29, and the student asks for Postfix-to-Infix in table format):
     First cite what is in the guide (e.g. *"[Data Structures MSE Guide, p. 26-29 covers Infix-to-Postfix]"*), and THEN directly provide the requested table and solution:
     "> **Academic Note:** Standard Computer Science method (complementary to SAKEC guide p.26–29)."
     Never refuse a standard CS question with a blank refusal when you can provide the exact table requested!

4. FLOWCHARTS & MERMAID SYNTAX:
   When creating diagrams or flowcharts using \`\`\`mermaid:
   - Always use standard \`flowchart TD\` or \`flowchart LR\`.
   - CRITICAL: Always enclose node text labels in double quotes if they contain parentheses, punctuation, operators, or function calls (e.g. node["Read symbol()"], op["opnd2 = pop()"], res["result = opnd1 + opnd2"]).
   - NEVER use reserved keywords like 'end', 'graph', or 'subgraph' as node identifiers. Use 'finish([END])' or 'stop([STOP])' instead.
   - Always enclose edge labels containing parentheses in double quotes (e.g. -->|"OUTPUT pop()"|).`;

    const userPromptWithContext = `DOCUMENT CONTEXT:
${contextBlock}

STUDENT QUESTION:
${userText}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: userPromptWithContext },
    ];

    // Step 5: Call NVIDIA Chat Completion API
    let assistantReply = "";
    try {
      const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: chatModel,
          messages,
          temperature: 0.2,
          max_tokens: 1800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Chat model ${chatModel} failed (${response.status}): ${errorText}. Falling back to minimaxai/minimax-m3.1-flash...`);
        const fbResponse = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "minimaxai/minimax-m3.1-flash",
            messages,
            temperature: 0.2,
            max_tokens: 4024,
          }),
        });
        if (fbResponse.ok) {
          const fbJson = await fbResponse.json();
          const fbMsg = fbJson.choices?.[0]?.message;
          assistantReply = fbMsg?.content?.trim() || fbMsg?.reasoning_content?.trim() || "";
        } else {
          throw new Error(`NVIDIA Chat API failed: ${errorText}`);
        }
      } else {
        const json = await response.json();
        const msg = json.choices?.[0]?.message;
        assistantReply = msg?.content?.trim() || msg?.reasoning_content?.trim() || "";
      }
    } catch (err: any) {
      assistantReply = `⚠️ NVIDIA API Error: ${err.message || "Failed to contact language model."}. Please check that your NVIDIA API key is valid and has model credits.`;
    }

    // Step 6: Persist assistant message with citations
    const formattedCitations = citations.map((c) => ({
      chunkId: c.chunkId,
      resourceId: c.resourceId,
      resourceTitle: c.resourceTitle,
      fileKind: c.fileKind ?? undefined,
      page: c.page,
      textSnippet: c.text.slice(0, 200),
      score: c.score,
    }));

    await ctx.runMutation(api.chat.appendAssistantMessage, {
      threadId,
      content: assistantReply,
      citations: formattedCitations,
    });

    return {
      threadId,
      reply: assistantReply,
      citations: formattedCitations,
    };
  },
});
