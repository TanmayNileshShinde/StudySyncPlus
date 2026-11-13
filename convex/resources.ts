import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_BYTES,
  fileKindLabel,
  formatFileSize,
  resolveFileKind,
  resourceViewValidator,
  resourceTypeValidator,
  sanitizeFileName,
  type FileKind,
  type IngestStatus,
  type ResourceView,
} from "./validators";

/** Map a stored resource document to the client-facing view with defensive fallbacks. */
function toView(
  doc: {
    _id: unknown;
    subjectId: unknown;
    subjectName?: string;
    courseCode?: string;
    title: string;
    type: ResourceView["type"];
    uploadedBy?: string;
    rollNumber?: string;
    uploadDate?: string;
    fileSizeBytes?: number;
    storageId?: string;
    fileName?: string;
    fileKind?: FileKind;
    downloadCount?: number;
    ratingSum?: number;
    ratingCount?: number;
    description?: string;
    tags?: string[];
    ownerKey?: string;
    isOfficial?: boolean;
    ingestStatus?: ResourceView["ingestStatus"];
    ingestError?: string;
    ingestedAt?: number;
    chunkCount?: number;
    folderId?: Id<"folders">;
  },
  semesterNumber: number,
): ResourceView {
  const fileKind = doc.fileKind ?? null;
  const fileSizeBytes = typeof doc.fileSizeBytes === "number" && !isNaN(doc.fileSizeBytes) ? doc.fileSizeBytes : 0;
  const ratingCount = typeof doc.ratingCount === "number" && !isNaN(doc.ratingCount) ? doc.ratingCount : 0;
  const ratingSum = typeof doc.ratingSum === "number" && !isNaN(doc.ratingSum) ? doc.ratingSum : 0;
  const downloadCount = typeof doc.downloadCount === "number" && !isNaN(doc.downloadCount) ? doc.downloadCount : 0;

  return {
    id: doc._id as ResourceView["id"],
    subjectId: doc.subjectId as ResourceView["subjectId"],
    subjectName: doc.subjectName || "Course Resource",
    courseCode: doc.courseCode || "CMCOR2PC203",
    title: doc.title,
    semester: semesterNumber,
    type: doc.type,
    uploadedBy: doc.uploadedBy || "Faculty / Contributor",
    rollNumber: doc.rollNumber || "N/A",
    uploadDate: doc.uploadDate || new Date().toISOString().slice(0, 10),
    fileSize: formatFileSize(fileSizeBytes),
    fileSizeBytes,
    downloadCount,
    rating: ratingCount > 0 ? ratingSum / ratingCount : 0,
    ratingCount,
    fileFormat: fileKindLabel(fileKind ?? undefined),
    fileKind,
    description: doc.description || "Course study material.",
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    isUserUploaded: !doc.isOfficial,
    ownerKey: doc.ownerKey ?? null,
    hasFile: doc.storageId !== undefined,
    fileName: doc.fileName ?? null,
    ingestStatus: doc.ingestStatus ?? null,
    ingestError: doc.ingestError ?? null,
    ingestedAt: doc.ingestedAt ?? null,
    chunkCount: doc.chunkCount ?? null,
    folderId: (doc.folderId as Id<"folders">) ?? null,
  };
}

/** All resources of one semester (library source of truth). */
export const list = query({
  args: { semesterId: v.id("semesters") },
  returns: v.array(resourceViewValidator),
  handler: async (ctx, args) => {
    const semester = await ctx.db.get(args.semesterId);
    if (!semester) return [];

    const docs = await ctx.db
      .query("resources")
      .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId))
      .order("desc")
      .take(500);

    return docs.map((doc) => toView(doc, semester.number));
  },
});

/** All resources of one subject, newest first — the subject workspace listing. */
export const listBySubject = query({
  args: { subjectId: v.id("subjects") },
  returns: v.array(resourceViewValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("resources")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .order("desc")
      .take(500);
    const semesterCache = new Map<Id<"semesters">, number>();
    const views: ResourceView[] = [];
    for (const doc of rows) {
      let semesterNumber = semesterCache.get(doc.semesterId);
      if (semesterNumber === undefined) {
        const semester = await ctx.db.get(doc.semesterId);
        if (!semester) continue;
        semesterNumber = semester.number;
        semesterCache.set(doc.semesterId, semesterNumber);
      }
      views.push(toView(doc, semesterNumber));
    }
    return views;
  },
});

/** Signed URL + display filename for embedded preview, or null for legacy rows. */
export const fileUrl = query({
  args: { id: v.id("resources") },
  returns: v.union(v.object({ url: v.string(), fileName: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource || !resource.storageId) return null;
    const url = await ctx.storage.getUrl(resource.storageId);
    if (!url) return null;
    const ext = resource.fileKind === "pptx" ? "pptx" : resource.fileKind === "ppt" ? "ppt" : "pdf";
    return { url, fileName: resource.fileName ?? `${resource.title}.${ext}` };
  },
});

/** Return indexed document chunks (used for slide deck outline and slide viewer). */
export const getChunks = query({
  args: { id: v.id("resources") },
  returns: v.array(
    v.object({
      seq: v.number(),
      page: v.union(v.number(), v.null()),
      text: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.id))
      .collect();
    return chunks.map((c) => ({
      seq: c.seq,
      page: c.page ?? null,
      text: c.text,
    }));
  },
});

/** Step 1 of the upload pipeline: a short-lived direct-to-storage POST URL. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Shared validation for a freshly uploaded storage file (PDF or PowerPoint). */
async function assertValidStoredFile(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  fileName: string
): Promise<{ size: number; fileKind: FileKind }> {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta) throw new ConvexError("The uploaded file could not be found. Please try uploading again.");
  const contentType = meta.contentType ?? "";
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new ConvexError("Only PDF and PPT/PPTX files can be catalogued.");
  }
  if (meta.size <= 0) throw new ConvexError("The selected file appears to be empty.");
  if (meta.size > MAX_FILE_BYTES) throw new ConvexError("Maximum allowed file size is 50 MB.");
  return { size: meta.size, fileKind: resolveFileKind(contentType, fileName) };
}

/** Shared metadata checks (parity with the client-side form validation). */
function assertValidMetadata(title: string, description: string, uploadedBy: string, rollNumber: string): void {
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 6) throw new ConvexError("Title must be at least 6 characters long.");
  if (trimmedTitle.length > 95) throw new ConvexError("Title must not exceed 95 characters.");
  if (description.trim().length < 15) throw new ConvexError("Description should be at least 15 characters.");
  if (uploadedBy.trim().length < 3) throw new ConvexError("Please provide an author name (at least 3 characters).");
  if (!/^[0-9a-zA-Z]{2,15}$/.test(rollNumber.trim())) {
    throw new ConvexError("Invalid roll number format (e.g. 126BTCM2008 or 67).");
  }
}

/**
 * Queue the automatic RAG pipeline for a resource with a stored file. The
 * scheduled action extracts text (PDF pages / PPTX slides), generates
 * embeddings, and indexes the chunks — so every upload enters processing
 * without any client-side step.
 */
function scheduleIngestion(ctx: MutationCtx, resourceId: Id<"resources">): void {
  void ctx.scheduler.runAfter(0, api.ingest.ingestResourceFile, { resourceId });
}

/** Step 2 of the upload pipeline: publish metadata for an uploaded file. */
export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    semesterId: v.id("semesters"),
    subjectId: v.id("subjects"),
    title: v.string(),
    type: resourceTypeValidator,
    uploadedBy: v.string(),
    rollNumber: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    ownerKey: v.string(),
    fileName: v.string(),
    folderId: v.optional(v.id("folders")),
  },
  returns: v.id("resources"),
  handler: async (ctx, args) => {
    const { size, fileKind } = await assertValidStoredFile(ctx, args.storageId, args.fileName);
    assertValidMetadata(args.title, args.description, args.uploadedBy, args.rollNumber);

    const subject = await ctx.db.get(args.subjectId);
    if (!subject) throw new ConvexError("Selected course does not exist.");
    if (subject.isArchived) throw new ConvexError("This course is archived and cannot accept uploads.");
    if (subject.semesterId !== args.semesterId) {
      throw new ConvexError("Selected course does not belong to the active semester.");
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.subjectId !== args.subjectId) {
        throw new ConvexError("Selected folder does not belong to this subject.");
      }
    }

    const tags = args.tags
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 20);

    const resourceId = await ctx.db.insert("resources", {
      semesterId: args.semesterId,
      subjectId: args.subjectId,
      subjectName: subject.name,
      courseCode: subject.courseCode,
      title: args.title.trim(),
      type: args.type,
      uploadedBy: args.uploadedBy.trim(),
      rollNumber: args.rollNumber.trim().toUpperCase(),
      uploadDate: new Date().toISOString().slice(0, 10),
      fileSizeBytes: size,
      storageId: args.storageId,
      fileName: sanitizeFileName(args.fileName),
      fileKind,
      downloadCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      description: args.description.trim(),
      tags,
      ownerKey: args.ownerKey,
      isOfficial: false,
      ingestStatus: "pending",
      folderId: args.folderId,
    });

    scheduleIngestion(ctx, resourceId);
    return resourceId;
  },
});

/**
 * Edit a resource. Only the uploading owner may edit official-locked rows are
 * refused outright. Changing the subject re-pairs the course code; providing
 * `replaceStorageId` swaps the stored PDF (old file is deleted).
 */
export const update = mutation({
  args: {
    id: v.id("resources"),
    ownerKey: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(resourceTypeValidator),
    subjectId: v.optional(v.id("subjects")),
    tags: v.optional(v.array(v.string())),
    uploadedBy: v.optional(v.string()),
    rollNumber: v.optional(v.string()),
    replaceStorageId: v.optional(v.id("_storage")),
    replaceFileName: v.optional(v.string()),
    folderId: v.optional(v.union(v.id("folders"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource) throw new ConvexError("Resource not found.");
    if (resource.isOfficial || resource.ownerKey === undefined) {
      throw new ConvexError("Official syllabus resources cannot be edited.");
    }
    if (resource.ownerKey !== args.ownerKey) {
      throw new ConvexError("Only the original uploader can edit this resource.");
    }

    const patch: Partial<{
      title: string;
      description: string;
      type: ResourceView["type"];
      subjectId: Id<"subjects">;
      subjectName: string;
      courseCode: string;
      tags: string[];
      uploadedBy: string;
      rollNumber: string;
      storageId: Id<"_storage">;
      fileName: string;
      fileKind: FileKind;
      fileSizeBytes: number;
      ingestStatus: IngestStatus;
      ingestError: string | undefined;
      contentHash: string | undefined;
      chunkCount: number | undefined;
      folderId: Id<"folders"> | undefined;
    }> = {};

    if (args.title !== undefined) {
      const title = args.title.trim();
      if (title.length < 6) throw new ConvexError("Title must be at least 6 characters long.");
      if (title.length > 95) throw new ConvexError("Title must not exceed 95 characters.");
      patch.title = title;
    }
    if (args.description !== undefined) {
      if (args.description.trim().length < 15) throw new ConvexError("Description should be at least 15 characters.");
      patch.description = args.description.trim();
    }
    if (args.type !== undefined) patch.type = args.type;
    if (args.uploadedBy !== undefined) {
      if (args.uploadedBy.trim().length < 3) throw new ConvexError("Please provide an author name (at least 3 characters).");
      patch.uploadedBy = args.uploadedBy.trim();
    }
    if (args.rollNumber !== undefined) {
      if (!/^[0-9a-zA-Z]{2,15}$/.test(args.rollNumber.trim())) {
        throw new ConvexError("Invalid roll number format (e.g. 126BTCM2008 or 67).");
      }
      patch.rollNumber = args.rollNumber.trim().toUpperCase();
    }
    if (args.tags !== undefined) {
      patch.tags = args.tags
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 20);
    }

    if (args.subjectId !== undefined) {
      const subject = await ctx.db.get(args.subjectId);
      if (!subject) throw new ConvexError("Selected course does not exist.");
      if (subject.isArchived) throw new ConvexError("This course is archived.");
      if (subject.semesterId !== resource.semesterId) {
        throw new ConvexError("Selected course does not belong to this resource's semester.");
      }
      patch.subjectId = args.subjectId;
      patch.subjectName = subject.name;
      patch.courseCode = subject.courseCode;
    }

    if (args.folderId !== undefined) {
      if (args.folderId !== null) {
        const folder = await ctx.db.get(args.folderId);
        if (!folder || folder.subjectId !== resource.subjectId) {
          throw new ConvexError("Target folder does not belong to this subject.");
        }
      }
      patch.folderId = args.folderId === null ? undefined : args.folderId;
    }

    if (args.replaceStorageId !== undefined) {
      const { size, fileKind } = await assertValidStoredFile(ctx, args.replaceStorageId, args.replaceFileName ?? "document.pdf");
      patch.storageId = args.replaceStorageId;
      patch.fileName = sanitizeFileName(args.replaceFileName ?? "document.pdf");
      patch.fileSizeBytes = size;
      patch.fileKind = fileKind;
      // The stored bytes changed: the old index is stale and must be rebuilt.
      patch.ingestStatus = "pending";
      patch.ingestError = undefined;
      patch.contentHash = undefined;
      patch.chunkCount = undefined;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch);
    }

    // Swap complete: remove the superseded file so storage stays clean.
    if (args.replaceStorageId !== undefined && resource.storageId && resource.storageId !== args.replaceStorageId) {
      try {
        await ctx.storage.delete(resource.storageId);
      } catch {
        // Old file may already be gone — not fatal to the edit.
      }
    }

    // Replaced file: rebuild the vector index for the new content.
    if (args.replaceStorageId !== undefined) {
      scheduleIngestion(ctx, args.id);
    }

    return null;
  },
});

/** Delete a resource (owner only) and cascade bookmarks, ratings and the file. */
export const remove = mutation({
  args: { id: v.id("resources"), ownerKey: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource) return null;
    if (resource.isOfficial || resource.ownerKey === undefined) {
      throw new ConvexError("Official syllabus resources cannot be deleted.");
    }
    if (resource.ownerKey !== args.ownerKey) {
      throw new ConvexError("Only the original uploader can delete this resource.");
    }

    for await (const bookmark of ctx.db
      .query("bookmarks")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.id))) {
      await ctx.db.delete(bookmark._id);
    }
    for await (const rating of ctx.db
      .query("ratings")
      .withIndex("by_resource_and_owner", (q) => q.eq("resourceId", args.id))) {
      await ctx.db.delete(rating._id);
    }
    // Cascade: the vector index must not outlive its document.
    for await (const chunk of ctx.db
      .query("documentChunks")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.id))) {
      await ctx.db.delete(chunk._id);
    }

    if (resource.storageId) {
      try {
        await ctx.storage.delete(resource.storageId);
      } catch {
        // File may already be gone — the record delete is what matters.
      }
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

/**
 * Register a download: increments the counter and returns the signed URL for
 * stored PDFs (null for legacy rows, which keep their client-side summary-card
 * fallback). One call keeps the counter and the artifact in sync.
 */
export const download = mutation({
  args: { id: v.id("resources") },
  returns: v.union(v.object({ url: v.string(), fileName: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource) throw new ConvexError("Resource not found.");

    await ctx.db.patch(args.id, { downloadCount: resource.downloadCount + 1 });

    if (!resource.storageId) return null;
    const url = await ctx.storage.getUrl(resource.storageId);
    if (!url) return null;
    const ext = resource.fileKind === "pptx" ? "pptx" : resource.fileKind === "ppt" ? "ppt" : "pdf";
    return { url, fileName: resource.fileName ?? `${resource.title}.${ext}` };
  },
});

/**
 * Move a resource to a folder (or to Unorganized root when folderId is null).
 * Single identity preserved: no re-upload, no re-embedding, zero chunk duplication.
 */
export const moveToFolder = mutation({
  args: {
    id: v.id("resources"),
    folderId: v.union(v.id("folders"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource) throw new ConvexError("Resource not found.");

    if (args.folderId !== null) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) throw new ConvexError("Target folder not found.");
      if (folder.subjectId !== resource.subjectId) {
        throw new ConvexError("Cannot move resource to a folder of another course.");
      }
    }

    await ctx.db.patch(args.id, {
      folderId: args.folderId === null ? undefined : args.folderId,
    });
    return null;
  },
});

/**
 * Bulk move multiple resources to a folder (or Unorganized root).
 * Preserves document identity, embeddings, and storage files intact.
 */
export const bulkMoveToFolder = mutation({
  args: {
    ids: v.array(v.id("resources")),
    folderId: v.union(v.id("folders"), v.null()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.ids.length === 0) return 0;
    let targetSubjectId: Id<"subjects"> | null = null;
    if (args.folderId !== null) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) throw new ConvexError("Target folder not found.");
      targetSubjectId = folder.subjectId;
    }

    let moved = 0;
    for (const id of args.ids) {
      const resource = await ctx.db.get(id);
      if (!resource) continue;
      if (targetSubjectId && resource.subjectId !== targetSubjectId) continue;
      await ctx.db.patch(id, {
        folderId: args.folderId === null ? undefined : args.folderId,
      });
      moved++;
    }
    return moved;
  },
});

/**
 * Bulk delete user-uploaded resources (ownerKey enforced).
 * Cascades bookmarks, ratings, chunks, and storage files.
 */
export const bulkDelete = mutation({
  args: {
    ids: v.array(v.id("resources")),
    ownerKey: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let deleted = 0;
    for (const id of args.ids) {
      const resource = await ctx.db.get(id);
      if (!resource) continue;
      if (resource.isOfficial || resource.ownerKey === undefined) continue;
      if (resource.ownerKey !== args.ownerKey) continue;

      for await (const bookmark of ctx.db
        .query("bookmarks")
        .withIndex("by_resource", (q) => q.eq("resourceId", id))) {
        await ctx.db.delete(bookmark._id);
      }
      for await (const rating of ctx.db
        .query("ratings")
        .withIndex("by_resource_and_owner", (q) => q.eq("resourceId", id))) {
        await ctx.db.delete(rating._id);
      }
      for await (const chunk of ctx.db
        .query("documentChunks")
        .withIndex("by_resource", (q) => q.eq("resourceId", id))) {
        await ctx.db.delete(chunk._id);
      }
      if (resource.storageId) {
        try {
          await ctx.storage.delete(resource.storageId);
        } catch {
          // Ignore
        }
      }
      await ctx.db.delete(id);
      deleted++;
    }
    return deleted;
  },
});

/**
 * Bulk tag manipulation: add or remove tags across selected resources.
 */
export const bulkUpdateTags = mutation({
  args: {
    ids: v.array(v.id("resources")),
    addTags: v.optional(v.array(v.string())),
    removeTags: v.optional(v.array(v.string())),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const toAdd = (args.addTags ?? [])
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    const toRemove = new Set(
      (args.removeTags ?? []).map((t) => t.trim().toLowerCase())
    );

    let updated = 0;
    for (const id of args.ids) {
      const resource = await ctx.db.get(id);
      if (!resource) continue;
      const tagSet = new Set(resource.tags.map((t) => t.toLowerCase()));
      for (const t of toRemove) tagSet.delete(t);
      for (const t of toAdd) tagSet.add(t);
      await ctx.db.patch(id, {
        tags: Array.from(tagSet).slice(0, 20),
      });
      updated++;
    }
    return updated;
  },
});
