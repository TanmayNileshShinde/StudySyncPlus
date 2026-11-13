"use node";

/**
 * Checkpointed RAG ingestion pipeline. Every resource created with a stored file
 * is scheduled here from `resources.create` (and from `resources.update` when
 * the file is replaced). The pipeline:
 *
 *   fetch stored bytes → extract text (PDF pages / PPT slides, provenance kept)
 *   → chunk with page/slide numbers → insert raw un-embedded chunks
 *   → schedule bounded batch embedding actions (<= 24 chunks per action)
 *   → apply 2048-dim NVIDIA embeddings via nvidia/nemotron-3.5-embed-1b
 *   → persist live chunkCount progress
 *   → finalize resource status to "ready" once all chunks are embedded
 *
 * Duplicate processing is prevented by comparing a SHA-256 fingerprint of the
 * stored bytes against the resource's `contentHash` when chunks already exist.
 * Monolithic timeout failures are eliminated by chunking embedding generation into
 * independent, checkpointed background actions that survive browser refreshes.
 */
// Import order is load-bearing: globals → worker wiring → pdfjs.
import "./pdfjsPolyfill";
import "./pdfjsWorkerSetup";
import { createHash } from "node:crypto";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { extractStoredFile } from "./extract";
import { callNvidiaEmbeddings, chunkPageText } from "./rag";

const CHUNK_BATCH_SIZE = 24;
const MAX_UNITS = 400; // safety valve against pathological documents

type IngestionOutcome =
  | { status: "ready" | "processing"; chunksIndexed: number; message: string }
  | { status: "failed"; message: string }
  | { status: "skipped"; message: string };

/**
 * Internal action: Checkpointed background job that processes a bounded batch
 * of document chunks (<= 24 chunks), generates 2048-dim embeddings via
 * nvidia/nemotron-3.5-embed-1b, updates the database, and schedules the next batch.
 */
export const embedBatchStep = internalAction({
  args: {
    resourceId: v.id("resources"),
    startSeq: v.number(),
    totalChunks: v.number(),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify resource is still active and in processing state
    const resource = await ctx.runQuery(internal.ragInternal.getResourceForIngestion, {
      resourceId: args.resourceId,
    });
    if (!resource || resource.ingestStatus !== "processing") {
      console.log(`[embedBatchStep] Resource ${args.resourceId} is no longer processing; skipping step.`);
      return;
    }

    try {
      // 2. Fetch the slice of chunks for this batch
      const chunks = await ctx.runQuery(internal.ragInternal.getChunksSlice, {
        resourceId: args.resourceId,
        startSeq: args.startSeq,
        limit: CHUNK_BATCH_SIZE,
      });

      if (chunks.length === 0) {
        // No more chunks: finalize ingestion
        await ctx.runMutation(internal.ragInternal.finalizeIngestion, {
          resourceId: args.resourceId,
          chunkCount: args.totalChunks,
          contentHash: args.contentHash,
        });
        return;
      }

      // 3. Generate 2048-dimensional embeddings via NVIDIA NIM API
      const texts = chunks.map((c) => c.text);
      const embeddings = await callNvidiaEmbeddings(texts, "passage");

      // 4. Persist progress atomically to database
      const progressCount = Math.min(args.startSeq + chunks.length, args.totalChunks);
      await ctx.runMutation(internal.ragInternal.applyChunkEmbeddings, {
        resourceId: args.resourceId,
        updates: chunks.map((chunk, idx) => ({
          id: chunk._id,
          embedding: embeddings[idx],
        })),
        progressCount,
      });

      // 5. Schedule next batch or finalize
      const nextSeq = args.startSeq + chunks.length;
      if (nextSeq < args.totalChunks) {
        await ctx.scheduler.runAfter(0, internal.ingest.embedBatchStep, {
          resourceId: args.resourceId,
          startSeq: nextSeq,
          totalChunks: args.totalChunks,
          contentHash: args.contentHash,
        });
      } else {
        await ctx.runMutation(internal.ragInternal.finalizeIngestion, {
          resourceId: args.resourceId,
          chunkCount: args.totalChunks,
          contentHash: args.contentHash,
        });
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[embedBatchStep] Error on resource ${args.resourceId} at seq ${args.startSeq}:`,
        message
      );
      await ctx.runMutation(internal.ragInternal.setIngestStatus, {
        resourceId: args.resourceId,
        ingestStatus: "failed",
        ingestError: message.slice(0, 300),
      });
    }
  },
});

/** Core pipeline: extracts text, stores raw chunks, and queues background batch embedding. */
async function runIngestion(
  ctx: ActionCtx,
  resourceId: Id<"resources">,
  force: boolean
): Promise<IngestionOutcome> {
  const resource = await ctx.runQuery(internal.ragInternal.getResourceForIngestion, { resourceId });
  if (!resource) {
    return { status: "failed", message: "Resource not found (it may have been deleted)." };
  }
  if (!resource.storageId) {
    return { status: "skipped", message: "Resource has no stored file to index." };
  }

  // Mark processing so the UI can show an honest "indexing…" state.
  await ctx.runMutation(internal.ragInternal.setIngestStatus, {
    resourceId,
    ingestStatus: "processing",
    ingestError: null,
  });

  try {
    // 1. Fetch the stored bytes through the signed URL.
    const storageUrl: string | null = await ctx.runQuery(internal.ingestInternal.getStorageUrl, { resourceId });
    if (!storageUrl) {
      await ctx.runMutation(internal.ragInternal.setIngestStatus, {
        resourceId,
        ingestStatus: "failed",
        ingestError: "The stored file could not be found in storage.",
      });
      return { status: "failed", message: "Stored file is missing." };
    }
    const response = await fetch(storageUrl);
    if (!response.ok) {
      throw new Error(`File fetch failed (HTTP ${response.status}).`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());

    // 2. Fingerprint the bytes — duplicate-processing guard.
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    if (!force && resource.contentHash === contentHash && (resource.chunkCount ?? 0) > 0) {
      await ctx.runMutation(internal.ragInternal.setIngestStatus, {
        resourceId,
        ingestStatus: "ready",
        ingestError: null,
        chunkCount: resource.chunkCount,
        contentHash,
      });
      return { status: "skipped", message: "Already indexed — identical file bytes." };
    }

    // 3. Extract provenance-bearing text units (PDF pages / PPT slides).
    const fileKind = resource.fileKind ?? "pdf";
    const units = await extractStoredFile(fileKind, bytes);
    if (units.length === 0) {
      await ctx.runMutation(internal.ragInternal.setIngestStatus, {
        resourceId,
        ingestStatus: "failed",
        ingestError: `No readable text could be extracted from this ${fileKind.toUpperCase()} file (it may be a scan without a text layer).`,
      });
      return { status: "failed", message: "No text extracted." };
    }
    const clippedUnits = units.slice(0, MAX_UNITS);

    // 4. Chunk with page/slide provenance.
    const allChunks: Array<{ seq: number; page: number; text: string }> = [];
    let seqCounter = 0;
    for (const unit of clippedUnits) {
      const unitChunks = chunkPageText(unit.text, unit.num, seqCounter);
      allChunks.push(...unitChunks);
      seqCounter += unitChunks.length;
    }
    if (allChunks.length === 0) {
      await ctx.runMutation(internal.ragInternal.setIngestStatus, {
        resourceId,
        ingestStatus: "failed",
        ingestError: "The document text was too short to index.",
      });
      return { status: "failed", message: "No indexable chunks." };
    }

    // 5. Clear stale chunks and insert raw un-embedded chunks
    await ctx.runMutation(internal.ragInternal.clearChunks, { resourceId });

    const RAW_INSERT_BATCH = 50;
    for (let i = 0; i < allChunks.length; i += RAW_INSERT_BATCH) {
      const slice = allChunks.slice(i, i + RAW_INSERT_BATCH);
      await ctx.runMutation(internal.ragInternal.insertRawChunks, {
        chunks: slice.map((c) => ({
          resourceId,
          semesterId: resource.semesterId,
          subjectId: resource.subjectId,
          seq: c.seq,
          page: c.page,
          text: c.text,
        })),
      });
    }

    // 6. Schedule checkpointed background embedding batches
    await ctx.scheduler.runAfter(0, internal.ingest.embedBatchStep, {
      resourceId,
      startSeq: 0,
      totalChunks: allChunks.length,
      contentHash,
    });

    const kindLabel = fileKind === "pdf" ? "pages" : "slides";
    return {
      status: "processing",
      chunksIndexed: allChunks.length,
      message: `Extracted ${clippedUnits.length} ${kindLabel} into ${allChunks.length} chunks. Background embedding queued.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error.";
    await ctx.runMutation(internal.ragInternal.setIngestStatus, {
      resourceId,
      ingestStatus: "failed",
      ingestError: message.slice(0, 300),
    });
    return { status: "failed", message };
  }
}

/**
 * Internal action — the automatic pipeline target scheduled from
 * `resources.create` / `resources.update`.
 */
export const ingestResourceFile = action({
  args: {
    resourceId: v.id("resources"),
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    status: v.string(),
    chunksIndexed: v.optional(v.number()),
    message: v.string(),
  }),
  handler: async (ctx, args): Promise<{ status: string; chunksIndexed?: number; message: string }> => {
    const outcome = await runIngestion(ctx, args.resourceId, args.force ?? false);
    return {
      status: outcome.status,
      chunksIndexed: outcome.status === "ready" || outcome.status === "processing" ? outcome.chunksIndexed : undefined,
      message: outcome.message,
    };
  },
});

/**
 * Public action — manual re-index (retry after failure, or refresh after the
 * document changed outside the replace-file flow). Idempotent when the file
 * bytes are unchanged unless `force` is set.
 */
export const reindexResource = action({
  args: {
    resourceId: v.id("resources"),
    force: v.optional(v.boolean()),
  },
  returns: v.object({ status: v.string(), message: v.string() }),
  handler: async (ctx, args): Promise<{ status: string; message: string }> => {
    const outcome = await runIngestion(ctx, args.resourceId, args.force ?? true);
    return { status: outcome.status, message: outcome.message };
  },
});

/** Maintenance: one-shot repair pass used by the ops scripts (idempotent). */
export const backfillPipelineState = action({
  args: {},
  returns: v.object({
    repaired: v.number(),
    indexed: v.number(),
    skipped: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx): Promise<{ repaired: number; indexed: number; skipped: number; failed: number }> => {
    const stale: Array<{ id: Id<"resources"> }> = await ctx.runQuery(
      internal.ingestInternal.listMissingPipelineState,
      {}
    );
    let indexed = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of stale) {
      const outcome = await runIngestion(ctx, row.id, false);
      if (outcome.status === "ready" || outcome.status === "processing") indexed += 1;
      else if (outcome.status === "skipped") skipped += 1;
      else failed += 1;
    }
    return { repaired: stale.length, indexed, skipped, failed };
  },
});

/**
 * Public action: Re-index all catalogued resources with stored files into the new
 * vector model (nvidia/nemotron-3.5-embed-1b, 2048 dims).
 */
export const reindexAllStoredResources = action({
  args: {
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    total: v.number(),
    ready: v.number(),
    failed: v.number(),
    skipped: v.number(),
    details: v.array(
      v.object({
        resourceId: v.id("resources"),
        title: v.string(),
        status: v.string(),
        chunksIndexed: v.optional(v.number()),
        message: v.string(),
      })
    ),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    total: number;
    ready: number;
    failed: number;
    skipped: number;
    details: Array<{
      resourceId: Id<"resources">;
      title: string;
      status: string;
      chunksIndexed?: number;
      message: string;
    }>;
  }> => {
    const list: Array<{ id: Id<"resources">; title: string }> = await ctx.runQuery(
      internal.ingestInternal.listAllStoredResources,
      {}
    );
    const force = args.force ?? true;
    let ready = 0;
    let failed = 0;
    let skipped = 0;
    const details = [];

    for (const item of list) {
      const outcome = await runIngestion(ctx, item.id, force);
      if (outcome.status === "ready" || outcome.status === "processing") {
        ready++;
        details.push({
          resourceId: item.id,
          title: item.title,
          status: outcome.status,
          chunksIndexed: outcome.chunksIndexed,
          message: outcome.message,
        });
      } else if (outcome.status === "skipped") {
        skipped++;
        details.push({
          resourceId: item.id,
          title: item.title,
          status: "skipped",
          message: outcome.message,
        });
      } else {
        failed++;
        details.push({
          resourceId: item.id,
          title: item.title,
          status: "failed",
          message: outcome.message,
        });
      }
    }

    return { total: list.length, ready, failed, skipped, details };
  },
});
