import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { resourceTypeValidator } from "./validators";

/**
 * StudySyncPlus data model.
 *
 * Ownership without auth: every student browser mints a stable `ownerKey`
 * (UUID in localStorage). Resources uploaded by an owner carry that key;
 * official (seeded) rows carry none and are immutable to the public.
 * This is intent-protection, not security — the platform is public by design.
 */
export default defineSchema({
  // One row per academic semester. Semester III is the seeded dataset.
  semesters: defineTable({
    number: v.number(),
    label: v.string(), // "Semester III"
    schemeLabel: v.string(), // "22+2* credits · 2022 scheme"
    isActive: v.boolean(),
  })
    .index("by_number", ["number"])
    .index("by_active", ["isActive"]),

  // Course rows of a semester's official scheme. Doubles as the library's
  // subject index (rows with inLibrary: true appear in the filter rail).
  subjects: defineTable({
    semesterId: v.id("semesters"),
    name: v.string(), // "Data Structures"
    courseCode: v.string(), // "CMCOR2PC203"
    category: v.string(), // "Program Core"
    abbreviation: v.string(), // "PC"
    cl: v.number(),
    tl: v.number(),
    ll: v.number(),
    slPbl: v.number(),
    nh: v.number(),
    credits: v.number(),
    srNo: v.number(), // scheme order
    inLibrary: v.boolean(),
    isArchived: v.boolean(),
  })
    .index("by_semester", ["semesterId", "srNo"])
    .index("by_semester_and_name", ["semesterId", "name"]),

  resources: defineTable({
    semesterId: v.id("semesters"),
    subjectId: v.id("subjects"),
    subjectName: v.string(), // denormalized display cache, kept in sync on rename
    courseCode: v.string(),
    title: v.string(),
    type: resourceTypeValidator,
    uploadedBy: v.string(),
    rollNumber: v.string(),
    uploadDate: v.string(), // YYYY-MM-DD, set server-side
    fileSizeBytes: v.number(), // real bytes for uploads; nominal for legacy seeds
    storageId: v.optional(v.id("_storage")), // real PDF in Convex File Storage
    fileName: v.optional(v.string()), // original client filename (display only)
    downloadCount: v.number(),
    ratingSum: v.number(),
    ratingCount: v.number(),
    description: v.string(),
    tags: v.array(v.string()),
    ownerKey: v.optional(v.string()), // undefined = official seeded content
    isOfficial: v.boolean(),
    legacyId: v.optional(v.string()), // "res-001"… — idempotent seeding handle
  })
    .index("by_semester", ["semesterId"])
    .index("by_subject", ["subjectId"])
    .index("by_owner", ["ownerKey"])
    .index("by_legacy_id", ["legacyId"]),

  bookmarks: defineTable({
    ownerKey: v.string(),
    resourceId: v.id("resources"),
    createdAt: v.number(),
  })
    .index("by_owner_and_resource", ["ownerKey", "resourceId"])
    .index("by_resource", ["resourceId"]),

  ratings: defineTable({
    ownerKey: v.string(),
    resourceId: v.id("resources"),
    value: v.number(), // integer 1..5
    updatedAt: v.number(),
  }).index("by_resource_and_owner", ["resourceId", "ownerKey"]),

  // Prepared for future PDF chunking + RAG: chunks exist per resource today,
  // embeddings are optional and will be backfilled by an indexing action.
  documentChunks: defineTable({
    resourceId: v.id("resources"),
    seq: v.number(),
    text: v.string(),
    page: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_resource", ["resourceId", "seq"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["resourceId"],
    }),
});
