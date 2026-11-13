import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { subjectViewValidator, type SubjectView } from "./validators";

function toView(doc: {
  _id: unknown;
  name: string;
  courseCode: string;
  category: string;
  abbreviation: string;
  cl: number;
  tl: number;
  ll: number;
  slPbl: number;
  nh: number;
  credits: number;
  srNo: number;
  inLibrary: boolean;
  isArchived: boolean;
}): SubjectView {
  return {
    id: doc._id as SubjectView["id"],
    name: doc.name,
    courseCode: doc.courseCode,
    category: doc.category,
    abbreviation: doc.abbreviation,
    cl: doc.cl,
    tl: doc.tl,
    ll: doc.ll,
    slPbl: doc.slPbl,
    nh: doc.nh,
    credits: doc.credits,
    srNo: doc.srNo,
    inLibrary: doc.inLibrary,
    isArchived: doc.isArchived,
  };
}

/** All scheme rows of one semester, in scheme order (srNo). */
export const listBySemester = query({
  args: { semesterId: v.id("semesters") },
  returns: v.array(subjectViewValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("subjects")
      .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId))
      .order("asc")
      .take(200);
    return rows.map(toView);
  },
});

/**
 * Add a course row to a semester. `semesterId` defaults to the active
 * semester when omitted. Subject names are unique within a semester.
 */
export const add = mutation({
  args: {
    semesterId: v.optional(v.id("semesters")),
    name: v.string(),
    courseCode: v.string(),
    category: v.string(),
    abbreviation: v.string(),
    cl: v.number(),
    tl: v.number(),
    ll: v.number(),
    slPbl: v.number(),
    nh: v.number(),
    credits: v.number(),
    inLibrary: v.boolean(),
  },
  returns: v.id("subjects"),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) throw new ConvexError("Course name is required.");
    const courseCode = args.courseCode.trim();
    if (!courseCode) throw new ConvexError("Course code is required.");
    if (!args.category.trim()) throw new ConvexError("Category is required.");
    if (!args.abbreviation.trim()) throw new ConvexError("Abbreviation is required.");
    if (args.credits < 0 || args.nh < 0) throw new ConvexError("Credits and hours cannot be negative.");

    // Resolve the target semester (active one by default).
    let semesterId = args.semesterId;
    if (!semesterId) {
      const active = await ctx.db.query("semesters").withIndex("by_active", (q) => q.eq("isActive", true)).first();
      if (!active) throw new ConvexError("No active semester exists yet.");
      semesterId = active._id;
    }
    const semester = await ctx.db.get(semesterId);
    if (!semester) throw new ConvexError("Semester not found.");

    const duplicate = await ctx.db
      .query("subjects")
      .withIndex("by_semester_and_name", (q) => q.eq("semesterId", semesterId).eq("name", name))
      .first();
    if (duplicate) throw new ConvexError(`"${name}" already exists in ${semester.label}.`);

    // Scheme order: append after the current last row.
    const last = await ctx.db
      .query("subjects")
      .withIndex("by_semester", (q) => q.eq("semesterId", semesterId))
      .order("desc")
      .first();

    return ctx.db.insert("subjects", {
      semesterId,
      name,
      courseCode,
      category: args.category.trim(),
      abbreviation: args.abbreviation.trim(),
      cl: args.cl,
      tl: args.tl,
      ll: args.ll,
      slPbl: args.slPbl,
      nh: args.nh,
      credits: args.credits,
      srNo: (last?.srNo ?? 0) + 1,
      inLibrary: args.inLibrary,
      isArchived: false,
    });
  },
});

/**
 * Update a course row. Renaming a subject cascades into the denormalized
 * `subjectName` cache on its resources so cards never go stale.
 */
export const update = mutation({
  args: {
    id: v.id("subjects"),
    name: v.optional(v.string()),
    courseCode: v.optional(v.string()),
    category: v.optional(v.string()),
    abbreviation: v.optional(v.string()),
    cl: v.optional(v.number()),
    tl: v.optional(v.number()),
    ll: v.optional(v.number()),
    slPbl: v.optional(v.number()),
    nh: v.optional(v.number()),
    credits: v.optional(v.number()),
    inLibrary: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subject = await ctx.db.get(args.id);
    if (!subject) throw new ConvexError("Subject not found.");

    const patch: Partial<{
      name: string;
      courseCode: string;
      category: string;
      abbreviation: string;
      cl: number;
      tl: number;
      ll: number;
      slPbl: number;
      nh: number;
      credits: number;
      inLibrary: boolean;
    }> = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new ConvexError("Course name cannot be empty.");
      if (name !== subject.name) {
        const duplicate = await ctx.db
          .query("subjects")
          .withIndex("by_semester_and_name", (q) => q.eq("semesterId", subject.semesterId).eq("name", name))
          .first();
        if (duplicate) throw new ConvexError(`"${name}" already exists in this semester.`);
        patch.name = name;
      }
    }
    if (args.courseCode !== undefined) {
      const courseCode = args.courseCode.trim();
      if (!courseCode) throw new ConvexError("Course code cannot be empty.");
      patch.courseCode = courseCode;
    }
    if (args.category !== undefined) patch.category = args.category.trim();
    if (args.abbreviation !== undefined) patch.abbreviation = args.abbreviation.trim();
    if (args.cl !== undefined) patch.cl = args.cl;
    if (args.tl !== undefined) patch.tl = args.tl;
    if (args.ll !== undefined) patch.ll = args.ll;
    if (args.slPbl !== undefined) patch.slPbl = args.slPbl;
    if (args.nh !== undefined) patch.nh = args.nh;
    if (args.credits !== undefined) patch.credits = args.credits;
    if (args.inLibrary !== undefined) patch.inLibrary = args.inLibrary;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch);
    }

    // Propagate renames into the resource display cache.
    if (patch.name !== undefined) {
      for await (const resource of ctx.db
        .query("resources")
        .withIndex("by_subject", (q) => q.eq("subjectId", args.id))) {
        await ctx.db.patch(resource._id, { subjectName: patch.name });
      }
    }

    return null;
  },
});

/** Archive (hide from library rail + uploads) or restore a subject. */
export const setArchived = mutation({
  args: { id: v.id("subjects"), isArchived: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subject = await ctx.db.get(args.id);
    if (!subject) throw new ConvexError("Subject not found.");
    await ctx.db.patch(args.id, { isArchived: args.isArchived });
    return null;
  },
});
