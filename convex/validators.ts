import { v, type Infer } from "convex/values";

/** The five fixed resource categories shown across the UI. */
export const resourceTypeValidator = v.union(
  v.literal("Lecture Notes"),
  v.literal("Past Exam Papers"),
  v.literal("Lab Manual"),
  v.literal("Cheat Sheet"),
  v.literal("Reference Book"),
);

export type ResourceTypeValue = "Lecture Notes" | "Past Exam Papers" | "Lab Manual" | "Cheat Sheet" | "Reference Book";

/** Stored document kinds: real PDF plus PowerPoint decks. */
export const fileKindValidator = v.union(
  v.literal("pdf"),
  v.literal("ppt"),
  v.literal("pptx"),
);
export type FileKind = Infer<typeof fileKindValidator>;

/** Ingestion pipeline state for a stored document. */
export const ingestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("failed"),
);
export type IngestStatus = Infer<typeof ingestStatusValidator>;

/** Display label for a stored file kind. */
export function fileKindLabel(kind: FileKind | undefined): "PDF" | "PPT" | "PPTX" {
  switch (kind) {
    case "ppt":
      return "PPT";
    case "pptx":
      return "PPTX";
    default:
      return "PDF";
  }
}

/** Hard platform cap for one stored file (requirement: 50 MB). */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Content types accepted by the storage validator (PDF + PowerPoint decks). */
export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
];

/** Map a MIME type (or filename fallback) to a stored file kind. */
export function resolveFileKind(contentType: string, fileName: string): FileKind {
  if (contentType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
  if (contentType === "application/vnd.ms-powerpoint") return "ppt";
  if (contentType === "application/pdf") return "pdf";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".ppt")) return "ppt";
  if (lower.endsWith(".pdf")) return "pdf";
  throw new Error(`Unsupported file type: ${contentType || fileName}`);
}

/** Client-facing resource view (what the React app renders). */
export const resourceViewValidator = v.object({
  id: v.id("resources"),
  courseCode: v.string(),
  title: v.string(),
  subjectId: v.id("subjects"),
  subjectName: v.string(),
  semester: v.number(),
  type: resourceTypeValidator,
  uploadedBy: v.string(),
  rollNumber: v.string(),
  uploadDate: v.string(),
  fileSize: v.string(), // display string, derived from bytes
  fileSizeBytes: v.number(),
  downloadCount: v.number(),
  rating: v.number(), // aggregate 0..5 (0 = unrated)
  ratingCount: v.number(),
  fileFormat: v.union(v.literal("PDF"), v.literal("PPT"), v.literal("PPTX")),
  fileKind: v.union(fileKindValidator, v.null()),
  description: v.string(),
  tags: v.array(v.string()),
  isUserUploaded: v.boolean(), // !isOfficial
  ownerKey: v.union(v.string(), v.null()),
  hasFile: v.boolean(), // real stored file (vs legacy summary-card fallback)
  fileName: v.union(v.string(), v.null()),
  ingestStatus: v.union(ingestStatusValidator, v.null()),
  ingestError: v.union(v.string(), v.null()),
  ingestedAt: v.union(v.number(), v.null()),
  chunkCount: v.union(v.number(), v.null()),
});

export type ResourceView = Infer<typeof resourceViewValidator>;

/** Client-facing subject row (library rail, upload picker). */
export const subjectViewValidator = v.object({
  id: v.id("subjects"),
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
  srNo: v.number(),
  inLibrary: v.boolean(),
  isArchived: v.boolean(),
});

export type SubjectView = Infer<typeof subjectViewValidator>;

/** Client-facing semester view. */
export const semesterViewValidator = v.object({
  id: v.id("semesters"),
  number: v.number(),
  label: v.string(),
  schemeLabel: v.string(),
});

export type SemesterView = Infer<typeof semesterViewValidator>;

/** Display helper shared by server mapping (kept identical to client copy). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0.0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Sanitize a client-provided filename for display. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "document.pdf";
  return base.slice(0, 120);
}
