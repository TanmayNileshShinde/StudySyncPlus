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

/**
 * Get configured embedding model.
 * Defaults to "nvidia/nemotron-3.5-embed-1b" (Nemotron 3.5 Embed 1B, 2048 output dimensions).
 */
function getEmbeddingModel(): string {
  return process.env.NVIDIA_EMBEDDING_MODEL || "nvidia/nemotron-3.5-embed-1b";
}

/** Get configured chat model (defaults to nvidia/nemotron-3.5-lightning-30b-a3b). */
function getChatModel(): string {
  return process.env.NVIDIA_CHAT_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";
}

/**
 * Maximum completion tokens for chat responses.
 * Defaults to 16384 tokens (the full output budget for Nemotron 30B / NVIDIA NIM),
 * giving maximum room for reasoning/thinking tokens plus full multi-function C programs,
 * step-by-step algorithms, trace tables, and complexity analyses without cutoff.
 */
function getMaxCompletionTokens(): number {
  const envVal = process.env.NVIDIA_MAX_TOKENS || process.env.NVIDIA_MAX_COMPLETION_TOKENS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 8192 && parsed <= 16384) {
      return parsed;
    }
  }
  return 16384;
}

/** Sleep helper with optional jitter for exponential backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single embedding request to NVIDIA NIM with retries, strict 10s timeout,
 * and exponential backoff for transient failures (429, 5xx, timeouts).
 */
async function callNvidiaSingleText(
  text: string,
  inputType: "passage" | "query",
  apiKey: string,
  model: string
): Promise<number[]> {
  const payload = {
    input: [text],
    model,
    input_type: inputType,
    encoding_format: "float",
  };

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${NVIDIA_BASE_URL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // Strict 10s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isTransient =
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;

        if (isTransient && attempt < MAX_RETRIES) {
          const backoff = Math.min(500 * Math.pow(2, attempt) + Math.random() * 200, 4000);
          console.warn(
            `[callNvidiaEmbeddings] Transient error (${response.status}) on attempt ${attempt + 1}/${MAX_RETRIES + 1}. Retrying in ${Math.round(backoff)}ms...`
          );
          await sleep(backoff);
          continue;
        }

        throw new Error(`NVIDIA Embeddings API failed [${response.status}]: ${errorText}`);
      }

      const json = await response.json();
      const embedding = json.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error("NVIDIA Embeddings API returned malformed response with no embedding vector.");
      }

      if (embedding.length !== 2048) {
        throw new Error(
          `Embedding dimension mismatch: NVIDIA model '${model}' returned ${embedding.length} dimensions, but Convex schema expects 2048.`
        );
      }

      return embedding;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isAbort = err?.name === "TimeoutError" || err?.name === "AbortError";
      if ((isAbort || err?.message?.includes("fetch failed")) && attempt < MAX_RETRIES) {
        const backoff = Math.min(500 * Math.pow(2, attempt) + Math.random() * 200, 4000);
        console.warn(
          `[callNvidiaEmbeddings] Network error (${err.message}) on attempt ${attempt + 1}/${MAX_RETRIES + 1}. Retrying in ${Math.round(backoff)}ms...`
        );
        await sleep(backoff);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("callNvidiaSingleText failed after all retries.");
}

/**
 * Generate 2048-dimensional embeddings via NVIDIA NIM API.
 * Uses nvidia/nemotron-3.5-embed-1b.
 * Employs bounded concurrency (6 concurrent requests) for optimal throughput,
 * with strict 10s per-request timeouts and exponential backoff.
 * Exported for reuse by the automatic ingestion pipeline (convex/ingest.ts).
 */
export async function callNvidiaEmbeddings(
  texts: string[],
  inputType: "passage" | "query" = "passage"
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = getNvidiaApiKey();
  const model = getEmbeddingModel();

  if (texts.length === 1) {
    const single = await callNvidiaSingleText(texts[0], inputType, apiKey, model);
    return [single];
  }

  // Bounded concurrency pool (6 parallel requests)
  const CONCURRENCY = 6;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const slice = texts.slice(i, i + CONCURRENCY);
    const sliceResults = await Promise.all(
      slice.map((t) => callNvidiaSingleText(t, inputType, apiKey, model))
    );
    results.push(...sliceResults);
  }

  return results;
}

/** Split clean page/slide text into overlapping semantic chunks with provenance. */
export function chunkPageText(
  pageText: string,
  pageNum: number,
  startSeq: number
): Array<{ seq: number; page: number; text: string }> {
  const normalized = pageText.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
  if (normalized.length === 0) return [];

  // Short slides or pages (e.g. diagrams, titles, formula slides < 50 chars)
  // must still produce a valid chunk with their exact slide/page provenance so they
  // are indexed, retrievable, and citeable by the AI assistant.
  if (normalized.length < 50) {
    return [{ seq: startSeq, page: pageNum, text: normalized }];
  }

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
    if (chunkStr.length > 0) {
      chunks.push({
        seq: currentSeq++,
        page: pageNum,
        text: chunkStr,
      });
    }

    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }

  // Fallback guard: if chunking loop didn't capture content, preserve as single chunk
  if (chunks.length === 0 && normalized.length > 0) {
    chunks.push({
      seq: currentSeq,
      page: pageNum,
      text: normalized,
    });
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
    const BATCH_SIZE = 16;
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
 * Supports Library, Semester, Subject, Folder, Selected Resources, and Individual Document modes.
 */
export const search = action({
  args: {
    query: v.string(),
    mode: v.union(
      v.literal("library"),
      v.literal("semester"),
      v.literal("subject"),
      v.literal("folder"),
      v.literal("selected"),
      v.literal("resource")
    ),
    resourceId: v.optional(v.id("resources")),
    taggedResourceId: v.optional(v.id("resources")),
    taggedPage: v.optional(v.number()),
    taggedPages: v.optional(v.array(v.number())),
    semesterId: v.optional(v.id("semesters")),
    subjectId: v.optional(v.id("subjects")),
    folderId: v.optional(v.id("folders")),
    selectedResourceIds: v.optional(v.array(v.id("resources"))),
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

    let targetResourceIds: Set<string> | null = null;
    let effectiveSubjectId = args.subjectId;

    if (args.mode === "folder" && args.folderId) {
      const folderInfo: { subjectId: Id<"subjects"> | null; resourceIds: Id<"resources">[] } =
        await ctx.runQuery(internal.ragInternal.getResourcesInFolder, {
          folderId: args.folderId,
        });
      if (folderInfo.resourceIds.length === 0) return [];
      targetResourceIds = new Set(folderInfo.resourceIds.map(String));
      if (folderInfo.subjectId) effectiveSubjectId = folderInfo.subjectId;
    } else if (args.mode === "selected" && args.selectedResourceIds && args.selectedResourceIds.length > 0) {
      targetResourceIds = new Set(args.selectedResourceIds.map(String));
    }

    // Step 1: Generate query embedding
    const [queryEmbedding] = await callNvidiaEmbeddings([trimmedQuery], "query");

    // Step 2: Configure vector search filter based on chat mode
    let searchFilter;
    if (args.mode === "resource" && args.resourceId) {
      searchFilter = (q: any) => q.eq("resourceId", args.resourceId);
    } else if (effectiveSubjectId) {
      searchFilter = (q: any) => q.eq("subjectId", effectiveSubjectId);
    } else if (args.mode === "semester" && args.semesterId) {
      searchFilter = (q: any) => q.eq("semesterId", args.semesterId);
    }

    // Step 3: Run Vector Search in Convex
    const searchLimit = targetResourceIds ? Math.max((args.limit ?? 6) * 3, 20) : (args.limit ?? 6);
    const rawResults = await ctx.vectorSearch("documentChunks", "by_embedding", {
      vector: queryEmbedding,
      limit: searchLimit,
      ...(searchFilter ? { filter: searchFilter } : {}),
    });

    if (rawResults.length === 0) return [];

    // Filter out very low similarity hits
    const viableHits = rawResults.filter((h) => h._score >= 0.22);
    if (viableHits.length === 0) return [];

    // Step 4: Hydrate chunk records and resource metadata
    const hydrated = await ctx.runQuery(internal.ragInternal.hydrateChunkResults, {
      hits: viableHits.map((h) => ({ id: h._id, score: h._score })),
    });

    // Step 5: If folder or selected mode, filter to only the targeted resources
    if (targetResourceIds) {
      return hydrated
        .filter((chunk) => targetResourceIds.has(String(chunk.resourceId)))
        .slice(0, args.limit ?? 6);
    }

    return hydrated.slice(0, args.limit ?? 6);
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
      v.literal("folder"),
      v.literal("selected"),
      v.literal("resource")
    ),
    resourceId: v.optional(v.id("resources")),
    taggedResourceId: v.optional(v.id("resources")),
    taggedPage: v.optional(v.number()),
    taggedPages: v.optional(v.array(v.number())),
    semesterId: v.optional(v.id("semesters")),
    subjectId: v.optional(v.id("subjects")),
    folderId: v.optional(v.id("folders")),
    selectedResourceIds: v.optional(v.array(v.id("resources"))),
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
        folderId: args.folderId,
        selectedResourceIds: args.selectedResourceIds,
      });
    } else {
      threadId = args.threadId;
    }

    // Step 2: Fetch existing chat history BEFORE appending the new message
    // This allows detecting conversational follow-ups and preserving topic context.
    const rawHistory = await ctx.runQuery(api.chat.listMessages, { threadId });
    const existingMessages = (rawHistory as Array<{
      role: string;
      content: string;
      citations?: Array<{
        chunkId: Id<"documentChunks">;
        resourceId: Id<"resources">;
        resourceTitle: string;
        page?: number;
        fileKind?: string;
        textSnippet: string;
        score: number;
      }>;
    }>) || [];

    // Save current user message to thread (guarding against rapid double-submits)
    const effectiveTaggedResourceId =
      args.taggedResourceId || (args.mode === "resource" ? args.resourceId : undefined);
    let taggedPages =
      args.taggedPages && args.taggedPages.length > 0
        ? Array.from(new Set(args.taggedPages)).sort((a, b) => a - b)
        : args.taggedPage
          ? [args.taggedPage]
          : undefined;

    // Natural-language slide/page detection fallback:
    // If the student asked about specific slides/pages (e.g. "explain slide 15 and slide 23")
    // without typing @/ tags, automatically extract those slide numbers so exact chunks are retrieved.
    if ((!taggedPages || taggedPages.length === 0) && effectiveTaggedResourceId) {
      const detected = new Set<number>();
      const matches = userText.matchAll(/\b(?:slides?|pages?)\s+(\d+)(?:\s*(?:and|&|,|-)\s*(\d+))?/gi);
      for (const m of matches) {
        if (m[1]) detected.add(parseInt(m[1], 10));
        if (m[2]) detected.add(parseInt(m[2], 10));
      }
      if (detected.size > 0) {
        taggedPages = Array.from(detected).sort((a, b) => a - b);
      }
    }
    const taggedPage = taggedPages && taggedPages.length > 0 ? taggedPages[0] : args.taggedPage;

    const lastExisting = existingMessages[existingMessages.length - 1];
    const isDuplicateRecentUserMsg =
      lastExisting &&
      lastExisting.role === "user" &&
      lastExisting.content.trim() === userText.trim();

    if (!isDuplicateRecentUserMsg) {
      await ctx.runMutation(api.chat.appendUserMessage, {
        threadId,
        content: userText,
        taggedPage: taggedPage,
        taggedPages: taggedPages,
        taggedResourceId: effectiveTaggedResourceId,
      });
    }

    // Step 3: Contextual Query Expansion for Vector Search
    // If this is a follow-up in an ongoing thread, combine the prior conversation anchor
    // with the current query so dense vector search retains topic relevance.
    let searchQuery = userText;
    const isOngoingThread = existingMessages.length > 0;

    if (isOngoingThread) {
      const lastUserMsg = [...existingMessages].reverse().find((m) => m.role === "user");
      const wordCount = userText.trim().split(/\s+/).length;
      // Explicit anaphoric / relative markers (always indicate a follow-up):
      const hasAnaphoricMarker = /\b(it|this|that|these|those|them|step\s*\d+|above|previous|earlier|the\s+same|the\s+other|the\s+first|the\s+second|the\s+third|the\s+last)\b/i.test(
        userText
      );
      // Short contextual continuation requests (<= 14 words with elaboration/code/table/continuation keywords, or very short <= 6 words):
      const isContextualShort =
        wordCount <= 6 ||
        (wordCount <= 14 &&
          /\b(code|table|diagram|flowchart|example|more|elaborate|explain|why|how|what about|continue|trace)\b/i.test(
            userText
          ));

      if (lastUserMsg && (hasAnaphoricMarker || isContextualShort)) {
        // Strip out any redundant prefixes from previous query
        const cleanPreviousTopic = lastUserMsg.content
          .replace(/^DOCUMENT CONTEXT:[\s\S]*?STUDENT QUESTION:\s*/i, "")
          .slice(0, 150)
          .replace(/\s+/g, " ")
          .trim();
        if (cleanPreviousTopic && cleanPreviousTopic.toLowerCase() !== userText.toLowerCase()) {
          searchQuery = `${cleanPreviousTopic} — ${userText}`;
        }
      }
    }

    // Step 4: Retrieve relevant context chunks using vector search or exact tagged page chunks
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

    // If exact page(s) or slide(s) are tagged, fetch all their exact chunks directly
    if (effectiveTaggedResourceId && taggedPages && taggedPages.length > 0) {
      try {
        const pagesChunks = await ctx.runQuery(internal.ragInternal.getChunksForPages, {
          resourceId: effectiveTaggedResourceId,
          pages: taggedPages,
        });
        if (pagesChunks && pagesChunks.length > 0) {
          citations = pagesChunks;
        }

        // Check if any tagged page was missing from direct chunks; supplement with semantic search
        const foundPages = new Set(pagesChunks.map((c) => c.page).filter(Boolean));
        const missingPages = taggedPages.filter((p) => !foundPages.has(p));
        if (missingPages.length > 0) {
          try {
            const fallbackHits = await ctx.runAction(api.rag.search, {
              query: `${searchQuery} slide ${missingPages.join(" ")}`,
              mode: "resource",
              resourceId: effectiveTaggedResourceId,
              limit: 4,
            });
            const existingIds = new Set(citations.map((c) => String(c.chunkId)));
            for (const hit of fallbackHits) {
              if (!existingIds.has(String(hit.chunkId))) {
                citations.push(hit);
                existingIds.add(String(hit.chunkId));
              }
            }
          } catch (err) {
            console.error("Fallback vector search for missing tagged pages failed:", err);
          }
        }
      } catch (err) {
        console.error("Direct multi-page chunk retrieval failed:", err);
      }
    } else if (effectiveTaggedResourceId && taggedPage) {
      try {
        const pageChunks = await ctx.runQuery(internal.ragInternal.getChunksForPage, {
          resourceId: effectiveTaggedResourceId,
          page: taggedPage,
        });
        if (pageChunks && pageChunks.length > 0) {
          citations = pageChunks;
        }
      } catch (err) {
        console.error("Direct page chunk retrieval failed:", err);
      }
    }

    // If no page chunks found (or not in single-page tagged mode), run semantic vector search
    if (citations.length === 0) {
      try {
        citations = await ctx.runAction(api.rag.search, {
          query: searchQuery,
          mode: effectiveTaggedResourceId ? "resource" : args.mode,
          resourceId: effectiveTaggedResourceId ?? args.resourceId,
          semesterId: args.semesterId,
          subjectId: args.subjectId,
          folderId: args.folderId,
          selectedResourceIds: args.selectedResourceIds,
          limit: 5,
        });
      } catch (err) {
        console.error("Vector search retrieval failed:", err);
      }
    }

    // Step 5: Citation Carry-Forward
    // If the follow-up search produced 0 citations, carry forward the previous assistant turn's citations
    // so the grounded context from earlier turns is preserved throughout the discussion.
    if (citations.length === 0 && isOngoingThread) {
      const lastAssistantWithCitations = [...existingMessages]
        .reverse()
        .find((m) => m.role === "assistant" && m.citations && m.citations.length > 0);

      if (lastAssistantWithCitations?.citations && lastAssistantWithCitations.citations.length > 0) {
        citations = lastAssistantWithCitations.citations.map((c) => ({
          chunkId: c.chunkId,
          resourceId: c.resourceId,
          resourceTitle: c.resourceTitle,
          courseCode: "Course Notes",
          fileKind: (c.fileKind as "pdf" | "ppt" | "pptx" | null) ?? null,
          page: c.page,
          text: c.textSnippet,
          score: c.score ?? 0.8,
        }));
      }
    }

    // Step 6: Format sanitized history window for the LLM
    // Take up to 10 messages (5 full turns), strip reasoning tags, and guarantee alternating user->assistant turns.
    const historySlice = existingMessages.slice(-10);
    // Ensure the history slice starts with a 'user' turn
    const alignedSlice =
      historySlice.length > 0 && historySlice[0].role === "assistant"
        ? historySlice.slice(1)
        : historySlice;

    const recentHistory = alignedSlice.map((m) => {
      let content = m.content || "";
      if (m.role === "assistant") {
        // Strip <think>...</think> reasoning blocks from previous assistant replies
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        // Truncate overly long past answers to protect context window budget
        if (content.length > 2500) {
          content = content.slice(0, 2500) + "… [earlier reply summarized for brevity]";
        }
      }
      return {
        role: m.role as "user" | "assistant",
        content,
      };
    });

    // Step 7: Construct Grounded System Prompt
    const hasContext = citations.length > 0;
    /** "Page 28" for PDFs, "Slide 5" for PowerPoint decks. */
    const refLabel = (kind: string | null | undefined, page?: number): string => {
      if (!page) return "";
      return kind && kind !== "pdf" ? ` · Slide ${page}` : ` · Page ${page}`;
    };
    let contextBlock: string;
    if (hasContext) {
      contextBlock = citations
        .map(
          (c, i) =>
            `[SOURCE ${i + 1}] Document: "${c.resourceTitle}" (${c.courseCode})${refLabel(c.fileKind, c.page)}\nContent:\n${c.text}`
        )
        .join("\n\n---\n\n");
    } else if (isOngoingThread) {
      contextBlock =
        "[CONVERSATIONAL CONTINUITY: The student is continuing an ongoing study conversation. Use the preceding conversation history to resolve their question and maintain context.]";
    } else {
      contextBlock = "NO RELEVANT COURSE DOCUMENTS FOUND FOR THIS QUERY.";
    }

    let taggedFocusDirective = "";
    if (effectiveTaggedResourceId && taggedPages && taggedPages.length > 0) {
      const docTitle = citations[0]?.resourceTitle || "the tagged material";
      const fileKind = citations[0]?.fileKind || "pdf";
      const unitLabel = fileKind === "pdf" ? "Page" : "Slide";
      const pluralLabel = taggedPages.length > 1 ? `${unitLabel}s` : unitLabel;
      taggedFocusDirective = `\n\n🎯 STRICT TAGGED FOCUS DIRECTIVE (ABSOLUTE PRIORITY):\nThe student has explicitly TAGGED ${pluralLabel} ${taggedPages.join(", ")} of "${docTitle}".\nYou MUST explain and answer based STRICTLY AND ONLY on the contents of these tagged ${pluralLabel.toLowerCase()}.\nDo NOT introduce unmentioned topics from other pages, slides, or documents.\nProvide a comprehensive, high-yield, and crystal-clear explanation of everything on these tagged ${pluralLabel.toLowerCase()}.\n`;
    } else if (effectiveTaggedResourceId && taggedPage) {
      const docTitle = citations[0]?.resourceTitle || "the tagged material";
      const fileKind = citations[0]?.fileKind || "pdf";
      const unitLabel = fileKind === "pdf" ? "Page" : "Slide";
      taggedFocusDirective = `\n\n🎯 STRICT TAGGED FOCUS DIRECTIVE (ABSOLUTE PRIORITY):\nThe student has explicitly TAGGED ${unitLabel} ${taggedPage} of "${docTitle}".\nYou MUST explain and answer based STRICTLY AND ONLY on the contents of this tagged ${unitLabel.toLowerCase()}.\nDo NOT introduce unmentioned topics from other pages, slides, or documents.\nProvide a comprehensive, high-yield, and crystal-clear explanation of everything on this tagged ${unitLabel.toLowerCase()}.\n`;
    } else if (effectiveTaggedResourceId) {
      const docTitle = citations[0]?.resourceTitle || "the tagged document";
      taggedFocusDirective = `\n\n🎯 STRICT TAGGED FOCUS DIRECTIVE (ABSOLUTE PRIORITY):\nThe student has explicitly TAGGED the document "${docTitle}".\nYou MUST explain and answer based STRICTLY AND ONLY on the contents of this document.\nDo NOT refer to outside materials.\n`;
    }

    const systemPrompt = `You are StudySync AI, the authoritative academic study assistant for Semester III Computer Engineering students at Shah & Anchor Kutchhi Engineering College (SAKEC).${taggedFocusDirective}

CRITICAL RESPONSE GUIDELINES (STRICTLY ENFORCED):

1. COMPLETE CODE FIRST & STRUCTURED WALKTHROUGH:
   Whenever the student asks for code, implementation, or a data structure/algorithm (e.g. Stack, Queue, Linked List, Tree, Graph, Sorting, Search):
   - FORMAT ORDER (MANDATORY):
     1. 💻 COMPLETE WORKING CODE (ON TOP):
        - Output the full, compilation-ready C (or requested language) program FIRST, right at the top.
        - ALWAYS include all essential operations—NEVER give only one partial function!
          (e.g., For Stack: isFull, isEmpty, push, pop, peek, display, and a complete main() driver menu).
          (e.g., For Queue: isEmpty, isFull, enqueue, dequeue, display, and main()).
          (e.g., For Linked List: createNode, insertAtBeginning/End, deleteNode, display, and main()).
        - Use clean, standard C with meaningful variable names, robust boundary checks (overflow, underflow), and helpful inline comments.
     2. 📋 ALGORITHM IN POINTS:
        - Right after the code, provide the step-by-step algorithmic procedure in clean numbered points.
        - Break it down by operation (e.g. "Algorithm for Push:", "Algorithm for Pop:").
        - Highlight critical conditions (e.g. "Step 1: Check if top == MAX - 1 (Overflow).").
     3. ⏱️ COMPLEXITY ANALYSIS:
        - List Time Complexity (Best, Average, Worst case) for each operation.
        - List Space Complexity (Auxiliary & Total).
   - Zero fluff: Skip chatty conversational greetings or repetitive filler ("Here is your code", "Hope this helps"). Start immediately with the high-yield technical answer.

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
   - Always enclose edge labels containing parentheses in double quotes (e.g. -->|"OUTPUT pop()"|).

5. CONVERSATIONAL CONTINUITY & FOLLOW-UP INSTRUCTIONS:
   - You are in an active, continuous study session with the student.
   - When the student asks follow-up questions (using pronouns or relative references such as "it", "that", "this", "these", "step 2", "the above table", "write code for that", "show an example", "continue", "explain more", "why is that?"), ALWAYS connect their question to the preceding dialogue.
   - NEVER treat follow-up questions as isolated queries or ask the student what they are referring to when it was discussed in earlier turns.
   - Maintain consistent terminology, notation, algorithm conventions, and academic level established in earlier turns.

6. REASONING & TOKEN BUDGET EFFICIENCY:
   - Keep internal scratchpad/reasoning concise and directly focused on the technical requirements.
   - Dedicate your token output to the visible solution: complete, compilation-ready code, clear numbered algorithms, complexity analysis, and trace tables. Never truncate code or stop midway.`;

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
    const maxTokens = getMaxCompletionTokens();
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
          max_tokens: maxTokens,
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
            max_tokens: maxTokens,
          }),
        });
        if (fbResponse.ok) {
          const fbJson = await fbResponse.json();
          const choice = fbJson.choices?.[0];
          const fbMsg = choice?.message;
          assistantReply = fbMsg?.content?.trim() || fbMsg?.reasoning_content?.trim() || "";
          if (choice?.finish_reason === "length") {
            assistantReply += "\n\n*(Note: This response reached the maximum output length. You can ask me to continue or elaborate further on any section.)*";
          }
        } else {
          throw new Error(`NVIDIA Chat API failed: ${errorText}`);
        }
      } else {
        const json = await response.json();
        const choice = json.choices?.[0];
        const msg = choice?.message;
        assistantReply = msg?.content?.trim() || msg?.reasoning_content?.trim() || "";
        if (choice?.finish_reason === "length") {
          assistantReply += "\n\n*(Note: This response reached the maximum output length. You can ask me to continue or elaborate further on any section.)*";
        }
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
      taggedPage: taggedPage,
      taggedPages: taggedPages,
      taggedResourceId: effectiveTaggedResourceId,
      taggedResourceTitle: citations[0]?.resourceTitle,
    });

    return {
      threadId,
      reply: assistantReply,
      citations: formattedCitations,
    };
  },
});
