import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { IngestStatus } from "./validators";

/** Fetch resource details needed for ingestion and citations. */
export const getResourceForIngestion = internalQuery({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) return null;
    return {
      _id: resource._id,
      storageId: resource.storageId,
      semesterId: resource.semesterId,
      subjectId: resource.subjectId,
      title: resource.title,
      courseCode: resource.courseCode,
      subjectName: resource.subjectName,
      fileName: resource.fileName,
      fileKind: resource.fileKind,
      ingestStatus: resource.ingestStatus,
      contentHash: resource.contentHash,
      chunkCount: resource.chunkCount,
    };
  },
});

/** Record pipeline progress on the resource document. `null` clears a field. */
export const setIngestStatus = internalMutation({
  args: {
    resourceId: v.id("resources"),
    ingestStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed")
    ),
    ingestError: v.optional(v.union(v.string(), v.null())),
    chunkCount: v.optional(v.number()),
    contentHash: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: {
      ingestStatus: IngestStatus;
      ingestError?: string;
      ingestedAt?: number;
      chunkCount?: number;
      contentHash?: string;
    } = { ingestStatus: args.ingestStatus };

    // `undefined` deletes the optional field (null means "clear" here).
    patch.ingestError = args.ingestError ?? undefined;

    if (args.ingestStatus === "ready") {
      patch.ingestedAt = Date.now();
      if (args.chunkCount !== undefined) patch.chunkCount = args.chunkCount;
      if (args.contentHash !== undefined && args.contentHash !== null) patch.contentHash = args.contentHash;
    }
    if (args.ingestStatus === "failed") {
      // Nothing indexable survived: reset so the next run reprocesses.
      patch.chunkCount = 0;
      patch.contentHash = undefined;
    }

    await ctx.db.patch(args.resourceId, patch);
    return null;
  },
});

/** Check existing chunk count for duplicate processing detection. */
export const getExistingChunksCount = internalQuery({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.resourceId))
      .take(1000);
    return chunks.length;
  },
});

/** Clear existing chunks for a resource (for clean re-indexing). */
export const clearChunks = internalMutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    let deleted = 0;
    for await (const chunk of ctx.db
      .query("documentChunks")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.resourceId))) {
      await ctx.db.delete(chunk._id);
      deleted++;
    }
    return deleted;
  },
});

/** Insert a batch of document chunks with embeddings. */
export const saveChunkBatch = internalMutation({
  args: {
    chunks: v.array(
      v.object({
        resourceId: v.id("resources"),
        semesterId: v.optional(v.id("semesters")),
        subjectId: v.optional(v.id("subjects")),
        seq: v.number(),
        text: v.string(),
        page: v.optional(v.number()),
        embedding: v.array(v.float64()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids: Id<"documentChunks">[] = [];
    for (const chunk of args.chunks) {
      const id = await ctx.db.insert("documentChunks", chunk);
      ids.push(id);
    }
    return ids.length;
  },
});

/** Hydrate raw vectorSearch hits with document content and resource metadata. */
export const hydrateChunkResults = internalQuery({
  args: {
    hits: v.array(
      v.object({
        id: v.id("documentChunks"),
        score: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const hydrated: Array<{
      chunkId: Id<"documentChunks">;
      resourceId: Id<"resources">;
      resourceTitle: string;
      courseCode: string;
      fileKind: "pdf" | "ppt" | "pptx" | null;
      page?: number;
      text: string;
      score: number;
    }> = [];

    // Cache resource lookups to prevent redundant queries
    const resourceCache = new Map<
      string,
      { title: string; courseCode: string; fileKind: "pdf" | "ppt" | "pptx" | null; ready: boolean }
    >();

    for (const hit of args.hits) {
      const chunk = await ctx.db.get(hit.id);
      if (!chunk) continue;

      let meta = resourceCache.get(chunk.resourceId);
      if (!meta) {
        const res = await ctx.db.get(chunk.resourceId);
        meta = {
          title: res?.title ?? "Unknown Document",
          courseCode: res?.courseCode ?? "Course",
          fileKind: res?.fileKind ?? null,
          ready: res?.ingestStatus === "ready",
        };
        resourceCache.set(chunk.resourceId, meta);
      }

      // Safety rule: Only retrieve from successfully indexed documents
      if (!meta.ready) continue;

      hydrated.push({
        chunkId: chunk._id,
        resourceId: chunk.resourceId,
        resourceTitle: meta.title,
        courseCode: meta.courseCode,
        fileKind: meta.fileKind,
        page: chunk.page,
        text: chunk.text,
        score: hit.score,
      });
    }

    return hydrated;
  },
});

/** Return resource IDs belonging to a specific folder (for folder-scoped RAG). */
export const getResourcesInFolder = internalQuery({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) return { subjectId: null, resourceIds: [] as Id<"resources">[] };
    const rows = await ctx.db
      .query("resources")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
    return {
      subjectId: folder.subjectId,
      resourceIds: rows.map((r) => r._id),
    };
  },
});

/** Register or update the official DSA MSE Study Guide and remap legacy chunk IDs. */
export const registerMseResource = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // 1. Check if resource already exists
    const existing = await ctx.db
      .query("resources")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Data Structures — MSE Master Study Guide (Module 1 & 2)"),
          q.eq(q.field("fileName"), "DSA_MSE_Master_Study_Guide.pdf")
        )
      )
      .first();

    let resId: Id<"resources">;
    if (existing) {
      resId = existing._id;
      await ctx.db.patch(resId, {
        storageId: args.storageId,
        fileName: "DSA_MSE_Master_Study_Guide.pdf",
        title: "Data Structures — MSE Master Study Guide (Module 1 & 2)",
      });
    } else {
      const semester = await ctx.db.query("semesters").first();
      const subject = await ctx.db
        .query("subjects")
        .filter((q) => q.eq(q.field("name"), "Data Structures"))
        .first();

      if (!semester || !subject) {
        throw new Error("Semester or subject not found");
      }

      resId = await ctx.db.insert("resources", {
        semesterId: semester._id,
        subjectId: subject._id,
        subjectName: "Data Structures",
        courseCode: "CMCOR2PC203",
        title: "Data Structures — MSE Master Study Guide (Module 1 & 2)",
        type: "Lecture Notes",
        uploadedBy: "Aditya Shah",
        rollNumber: "68",
        uploadDate: new Date().toISOString().split("T")[0],
        fileSizeBytes: 2516582,
        storageId: args.storageId,
        fileName: "DSA_MSE_Master_Study_Guide.pdf",
        downloadCount: 42,
        ratingSum: 5,
        ratingCount: 1,
        description: "Official SAKEC Mid-Semester Exam Master Study Guide covering Module 1 and 2: Stacks, Queues, Linked Lists, Trees, Expression Evaluation, and Algorithms.",
        tags: ["data-structures", "mse", "stacks", "queues", "linked-lists", "trees", "module-1-2"],
        isOfficial: true,
      });
    }

    // 2. Remap legacy chunk IDs if any exist under the temporary ID
    let remapped = 0;
    const legacyId = "jh769gfcgfskr778rmwz86ctrx8j31tr" as Id<"resources">;
    const oldChunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_resource", (q) => q.eq("resourceId", legacyId))
      .collect();

    for (const chunk of oldChunks) {
      await ctx.db.patch(chunk._id, { resourceId: resId });
      remapped++;
    }

    return { resourceId: resId, remappedChunks: remapped };
  },
});
