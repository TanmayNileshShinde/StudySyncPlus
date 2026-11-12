import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/** All resource ids bookmarked by one owner. Bounded — per-owner saves are few. */
export const listMine = query({
  args: { ownerKey: v.string() },
  returns: v.array(v.id("resources")),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_owner_and_resource", (q) => q.eq("ownerKey", args.ownerKey))
      .take(500);
    return rows.map((row) => row.resourceId);
  },
});

/** Toggle a bookmark for the calling owner. Returns the resulting state. */
export const toggle = mutation({
  args: { ownerKey: v.string(), resourceId: v.id("resources") },
  returns: v.object({ saved: v.boolean() }),
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) throw new ConvexError("Resource not found — it may have been removed.");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_owner_and_resource", (q) => q.eq("ownerKey", args.ownerKey).eq("resourceId", args.resourceId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    await ctx.db.insert("bookmarks", {
      ownerKey: args.ownerKey,
      resourceId: args.resourceId,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});
