import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import {
  MAX_FILE_BYTES,
  formatFileSize,
  resourceViewValidator,
  resourceTypeValidator,
  sanitizeFileName,
  type ResourceView,
} from "./validators";

/** Map a stored resource document to the client-facing view. */
function toView(
  doc: {
    _id: unknown;
    subjectId: unknown;
    subjectName: string;
    courseCode: string;
    title: string;
    type: ResourceView["type"];
    uploadedBy: string;
    rollNumber: string;
    uploadDate: string;
    fileSizeBytes: number;
    storageId?: string;
    fileName?: string;
    downloadCount: number;
    ratingSum: number;
    ratingCount: number;
    description: string;
    tags: string[];
    ownerKey?: string;
    isOfficial: boolean;
  },
  semesterNumber: number,
): ResourceView {
  return {
    id: doc._id as ResourceView["id"],
    subjectId: doc.subjectId as ResourceView["subjectId"],
    subjectName: doc.subjectName,
    courseCode: doc.courseCode,
    title: doc.title,
    semester: semesterNumber,
    type: doc.type,
    uploadedBy: doc.uploadedBy,
    rollNumber: doc.rollNumber,
    uploadDate: doc.uploadDate,
    fileSize: formatFileSize(doc.fileSizeBytes),
    fileSizeBytes: doc.fileSizeBytes,
    downloadCount: doc.downloadCount,
    rating: doc.ratingCount > 0 ? doc.ratingSum / doc.ratingCount : 0,
    ratingCount: doc.ratingCount,
    fileFormat: "PDF" as const,
    description: doc.description,
    tags: doc.tags,
    isUserUploaded: !doc.isOfficial,
    ownerKey: doc.ownerKey ?? null,
    hasFile: doc.storageId !== undefined,
    fileName: doc.fileName ?? null,
  };
}

/**
 * Library listing for one semester — the source of truth the React context
 * filters/sorts client-side. Bounded read (500 rows); the library is intended
 * to be paginated server-side once it outgrows this.
 */
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

/** Signed URL + display filename for embedded preview, or null for legacy rows. */
export const fileUrl = query({
  args: { id: v.id("resources") },
  returns: v.union(v.object({ url: v.string(), fileName: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.id);
    if (!resource || !resource.storageId) return null;
    const url = await ctx.storage.getUrl(resource.storageId);
    if (!url) return null;
    return { url, fileName: resource.fileName ?? `${resource.title}.pdf` };
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

/** Shared validation for a freshly uploaded storage file. */
async function assertValidStoredFile(ctx: MutationCtx, storageId: Id<"_storage">): Promise<{ size: number }> {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta) throw new ConvexError("The uploaded file could not be found. Please try uploading again.");
  if (meta.contentType !== "application/pdf") {
    throw new ConvexError("Only PDF files can be catalogued — the library is PDF only.");
  }
  if (meta.size <= 0) throw new ConvexError("The selected file appears to be empty.");
  if (meta.size > MAX_FILE_BYTES) throw new ConvexError("Maximum allowed file size is 50 MB.");
  return { size: meta.size };
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

/** Step 2 of the upload pipeline: publish metadata for an uploaded PDF. */
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
  },
  returns: v.id("resources"),
  handler: async (ctx, args) => {
    const { size } = await assertValidStoredFile(ctx, args.storageId);
    assertValidMetadata(args.title, args.description, args.uploadedBy, args.rollNumber);

    const subject = await ctx.db.get(args.subjectId);
    if (!subject) throw new ConvexError("Selected course does not exist.");
    if (subject.isArchived) throw new ConvexError("This course is archived and cannot accept uploads.");
    if (subject.semesterId !== args.semesterId) {
      throw new ConvexError("Selected course does not belong to the active semester.");
    }

    const tags = args.tags
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 20);

    return ctx.db.insert("resources", {
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
      downloadCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      description: args.description.trim(),
      tags,
      ownerKey: args.ownerKey,
      isOfficial: false,
    });
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
      fileSizeBytes: number;
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

    if (args.replaceStorageId !== undefined) {
      const { size } = await assertValidStoredFile(ctx, args.replaceStorageId);
      patch.storageId = args.replaceStorageId;
      patch.fileName = sanitizeFileName(args.replaceFileName ?? "document.pdf");
      patch.fileSizeBytes = size;
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
    return { url, fileName: resource.fileName ?? `${resource.title}.pdf` };
  },
});
