/**
 * Frontend types. Subject/semester data is now dynamic (stored in Convex),
 * so subject names are plain strings; the fixed set lives in the database,
 * seeded with the Semester III course file.
 */

export type ResourceType = 'Lecture Notes' | 'Past Exam Papers' | 'Lab Manual' | 'Cheat Sheet' | 'Reference Book';

export type SubjectName = string;

export interface StudyResource {
  id: string; // Convex resource id
  courseCode: string;
  title: string;
  subjectId: string;
  subjectName: SubjectName;
  semester: number;
  type: ResourceType;
  uploadedBy: string;
  rollNumber: string;
  uploadDate: string; // YYYY-MM-DD
  fileSize: string; // display string, derived from fileSizeBytes
  fileSizeBytes: number;
  downloadCount: number;
  rating: number; // aggregate 0..5 (0 = unrated)
  ratingCount: number;
  fileFormat: 'PDF' | 'PPT' | 'PPTX';
  description: string;
  tags: string[];
  isUserUploaded: boolean; // false = official seeded content
  ownerKey: string | null; // owner identity for uploads (null = official)
  hasFile: boolean; // real stored file (vs legacy summary-card fallback)
  fileName: string | null;
  /** Underlying document kind — drives "Page N" vs "Slide N" citations. */
  fileKind: 'pdf' | 'ppt' | 'pptx' | null;
  /** RAG pipeline state; null = legacy row never ingested. */
  ingestStatus: 'pending' | 'processing' | 'ready' | 'failed' | null;
  ingestError: string | null;
  ingestedAt: number | null;
  chunkCount: number | null;
}

/** Library rail + upload picker entry (active, unarchived courses only). */
export interface SubjectOption {
  id: string;
  name: string;
  courseCode: string;
}

/** Row of the scheme/credit-matrix table (all courses of the semester). */
export interface SchemeCourse {
  id: string;
  srNo: number;
  category: string;
  abbreviation: string;
  courseCode: string;
  courseName: string;
  cl: number;
  tl: number;
  ll: number;
  slPbl: number;
  nh: number;
  credits: number;
  inLibrary: boolean;
  isArchived: boolean;
}

export interface SemesterInfo {
  id: string;
  number: number;
  label: string;
  schemeLabel: string;
}

// ---------------------------------------------------------------------------
// Navigation — subject-centric information architecture & Study Workspace
// ---------------------------------------------------------------------------

/**
 * The three primary destinations. A subject is the catalog workspace;
 * the study workspace provides full-screen document viewing + integrated AI.
 */
export type AppView =
  | { kind: 'home' }
  | { kind: 'subject'; subjectId: string }
  | { kind: 'study'; documentId: string; page?: number }
  | { kind: 'saved' }
  | { kind: 'not-found' };

/** The 3-way context selector for the AI Assistant within the Study Workspace. */
export type StudyScopeKind = 'document' | 'subject' | 'library';

/**
 * Retrieval scope for the Study Assistant. The panel derives this from the
 * current view or context selector — never shown as a technical mode.
 */
export type AssistantScope =
  | { mode: 'semester' }
  | { mode: 'subject'; subjectId: string }
  | { mode: 'resource'; resourceId: string };

/** Secondary features demoted into the top-bar overflow (user decision). */
export type MoreSheetKind = 'analytics' | 'async-lab' | 'scheme' | 'syllabus';

export interface FormErrors {
  title?: string;
  subject?: string;
  type?: string;
  uploadedBy?: string;
  rollNumber?: string;
  file?: string;
  description?: string;
}

export interface ResourceEditInput {
  title?: string;
  description?: string;
  type?: ResourceType;
  subjectId?: string;
  tags?: string[];
  uploadedBy?: string;
  rollNumber?: string;
  replaceFile?: File;
}

/** Input for a single file inside the bulk-upload flow. */
export interface BulkUploadInput {
  file: File;
  title: string;
  subjectId: string;
  type: ResourceType;
  uploadedBy: string;
  rollNumber: string;
  description: string;
  tags: string[];
}

export interface NewSubjectInput {
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
}
