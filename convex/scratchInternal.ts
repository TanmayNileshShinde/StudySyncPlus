import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getStorageUrl = internalQuery({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || !resource.storageId) return null;
    return await ctx.storage.getUrl(resource.storageId);
  },
});
