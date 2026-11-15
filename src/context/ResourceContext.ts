import { createContext, useContext } from 'react';
import type {
  StudyResource,
  SubjectOption,
  SchemeCourse,
  AppView,
  AssistantScope,
  StudyScopeKind,
  TaggedFocusTarget,
  BulkUploadInput,
  ResourceEditInput,
  NewSubjectInput,
  SemesterInfo
} from '../types';

export interface ResourceContextType {
  // Data (Convex-backed, realtime)
  resources: StudyResource[];
  subjects: SubjectOption[];
  schemeCourses: SchemeCourse[];
  semester: SemesterInfo | null;
  isLibraryLoading: boolean;
  bookmarkIds: string[];
  bookmarkCount: number;

  // Navigation (subject-centric IA & Study Workspace)
  view: AppView;
  openHome: () => void;
  openSubject: (subjectId: string) => void;
  openStudyWorkspace: (documentId: string, page?: number, scope?: StudyScopeKind) => void;
  switchStudyDocument: (documentId: string, page?: number) => void;
  openSaved: () => void;
  activeDocumentId: string | null;
  studyScope: StudyScopeKind;
  setStudyScope: (scope: StudyScopeKind) => void;
  viewerPage: number | null;
  setViewerPage: (page: number | null) => void;
  viewerZoom: number;
  setViewerZoom: (zoom: number) => void;
  openAssistant: (scope: AssistantScope) => void;
  assistantScope: AssistantScope;
  taggedTarget: TaggedFocusTarget | null;
  setTaggedTarget: (target: TaggedFocusTarget | null) => void;
  tagCurrentPage: () => void;
  tagCurrentDocument: () => void;
  clearTaggedTarget: () => void;

  // Subject-page filters
  subjectSearch: string;
  setSubjectSearch: (query: string) => void;

  // Overlays
  uploadSubjectId: string | null; // non-null = bulk-upload modal open
  uploadFolderId: string | null;
  openUploadModal: (subjectId?: string, folderId?: string) => void;
  closeUploadModal: () => void;
  detailResource: StudyResource | null;
  detailPage: number | null;
  openDetail: (resource: StudyResource, page?: number) => void;
  closeDetail: () => void;
  editResource: StudyResource | null;
  openEdit: (resource: StudyResource) => void;
  closeEdit: () => void;

  // Actions
  toggleBookmark: (id: string) => Promise<void>;
  isBookmarked: (id: string) => boolean;
  downloadResource: (resource: StudyResource) => Promise<void>;
  /** Signed artifact for ZIP building / previews — no toast, no browser download. */
  collectDownloadArtifact: (resource: StudyResource) => Promise<{ url: string; fileName: string } | null>;
  /** One file → storage, with progress. Returns the storage id. */
  uploadFileWithProgress: (file: File, onProgress: (pct: number) => void) => Promise<string>;
  /** Publish metadata (starts ingestion server-side). Silent — returns the resource id. */
  createResource: (input: BulkUploadInput, onUploadProgress?: (pct: number) => void) => Promise<string>;
  updateResource: (id: string, input: ResourceEditInput) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  /** Force a vector-index rebuild (retry after failure, or manual refresh). */
  reindexResource: (id: string) => Promise<{ status: string; message: string }>;
  rateResource: (id: string, value: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  addSubject: (input: NewSubjectInput) => Promise<void>;
  setSubjectArchived: (id: string, isArchived: boolean) => Promise<void>;

  // Organization & Folder management
  moveToFolder: (id: string, folderId: string | null) => Promise<void>;
  bulkMoveToFolder: (ids: string[], folderId: string | null) => Promise<number>;
  bulkDelete: (ids: string[]) => Promise<number>;
  bulkUpdateTags: (ids: string[], addTags?: string[], removeTags?: string[]) => Promise<number>;
  createFolder: (subjectId: string, name: string, parentId?: string, color?: string) => Promise<string>;
  renameFolder: (id: string, name: string) => Promise<void>;
  moveFolder: (id: string, targetParentId: string | null) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;

  toastMessage: string | null;
  showToast: (msg: string) => void;
}

export const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

export const useResources = (): ResourceContextType => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourceProvider');
  }
  return context;
};
