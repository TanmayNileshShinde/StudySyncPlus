import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/** One owner's current rating for a resource, or null when unrated. */
export const getMine = query({
  args: { ownerKey: v.string(), resourceId: v.id("resources") },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_resource_and_owner", (q) => q.eq("resourceId", args.resourceId).eq("ownerKey", args.ownerKey))
      .first();
    return existing ? existing.value : null;
  },
});

/**
 * Upsert a 1–5 rating and keep the denormalized aggregate on the resource
 * document in sync (same transaction — no drift).
 */
export const rate = mutation({
  args: { ownerKey: v.string(), resourceId: v.id("resources"), value: v.number() },
  returns: v.object({
    rating: v.number(),
    ratingCount: v.number(),
    yourRating: v.number(),
  }),
  handler: async (ctx, args) => {
    const value = Math.round(args.value);
    if (value < 1 || value > 5) throw new ConvexError("Rating must be between 1 and 5.");

    const resource = await ctx.db.get(args.resourceId);
    if (!resource) throw new ConvexError("Resource not found — it may have been removed.");

    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_resource_and_owner", (q) => q.eq("resourceId", args.resourceId).eq("ownerKey", args.ownerKey))
      .first();

    let ratingSum = resource.ratingSum;
    let ratingCount = resource.ratingCount;

    if (existing) {
      ratingSum += value - existing.value;
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      ratingSum += value;
      ratingCount += 1;
      await ctx.db.insert("ratings", {
        ownerKey: args.ownerKey,
        resourceId: args.resourceId,
        value,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.resourceId, { ratingSum, ratingCount });

    return {
      rating: ratingCount > 0 ? ratingSum / ratingCount : 0,
      ratingCount,
      yourRating: value,
    };
  },
});
