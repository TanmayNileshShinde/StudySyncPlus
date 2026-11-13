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
