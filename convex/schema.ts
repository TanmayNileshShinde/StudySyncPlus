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
    fileKind: v.optional(v.union(v.literal("pdf"), v.literal("ppt"), v.literal("pptx"))),
    downloadCount: v.number(),
    ratingSum: v.number(),
    ratingCount: v.number(),
    description: v.string(),
    tags: v.array(v.string()),
    ownerKey: v.optional(v.string()), // undefined = official seeded content
    isOfficial: v.boolean(),
    legacyId: v.optional(v.string()), // "res-001"… — idempotent seeding handle
    // RAG pipeline state. pending/processing/ready/failed; undefined = legacy
    // row that never had a stored file (client-side summary fallback only).
    ingestStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("ready"),
        v.literal("failed")
      )
    ),
    ingestError: v.optional(v.string()),
    ingestedAt: v.optional(v.number()),
    chunkCount: v.optional(v.number()),
    contentHash: v.optional(v.string()), // file-bytes fingerprint for duplicate-processing protection
    folderId: v.optional(v.id("folders")), // organizational folder (undefined = Unorganized)
  })
    .index("by_semester", ["semesterId"])
    .index("by_subject", ["subjectId"])
    .index("by_folder", ["folderId"])
    .index("by_owner", ["ownerKey"])
    .index("by_legacy_id", ["legacyId"]),

  // Nested custom folders for organizing hundreds of resources per subject
  folders: defineTable({
    subjectId: v.id("subjects"),
    semesterId: v.id("semesters"),
    name: v.string(), // "Module 1: Stacks & Queues"
    parentId: v.optional(v.id("folders")), // supports nested folders
    color: v.optional(v.string()), // optional accent color token
    order: v.number(), // display order
    ownerKey: v.optional(v.string()), // undefined = official, or creator key
    createdAt: v.number(),
  })
    .index("by_subject", ["subjectId"])
    .index("by_parent", ["parentId"])
    .index("by_subject_and_parent", ["subjectId", "parentId"]),

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

  // Document chunks for PDF/PPT indexing and vector search (RAG)
  documentChunks: defineTable({
    resourceId: v.id("resources"),
    semesterId: v.optional(v.id("semesters")),
    subjectId: v.optional(v.id("subjects")), // enables subject-scoped vector search
    seq: v.number(),
    text: v.string(),
    page: v.optional(v.number()), // PDF page number or PPT/PPTX slide number
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_resource", ["resourceId", "seq"])
    .index("by_semester", ["semesterId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 2048,
      filterFields: ["resourceId", "semesterId", "subjectId"],
    }),

  // Persistent chat threads for AI Assistant (Library, Semester, Subject, Folder, Selected, or Resource modes)
  chatThreads: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerKey", "updatedAt"])
    .index("by_resource", ["resourceId"])
    .index("by_semester", ["semesterId"])
    .index("by_subject", ["subjectId"])
    .index("by_folder", ["folderId"]),

  // Persistent messages within a chat thread
  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    citations: v.optional(
      v.array(
        v.object({
          chunkId: v.id("documentChunks"),
          resourceId: v.id("resources"),
          resourceTitle: v.string(),
          page: v.optional(v.number()),
          fileKind: v.optional(v.string()), // "pdf" | "ppt" | "pptx" — labels the ref "Page" vs "Slide"
          textSnippet: v.string(),
          score: v.number(),
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),
});
