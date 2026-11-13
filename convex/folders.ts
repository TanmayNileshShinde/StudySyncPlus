import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { folderViewValidator, type FolderView } from "./validators";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * List all folders belonging to a subject, with aggregated resource counts.
 * Flat listing contains `parentId` references so client can render tree or rail.
 */
export const listBySubject = query({
  args: { subjectId: v.id("subjects") },
  returns: v.array(folderViewValidator),
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .collect();

    // Count resources in each folder
    const counts = new Map<string, number>();
    for await (const res of ctx.db
      .query("resources")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))) {
      if (res.folderId) {
        counts.set(res.folderId, (counts.get(res.folderId) ?? 0) + 1);
      }
    }

    const views: FolderView[] = folders.map((f) => ({
      id: f._id,
      subjectId: f.subjectId,
      semesterId: f.semesterId,
      name: f.name,
      parentId: f.parentId ?? null,
      color: f.color ?? null,
      order: f.order,
      resourceCount: counts.get(f._id) ?? 0,
      ownerKey: f.ownerKey ?? null,
      createdAt: f.createdAt,
    }));

    // Sort by order then creation
    return views.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.createdAt - b.createdAt));
  },
});

/** Create a new folder (root or nested subfolder). */
export const create = mutation({
  args: {
    subjectId: v.id("subjects"),
    semesterId: v.id("semesters"),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    color: v.optional(v.string()),
    ownerKey: v.optional(v.string()),
  },
  returns: v.id("folders"),
  handler: async (ctx, args) => {
    const trimmed = args.name.trim();
    if (trimmed.length < 2) {
      throw new ConvexError("Folder name must be at least 2 characters.");
    }
    if (trimmed.length > 50) {
      throw new ConvexError("Folder name cannot exceed 50 characters.");
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) throw new ConvexError("Parent folder does not exist.");
      if (parent.subjectId !== args.subjectId) {
        throw new ConvexError("Parent folder belongs to a different course.");
      }
    }

    // Get highest current order
    const siblings = await ctx.db
      .query("folders")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .collect();
    const maxOrder = siblings.reduce((max, s) => Math.max(max, s.order), 0);

    return await ctx.db.insert("folders", {
      subjectId: args.subjectId,
      semesterId: args.semesterId,
      name: trimmed,
      parentId: args.parentId,
      color: args.color,
      order: maxOrder + 1,
      ownerKey: args.ownerKey,
      createdAt: Date.now(),
    });
  },
});

/** Rename an existing folder. */
export const rename = mutation({
  args: {
    id: v.id("folders"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trimmed = args.name.trim();
    if (trimmed.length < 2) {
      throw new ConvexError("Folder name must be at least 2 characters.");
    }
    if (trimmed.length > 50) {
      throw new ConvexError("Folder name cannot exceed 50 characters.");
    }

    const folder = await ctx.db.get(args.id);
    if (!folder) throw new ConvexError("Folder not found.");

    await ctx.db.patch(args.id, { name: trimmed });
    return null;
  },
});

/**
 * Move a folder into another parent folder (nested) or to root.
 * Detects and prevents circular nesting.
 */
export const moveFolder = mutation({
  args: {
    id: v.id("folders"),
    targetParentId: v.union(v.id("folders"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.id);
    if (!folder) throw new ConvexError("Folder not found.");

    if (args.targetParentId !== null) {
      if (args.targetParentId === args.id) {
        throw new ConvexError("Cannot move a folder into itself.");
      }

      // Check circular ancestry
      let currentParentId: Id<"folders"> | undefined = args.targetParentId;
      while (currentParentId) {
        if (currentParentId === args.id) {
          throw new ConvexError("Cannot move a folder into one of its descendants.");
        }
        const p: Doc<"folders"> | null = await ctx.db.get(currentParentId);
        currentParentId = p?.parentId;
      }
    }

    await ctx.db.patch(args.id, {
      parentId: args.targetParentId === null ? undefined : args.targetParentId,
    });
    return null;
  },
});

/**
 * Delete a folder.
 * CRITICAL INTEGRITY: Never deletes resources! Any resource inside this folder
 * is moved to "Unorganized" (`folderId: undefined`). Any child folders are
 * adopted by this folder's parent (or root).
 */
export const remove = mutation({
  args: { id: v.id("folders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.id);
    if (!folder) return null;

    // 1. Unlink resources in this folder -> move to Unorganized
    for await (const res of ctx.db
      .query("resources")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))) {
      await ctx.db.patch(res._id, { folderId: undefined });
    }

    // 2. Re-parent child folders to this folder's parent
    for await (const child of ctx.db
      .query("folders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))) {
      await ctx.db.patch(child._id, { parentId: folder.parentId });
    }

    // 3. Delete the folder record
    await ctx.db.delete(args.id);
    return null;
  },
});
