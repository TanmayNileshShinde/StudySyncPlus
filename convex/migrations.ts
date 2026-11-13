import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Public entry points for the one-shot maintenance migrations. They simply
 * forward to the internal implementations and are safe to re-run (both are
 * idempotent).
 */

/** Stamp legacy vector chunks with their resource's subjectId. */
export const runChunkSubjectBackfill = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    return await ctx.runMutation(internal.ingestInternal.backfillChunkSubjects, {});
  },
});

/** Give stored-file resources that already have chunks an honest "ready" state. */
export const runMarkReadyFromChunks = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    return await ctx.runMutation(internal.ingestInternal.markReadyFromExistingChunks, {});
  },
});

/** Ensure all stored resources have valid schema fields. */
export const repairResourceFields = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    let patched = 0;
    for await (const doc of ctx.db.query("resources")) {
      const patch: Record<string, unknown> = {};
      if (doc.courseCode === undefined || doc.courseCode === null) {
        const subj = await ctx.db.get(doc.subjectId);
        patch.courseCode = subj?.courseCode ?? "CMCOR2PC203";
      }
      if (doc.description === undefined || doc.description === null) {
        patch.description = doc.title || "Academic resource material.";
      }
      if (doc.downloadCount === undefined || doc.downloadCount === null) {
        patch.downloadCount = 0;
      }
      if (doc.fileSizeBytes === undefined || doc.fileSizeBytes === null) {
        patch.fileSizeBytes = 1024 * 1024;
      }
      if (doc.ratingSum === undefined || doc.ratingSum === null) {
        patch.ratingSum = 0;
      }
      if (doc.ratingCount === undefined || doc.ratingCount === null) {
        patch.ratingCount = 0;
      }
      if (doc.tags === undefined || !Array.isArray(doc.tags)) {
        patch.tags = [];
      }
      if (doc.fileKind === undefined) {
        const lowerName = (doc.fileName || "").toLowerCase();
        patch.fileKind = lowerName.endsWith(".pptx") ? "pptx" : lowerName.endsWith(".ppt") ? "ppt" : "pdf";
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(doc._id, patch);
        patched++;
      }
    }
    return patched;
  },
});

/** Reset all document chunks before vector dimension upgrade to prevent index conflict. */
export const resetAllChunksForEmbeddingUpgrade = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    return await ctx.runMutation(internal.ingestInternal.clearAllDocumentChunks, {});
  },
});
