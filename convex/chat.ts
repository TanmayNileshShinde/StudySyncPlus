import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** List chat threads for the current user/device. */
export const listThreads = query({
  args: { ownerKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatThreads")
      .withIndex("by_owner", (q) => q.eq("ownerKey", args.ownerKey))
      .order("desc")
      .take(50);
  },
});

/** Get a single thread by ID with mode metadata. */
export const getThread = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

/** Create a new chat thread. */
export const createThread = mutation({
  args: {
    ownerKey: v.string(),
    title: v.string(),
    mode: v.union(
      v.literal("library"),
      v.literal("semester"),
      v.literal("subject"),
      v.literal("folder"),
      v.literal("selected"),
      v.literal("resource")
    ),
    resourceId: v.optional(v.id("resources")),
    semesterId: v.optional(v.id("semesters")),
    subjectId: v.optional(v.id("subjects")),
    folderId: v.optional(v.id("folders")),
    selectedResourceIds: v.optional(v.array(v.id("resources"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("chatThreads", {
      ownerKey: args.ownerKey,
      title: args.title.trim().slice(0, 80) || "StudySync AI Session",
      mode: args.mode,
      resourceId: args.resourceId,
      semesterId: args.semesterId,
      subjectId: args.subjectId,
      folderId: args.folderId,
      selectedResourceIds: args.selectedResourceIds,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Delete a thread and its messages. */
export const deleteThread = mutation({
  args: { threadId: v.id("chatThreads"), ownerKey: v.string() },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.ownerKey !== args.ownerKey) return null;

    for await (const msg of ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(args.threadId);
    return true;
  },
});

/** List chronological messages in a thread. */
export const listMessages = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .take(200);
  },
});

/** Add a user message to a thread and update its updatedAt timestamp. */
export const appendUserMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.threadId, { updatedAt: now });
    return await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: "user",
      content: args.content.trim(),
      createdAt: now,
    });
  },
});

/** Add an assistant message with verified source citations to a thread. */
export const appendAssistantMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    content: v.string(),
    citations: v.optional(
      v.array(
        v.object({
          chunkId: v.id("documentChunks"),
          resourceId: v.id("resources"),
          resourceTitle: v.string(),
          page: v.optional(v.number()),
          fileKind: v.optional(v.string()),
          textSnippet: v.string(),
          score: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.threadId, { updatedAt: now });
    return await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: "assistant",
      content: args.content,
      citations: args.citations,
      createdAt: now,
    });
  },
});
