import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/** Signed URL of a resource's stored file, read from the mutation side. */
export const getStorageUrl = internalQuery({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || !resource.storageId) return null;
    return await ctx.storage.getUrl(resource.storageId);
  },
});

/**
 * Resources with a stored file that still lack pipeline state (or are pending
 * without chunks) — the repair target for the one-shot backfill.
 */
export const listMissingPipelineState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const out: Array<{ id: Id<"resources"> }> = [];
    for await (const resource of ctx.db.query("resources")) {
      if (!resource.storageId) continue;
      if (resource.ingestStatus === undefined) {
        out.push({ id: resource._id });
        continue;
      }
      if (resource.ingestStatus === "pending" || resource.ingestStatus === "failed") {
        // Only reprocess when no chunks exist yet — "ready" rows are done.
        const chunks = await ctx.db
          .query("documentChunks")
          .withIndex("by_resource", (q) => q.eq("resourceId", resource._id))
          .take(1);
        if (chunks.length === 0) out.push({ id: resource._id });
      }
    }
    return out;
  },
});

/**
 * One-time migration: stamp existing chunks with their resource's subjectId so
 * subject-scoped vector search sees documents indexed before the field existed.
 * Idempotent — chunks with a subjectId are skipped.
 */
export const backfillChunkSubjects = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0;
    const resourceCache = new Map<string, Id<"subjects"> | null>();
    for await (const chunk of ctx.db.query("documentChunks")) {
      if (chunk.subjectId) continue;
      let subjectId = resourceCache.get(chunk.resourceId);
      if (subjectId === undefined) {
        const resource = await ctx.db.get(chunk.resourceId);
        subjectId = resource?.subjectId ?? null;
        resourceCache.set(chunk.resourceId, subjectId);
      }
      if (subjectId) {
        await ctx.db.patch(chunk._id, { subjectId });
        patched += 1;
      }
    }
    return patched;
  },
});

/**
 * One-time migration: give stored-file resources that already have chunks
 * (indexed before pipeline state existed) an honest "ready" status.
 */
export const markReadyFromExistingChunks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let marked = 0;
    for await (const resource of ctx.db.query("resources")) {
      if (!resource.storageId || resource.ingestStatus !== undefined) continue;
      const chunks = await ctx.db
        .query("documentChunks")
        .withIndex("by_resource", (q) => q.eq("resourceId", resource._id))
        .take(10000);
      if (chunks.length > 0) {
        await ctx.db.patch(resource._id, {
          ingestStatus: "ready",
          chunkCount: chunks.length,
          ingestedAt: Date.now(),
        });
        marked += 1;
      } else {
        await ctx.db.patch(resource._id, { ingestStatus: "pending" });
        marked += 1;
      }
    }
    return marked;
  },
});

/** Return all catalogued resources with stored files (for full re-indexing). */
export const listAllStoredResources = internalQuery({
  args: {},
  handler: async (ctx) => {
    const out: Array<{
      id: Id<"resources">;
      title: string;
      courseCode: string;
      ingestStatus?: string;
      chunkCount?: number;
    }> = [];
    for await (const resource of ctx.db.query("resources")) {
      if (resource.storageId) {
        out.push({
          id: resource._id,
          title: resource.title,
          courseCode: resource.courseCode,
          ingestStatus: resource.ingestStatus,
          chunkCount: resource.chunkCount,
        });
      }
    }
    return out;
  },
});

/** Clear all chunks across all resources (used when migrating vector index dimensions). */
export const clearAllDocumentChunks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let count = 0;
    for await (const chunk of ctx.db.query("documentChunks")) {
      await ctx.db.delete(chunk._id);
      count++;
    }
    return count;
  },
});
