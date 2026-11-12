import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { semesterViewValidator, type SemesterView } from "./validators";

function toView(doc: { _id: unknown; number: number; label: string; schemeLabel: string }): SemesterView {
  return {
    id: doc._id as SemesterView["id"],
    number: doc.number,
    label: doc.label,
    schemeLabel: doc.schemeLabel,
  };
}

/** The semester the UI is showing (exactly one isActive row). */
export const getActive = query({
  args: {},
  returns: v.union(semesterViewValidator, v.null()),
  handler: async (ctx) => {
    const active = await ctx.db.query("semesters").withIndex("by_active", (q) => q.eq("isActive", true)).first();
    return active ? toView(active) : null;
  },
});

/** All semesters, ascending by number. Bounded — semesters are few. */
export const list = query({
  args: {},
  returns: v.array(semesterViewValidator),
  handler: async (ctx) => {
    const rows = await ctx.db.query("semesters").withIndex("by_number").order("asc").take(50);
    return rows.map(toView);
  },
});

/** Add a semester. Number must be unique; can be activated immediately. */
export const add = mutation({
  args: {
    number: v.number(),
    label: v.string(),
    schemeLabel: v.string(),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("semesters"),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.number) || args.number < 1) {
      throw new ConvexError("Semester number must be a positive integer.");
    }
    if (!args.label.trim()) throw new ConvexError("Semester label is required.");
    if (!args.schemeLabel.trim()) throw new ConvexError("Scheme label is required.");

    const existing = await ctx.db
      .query("semesters")
      .withIndex("by_number", (q) => q.eq("number", args.number))
      .first();
    if (existing) throw new ConvexError(`A semester with number ${args.number} already exists.`);

    if (args.isActive) {
      for await (const other of ctx.db.query("semesters").withIndex("by_active", (q) => q.eq("isActive", true))) {
        await ctx.db.patch(other._id, { isActive: false });
      }
    }

    return ctx.db.insert("semesters", {
      number: args.number,
      label: args.label.trim(),
      schemeLabel: args.schemeLabel.trim(),
      isActive: args.isActive ?? false,
    });
  },
});

/** Make a semester the active one (deactivates the rest). */
export const setActive = mutation({
  args: { id: v.id("semesters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.id);
    if (!target) throw new ConvexError("Semester not found.");

    for await (const other of ctx.db.query("semesters").withIndex("by_active", (q) => q.eq("isActive", true))) {
      if (other._id !== args.id) {
        await ctx.db.patch(other._id, { isActive: false });
      }
    }
    await ctx.db.patch(args.id, { isActive: true });
    return null;
  },
});
