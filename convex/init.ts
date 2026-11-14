import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { SEED_RESOURCES, SEED_SEMESTER, SEED_SUBJECTS, STANDARD_FOLDERS } from "./seedData";
import type { Id } from "./_generated/dataModel";

/** Seed bookmarks for the calling owner, mirroring the old default profile. */
const DEFAULT_BOOKMARK_LEGACY_IDS = ["res-001", "res-002"];

/**
 * Idempotently ensure the Semester III dataset exists. Safe to call any time:
 * existing rows are matched by semester number / subject name / legacyId and
 * left untouched.
 */
export async function ensureSeedData(ctx: MutationCtx): Promise<{ insertedSubjects: number; insertedResources: number }> {
  // 1. Semester III
  let semester = await ctx.db
    .query("semesters")
    .withIndex("by_number", (q) => q.eq("number", SEED_SEMESTER.number))
    .first();

  if (!semester) {
    const semesterId = await ctx.db.insert("semesters", {
      number: SEED_SEMESTER.number,
      label: SEED_SEMESTER.label,
      schemeLabel: SEED_SEMESTER.schemeLabel,
      isActive: true,
    });
    semester = await ctx.db.get(semesterId);
  }
  if (!semester) throw new Error("Failed to seed semester data");
  const semesterId = semester._id;

  // 2. Subjects (scheme rows) — matched by name within the semester
  let insertedSubjects = 0;
  for (const subject of SEED_SUBJECTS) {
    const existing = await ctx.db
      .query("subjects")
      .withIndex("by_semester_and_name", (q) => q.eq("semesterId", semesterId).eq("name", subject.name))
      .first();
    if (existing) continue;
    await ctx.db.insert("subjects", {
      semesterId,
      name: subject.name,
      courseCode: subject.courseCode,
      category: subject.category,
      abbreviation: subject.abbreviation,
      cl: subject.cl,
      tl: subject.tl,
      ll: subject.ll,
      slPbl: subject.slPbl,
      nh: subject.nh,
      credits: subject.credits,
      srNo: subject.srNo,
      inLibrary: subject.inLibrary,
      isArchived: false,
    });
    insertedSubjects += 1;
  }

  // 3. Ensure official folders exist for every subject
  const folderCache = new Map<string, Id<"folders">>();
  const allSubjects = await ctx.db
    .query("subjects")
    .withIndex("by_semester", (q) => q.eq("semesterId", semesterId))
    .collect();

  for (const subjectDoc of allSubjects) {
    for (const f of STANDARD_FOLDERS) {
      const existingFolder = await ctx.db
        .query("folders")
        .withIndex("by_subject", (q) => q.eq("subjectId", subjectDoc._id))
        .filter((q) => q.eq(q.field("name"), f.name))
        .first();

      if (!existingFolder) {
        const newFolderId = await ctx.db.insert("folders", {
          subjectId: subjectDoc._id,
          semesterId,
          name: f.name,
          order: f.order,
          createdAt: Date.now(),
        });
        folderCache.set(`${subjectDoc._id}:${f.name}`, newFolderId);
      } else {
        folderCache.set(`${subjectDoc._id}:${f.name}`, existingFolder._id);
      }
    }
  }

  // 4. Official resources — matched by legacyId and assigned to folders
  let insertedResources = 0;
  for (const resource of SEED_RESOURCES) {
    const subject = await ctx.db
      .query("subjects")
      .withIndex("by_semester_and_name", (q) => q.eq("semesterId", semesterId).eq("name", resource.subjectName))
      .first();
    if (!subject) continue;

    const folderId = resource.folderName
      ? folderCache.get(`${subject._id}:${resource.folderName}`)
      : undefined;

    const existing = await ctx.db
      .query("resources")
      .withIndex("by_legacy_id", (q) => q.eq("legacyId", resource.legacyId))
      .first();

    if (existing) {
      if (!existing.folderId && folderId) {
        await ctx.db.patch(existing._id, { folderId });
      }
      continue;
    }

    await ctx.db.insert("resources", {
      semesterId,
      subjectId: subject._id,
      subjectName: subject.name,
      courseCode: resource.courseCode,
      title: resource.title,
      type: resource.type,
      uploadedBy: resource.uploadedBy,
      rollNumber: resource.rollNumber,
      uploadDate: resource.uploadDate,
      fileSizeBytes: Math.round(resource.sizeMb * 1024 * 1024),
      downloadCount: resource.downloadCount,
      ratingSum: Math.round(resource.rating * 10),
      ratingCount: 10,
      description: resource.description,
      tags: resource.tags,
      isOfficial: true,
      legacyId: resource.legacyId,
      folderId,
    });
    insertedResources += 1;
  }

  return { insertedSubjects, insertedResources };
}

/** Read-only seed state probe used by the client to trigger first-load seeding. */
export const getState = query({
  args: {},
  returns: v.object({ seeded: v.boolean() }),
  handler: async (ctx) => {
    const semester = await ctx.db
      .query("semesters")
      .withIndex("by_number", (q) => q.eq("number", SEED_SEMESTER.number))
      .first();
    if (!semester) return { seeded: false };
    const count = (await ctx.db.query("resources").collect()).length;
    return { seeded: count >= SEED_RESOURCES.length };
  },
});

/** Public, idempotent seed entry point (called by the client on first load). */
export const seedIfEmpty = mutation({
  args: {},
  returns: v.object({ insertedSubjects: v.number(), insertedResources: v.number() }),
  handler: async (ctx): Promise<{ insertedSubjects: number; insertedResources: number }> => {
    return ensureSeedData(ctx);
  },
});

/**
 * Reset to the official Semester III dataset: removes student-uploaded
 * resources (and their stored files), clears all bookmarks and real ratings,
 * then restores any missing seed rows. Baseline synthetic ratings live on the
 * resource documents and therefore survive the wipe of the ratings table.
 */
export const resetToSeed = mutation({
  args: { ownerKey: v.optional(v.string()) },
  returns: v.object({
    deletedResources: v.number(),
    restoredResources: v.number(),
  }),
  handler: async (ctx, args): Promise<{ deletedResources: number; restoredResources: number }> => {
    let deletedResources = 0;

    // Remove every non-official resource and its stored file.
    for await (const resource of ctx.db.query("resources")) {
      if (resource.isOfficial) continue;
      if (resource.storageId) {
        await ctx.storage.delete(resource.storageId);
      }
      await ctx.db.delete(resource._id);
      deletedResources += 1;
    }

    // Clear all per-owner bookmarks and real ratings (official aggregates live
    // on the resource docs, so they are unaffected).
    for await (const bookmark of ctx.db.query("bookmarks")) {
      await ctx.db.delete(bookmark._id);
    }
    for await (const rating of ctx.db.query("ratings")) {
      await ctx.db.delete(rating._id);
    }

    // Restore the official dataset.
    const result = await ensureSeedData(ctx);

    // Re-apply the old default profile's saved bookmarks for this browser.
    const ownerKey = args.ownerKey;
    if (ownerKey !== undefined) {
      for (const legacyId of DEFAULT_BOOKMARK_LEGACY_IDS) {
        const resource = await ctx.db
          .query("resources")
          .withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId))
          .first();
        if (!resource) continue;
        const existing = await ctx.db
          .query("bookmarks")
          .withIndex("by_owner_and_resource", (q) => q.eq("ownerKey", ownerKey).eq("resourceId", resource._id))
          .first();
        if (!existing) {
          await ctx.db.insert("bookmarks", {
            ownerKey,
            resourceId: resource._id,
            createdAt: Date.now(),
          });
        }
      }
    }

    return { deletedResources, restoredResources: result.insertedResources };
  },
});
