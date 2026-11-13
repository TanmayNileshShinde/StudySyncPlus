"use node";

/**
 * Automatic RAG ingestion pipeline. Every resource created with a stored file
 * is scheduled here from `resources.create` (and from `resources.update` when
 * the file is replaced). The pipeline:
 *
 *   fetch stored bytes → extract text (PDF pages / PPT slides, provenance kept)
 *   → chunk with page/slide numbers → NVIDIA embeddings in batches
 *   → persist documentChunks with semester + subject filters
 *   → mark the resource ready / failed with a chunk count
 *
 * Duplicate processing is prevented by comparing a SHA-256 fingerprint of the
 * stored bytes against the resource's `contentHash` when chunks already exist.
 */
// Import order is load-bearing: globals → worker wiring → pdfjs.
import "./pdfjsPolyfill";
import "./pdfjsWorkerSetup";
import { createHash } from "node:crypto";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { extractStoredFile } from "./extract";
import { callNvidiaEmbeddings, chunkPageText } from "./rag";

const EMBED_BATCH_SIZE = 24;
const MAX_UNITS = 400; // safety valve against pathological documents

type IngestionOutcome =
  | { status: "ready"; chunksIndexed: number; message: string }
  | { status: "failed"; message: string }
  | { status: "skipped"; message: string };

/** Core pipeline, shared by the scheduled auto-run and the public re-index action. */
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

    // 5. Rebuild the index: clear stale chunks, embed, persist with filters.
    await ctx.runMutation(internal.ragInternal.clearChunks, { resourceId });

    let savedTotal = 0;
    for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
      const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await callNvidiaEmbeddings(
        batch.map((c) => c.text),
        "passage"
      );
      await ctx.runMutation(internal.ragInternal.saveChunkBatch, {
        chunks: batch.map((chunk, idx) => ({
          resourceId,
          semesterId: resource.semesterId,
          subjectId: resource.subjectId,
          seq: chunk.seq,
          page: chunk.page,
          text: chunk.text,
          embedding: embeddings[idx],
        })),
      });
      savedTotal += batch.length;
    }

    const kindLabel = fileKind === "pdf" ? "pages" : "slides";
    await ctx.runMutation(internal.ragInternal.setIngestStatus, {
      resourceId,
      ingestStatus: "ready",
      ingestError: null,
      chunkCount: savedTotal,
      contentHash,
    });
    return {
      status: "ready",
      chunksIndexed: savedTotal,
      message: `Indexed ${clippedUnits.length} ${kindLabel} into ${savedTotal} vector chunks for "${resource.title}".`,
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
      chunksIndexed: outcome.status === "ready" ? outcome.chunksIndexed : undefined,
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
      if (outcome.status === "ready") indexed += 1;
      else if (outcome.status === "skipped") skipped += 1;
      else failed += 1;
    }
    return { repaired: stale.length, indexed, skipped, failed };
  },
});
