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

/** Hard platform cap for one stored PDF (requirement: 50 MB). */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

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
  fileFormat: v.literal("PDF"),
  description: v.string(),
  tags: v.array(v.string()),
  isUserUploaded: v.boolean(), // !isOfficial
  ownerKey: v.union(v.string(), v.null()),
  hasFile: v.boolean(), // real stored PDF (vs legacy summary-card fallback)
  fileName: v.union(v.string(), v.null()),
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
