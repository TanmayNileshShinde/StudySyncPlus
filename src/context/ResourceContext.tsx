import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type {
  StudyResource,
  SubjectOption,
  SchemeCourse,
  AppView,
  AssistantScope,
  StudyScopeKind,
  BulkUploadInput,
  ResourceEditInput,
  NewSubjectInput,
  SemesterInfo
} from '../types';
import { getOwnerKey } from '../lib/owner';
import { asResourceId, asSemesterId, asStorageId, asSubjectId } from '../lib/convexIds';
import { apiService } from '../services/apiService';

/**
 * Data lives in Convex (resources, subjects, semesters, bookmarks, ratings).
 * This context keeps the temporary UI state — current view, assistant scope,
 * overlay state, filters — and exposes typed wrappers around the Convex
 * functions the UI needs.
 */
interface ResourceContextType {
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
  activeDocumentId: string | null;
  studyScope: StudyScopeKind;
  setStudyScope: (scope: StudyScopeKind) => void;
  viewerPage: number | null;
  setViewerPage: (page: number | null) => void;
  viewerZoom: number;
  setViewerZoom: (zoom: number) => void;
  openAssistant: (scope: AssistantScope) => void;
  assistantScope: AssistantScope;

  // Subject-page filters
  subjectSearch: string;
  setSubjectSearch: (query: string) => void;

  // Overlays
  uploadSubjectId: string | null; // non-null = bulk-upload modal open
  openUploadModal: (subjectId?: string) => void;
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

  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

/** Legacy localStorage keys from the pre-Convex era — safe to drop. */
const LEGACY_STORAGE_KEYS = ['studysyncplus_resources_v3', 'studysyncplus_user_profile_v3'];

export const ResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ownerKey = getOwnerKey();

  // --- Convex data -----------------------------------------------------------
  const seedState = useQuery(api.init.getState, {});
  const semester = useQuery(api.semesters.getActive, {});
  const subjectRows = useQuery(
    api.subjects.listBySemester,
    semester ? { semesterId: semester.id } : 'skip'
  );
  const resourceRows = useQuery(
    api.resources.list,
    semester ? { semesterId: semester.id } : 'skip'
  );
  const bookmarkRows = useQuery(api.bookmarks.listMine, { ownerKey });

  // --- Convex mutations ------------------------------------------------------
  const seedIfEmpty = useMutation(api.init.seedIfEmpty);
  const toggleBookmarkMut = useMutation(api.bookmarks.toggle);
  const downloadMut = useMutation(api.resources.download);
  const createResourceMut = useMutation(api.resources.create);
  const updateResourceMut = useMutation(api.resources.update);
  const removeResourceMut = useMutation(api.resources.remove);
  const generateUploadUrlMut = useMutation(api.resources.generateUploadUrl);
  const rateMut = useMutation(api.ratings.rate);
  const resetToSeedMut = useMutation(api.init.resetToSeed);
  const addSubjectMut = useMutation(api.subjects.add);
  const setSubjectArchivedMut = useMutation(api.subjects.setArchived);
  const reindexAction = useAction(api.ingest.reindexResource);

  // First load: seed the Semester III dataset if the deployment is empty.
  const seedRequested = useRef(false);
  useEffect(() => {
    if (seedState && !seedState.seeded && !seedRequested.current) {
      seedRequested.current = true;
      void seedIfEmpty({});
    }
  }, [seedState, seedIfEmpty]);

  // One-time cleanup of the pre-Convex localStorage payload.
  useEffect(() => {
    try {
      for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // Storage blocked — nothing to clean.
    }
  }, []);

  // --- Temporary UI state ----------------------------------------------------
  const [view, setView] = useState<AppView>({ kind: 'home' });
  const [assistantScope, setAssistantScope] = useState<AssistantScope>({ mode: 'semester' });
  const [studyScope, setStudyScope] = useState<StudyScopeKind>('document');
  const [viewerPage, setViewerPage] = useState<number | null>(1);
  const [viewerZoom, setViewerZoom] = useState<number>(100);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState<string | null>(null);
  const [detailResourceOverride, setDetailResourceOverride] = useState<StudyResource | null>(null);
  const [detailPage, setDetailPage] = useState<number | null>(null);
  const [editResource, setEditResource] = useState<StudyResource | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // --- Navigation ------------------------------------------------------------
  const openHome = useCallback(() => {
    setView({ kind: 'home' });
    setSubjectSearch('');
  }, []);

  const openSubject = useCallback((subjectId: string) => {
    setView({ kind: 'subject', subjectId });
    setSubjectSearch('');
  }, []);

  const openStudyWorkspace = useCallback(
    (documentId: string, page?: number, scope: StudyScopeKind = 'document') => {
      setView({ kind: 'study', documentId, page: page ?? 1 });
      setViewerPage(page ?? 1);
      setStudyScope(scope);
      setDetailResourceOverride(null);
    },
    []
  );

  const switchStudyDocument = useCallback((documentId: string, page?: number) => {
    setView((prev) =>
      prev.kind === 'study'
        ? { ...prev, documentId, page: page ?? 1 }
        : { kind: 'study', documentId, page: page ?? 1 }
    );
    setViewerPage(page ?? 1);
  }, []);

  const activeDocumentId = view.kind === 'study' ? view.documentId : null;

  // --- Derived data ----------------------------------------------------------
  const resources: StudyResource[] = useMemo(() => resourceRows ?? [], [resourceRows]);

  const subjects: SubjectOption[] = useMemo(
    () =>
      (subjectRows ?? [])
        .filter((s) => s.inLibrary && !s.isArchived)
        .map((s) => ({ id: s.id, name: s.name, courseCode: s.courseCode })),
    [subjectRows]
  );

  const schemeCourses: SchemeCourse[] = useMemo(
    () =>
      (subjectRows ?? []).map((s) => ({
        id: s.id,
        srNo: s.srNo,
        category: s.category,
        abbreviation: s.abbreviation,
        courseCode: s.courseCode,
        courseName: s.name,
        cl: s.cl,
        tl: s.tl,
        ll: s.ll,
        slPbl: s.slPbl,
        nh: s.nh,
        credits: s.credits,
        inLibrary: s.inLibrary,
        isArchived: s.isArchived
      })),
    [subjectRows]
  );

  const bookmarkIds: string[] = useMemo(() => bookmarkRows ?? [], [bookmarkRows]);
  const bookmarkIdSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  const isLibraryLoading = seedState === undefined || semester === undefined || resourceRows === undefined;

  // --- Actions ---------------------------------------------------------------
  const isBookmarked = useCallback((id: string) => bookmarkIdSet.has(id), [bookmarkIdSet]);

  const toggleBookmark = useCallback(
    async (id: string) => {
      try {
        const result = await toggleBookmarkMut({ ownerKey, resourceId: asResourceId(id) });
        showToast(result.saved ? 'Added to saved bookmarks' : 'Removed from saved bookmarks');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not update the bookmark.');
      }
    },
    [ownerKey, toggleBookmarkMut, showToast]
  );

  /**
   * Direct-to-storage upload via XHR so the caller gets real progress events
   * (fetch() has no upload progress). Resolves with the storage id.
   */
  const uploadFileWithProgress = useCallback(
    (file: File, onProgress: (pct: number) => void): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        void (async () => {
          try {
            const uploadUrl = await generateUploadUrlMut({});
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(100);
                try {
                  const { storageId } = JSON.parse(xhr.responseText) as { storageId: string };
                  if (!storageId) throw new Error('missing storageId');
                  resolve(storageId);
                } catch {
                  reject(new Error('Unexpected storage response. Please try again.'));
                }
              } else if (xhr.status === 413) {
                reject(new Error('File too large for storage (50 MB limit).'));
              } else {
                reject(new Error(`File upload failed (HTTP ${xhr.status}).`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error during upload. Please retry.'));
            xhr.onabort = () => reject(new Error('Upload cancelled.'));
            xhr.send(file);
          } catch (e) {
            reject(e instanceof Error ? e : new Error('Upload failed. Please try again.'));
          }
        })();
      }),
    [generateUploadUrlMut]
  );

  /** Publish metadata; the server schedules RAG ingestion automatically. Silent. */
  const createResource = useCallback(
    async (input: BulkUploadInput, onUploadProgress?: (pct: number) => void): Promise<string> => {
      if (!semester) throw new Error('The library is still loading. Please try again in a moment.');
      const storageId = await uploadFileWithProgress(input.file, (pct) => onUploadProgress?.(pct));
      const id = (await createResourceMut({
        storageId: asStorageId(storageId),
        semesterId: asSemesterId(semester.id),
        subjectId: asSubjectId(input.subjectId),
        title: input.title,
        type: input.type,
        uploadedBy: input.uploadedBy,
        rollNumber: input.rollNumber,
        description: input.description,
        tags: input.tags,
        ownerKey,
        fileName: input.file.name
      })) as unknown as string;
      return id;
    },
    [semester, ownerKey, uploadFileWithProgress, createResourceMut]
  );

  const updateResource = useCallback(
    async (id: string, input: ResourceEditInput) => {
      let replaceStorageId: string | undefined;
      if (input.replaceFile) {
        replaceStorageId = await uploadFileWithProgress(input.replaceFile, () => undefined);
      }
      await updateResourceMut({
        id: asResourceId(id),
        ownerKey,
        title: input.title,
        description: input.description,
        type: input.type,
        subjectId: input.subjectId ? asSubjectId(input.subjectId) : undefined,
        tags: input.tags,
        uploadedBy: input.uploadedBy,
        rollNumber: input.rollNumber,
        replaceStorageId: replaceStorageId ? asStorageId(replaceStorageId) : undefined,
        replaceFileName: input.replaceFile?.name
      });
      showToast('Resource updated successfully');
    },
    [ownerKey, uploadFileWithProgress, updateResourceMut, showToast]
  );

  const deleteResource = useCallback(
    async (id: string) => {
      try {
        await removeResourceMut({ id: asResourceId(id), ownerKey });
        showToast('Resource removed');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not delete this resource.');
      }
    },
    [ownerKey, removeResourceMut, showToast]
  );

  const reindexResource = useCallback(
    async (id: string): Promise<{ status: string; message: string }> => {
      const result = await reindexAction({ resourceId: asResourceId(id) });
      return { status: result.status, message: result.message };
    },
    [reindexAction]
  );

  /** Signed URL for preview/ZIP consumers. Null for legacy summary-card rows. */
  const collectDownloadArtifact = useCallback(
    async (resource: StudyResource): Promise<{ url: string; fileName: string } | null> => {
      if (!resource.hasFile) return null;
      try {
        const result = await downloadMut({ id: asResourceId(resource.id) });
        if (!result) return null;
        return { url: result.url, fileName: result.fileName };
      } catch {
        return null;
      }
    },
    [downloadMut]
  );

  const downloadResource = useCallback(
    async (resource: StudyResource) => {
      try {
        const result = await collectDownloadArtifact(resource);
        if (result) {
          // Stored file: fetch the signed URL and hand the real file to the user.
          const response = await fetch(result.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = blobUrl;
          anchor.download = result.fileName;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(blobUrl);
        } else {
          // Legacy seeded rows: regenerate the official summary card.
          apiService.generateAndDownloadResource(resource);
        }
        showToast(`Downloading "${resource.title.slice(0, 25)}..."`);
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Download failed. Please try again.');
      }
    },
    [collectDownloadArtifact, showToast]
  );

  const rateResource = useCallback(
    async (id: string, value: number) => {
      try {
        const result = await rateMut({ ownerKey, resourceId: asResourceId(id), value });
        showToast(`You rated this resource ${result.yourRating}/5`);
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not record your rating.');
      }
    },
    [ownerKey, rateMut, showToast]
  );

  const resetToDefaults = useCallback(async () => {
    try {
      await resetToSeedMut({ ownerKey });
      showToast('Reset StudySyncPlus to official Semester 3 PDF syllabus data.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Reset failed. Please try again.');
    }
  }, [ownerKey, resetToSeedMut, showToast]);

  const addSubject = useCallback(
    async (input: NewSubjectInput) => {
      await addSubjectMut(input);
      showToast(`Course "${input.name}" added to the scheme.`);
    },
    [addSubjectMut, showToast]
  );

  const setSubjectArchived = useCallback(
    async (id: string, isArchived: boolean) => {
      await setSubjectArchivedMut({ id: asSubjectId(id), isArchived });
      showToast(isArchived ? 'Course archived — hidden from the shelf.' : 'Course restored to the shelf.');
    },
    [setSubjectArchivedMut, showToast]
  );

  // --- Overlays & Study Navigation ------------------------------------------
  const openUploadModal = useCallback((subjectId?: string) => {
    setUploadSubjectId(subjectId ?? null);
  }, []);
  const closeUploadModal = useCallback(() => setUploadSubjectId(null), []);

  const openAssistant = useCallback(
    (scope: AssistantScope) => {
      setAssistantScope(scope);
      if (scope.mode === 'resource') {
        openStudyWorkspace(scope.resourceId, undefined, 'document');
      } else if (scope.mode === 'subject') {
        const match = resources.find((r) => r.subjectId === scope.subjectId) ?? resources[0];
        if (match) {
          openStudyWorkspace(match.id, undefined, 'subject');
        } else {
          openHome();
        }
      } else {
        const match = resources[0];
        if (match) {
          openStudyWorkspace(match.id, undefined, 'library');
        } else {
          openHome();
        }
      }
    },
    [resources, openStudyWorkspace, openHome]
  );

  const detailResource = useMemo(() => {
    if (detailResourceOverride) return detailResourceOverride;
    if (view.kind === 'study') {
      return resources.find((r) => r.id === view.documentId) ?? null;
    }
    return null;
  }, [detailResourceOverride, view, resources]);

  const openDetail = useCallback(
    (resource: StudyResource, page?: number) => {
      openStudyWorkspace(resource.id, page, 'document');
    },
    [openStudyWorkspace]
  );

  const closeDetail = useCallback(() => {
    setDetailResourceOverride(null);
    setDetailPage(null);
    if (view.kind === 'study') {
      const activeRes = resources.find((r) => r.id === view.documentId);
      if (activeRes) {
        openSubject(activeRes.subjectId);
      } else {
        openHome();
      }
    }
  }, [view, resources, openSubject, openHome]);

  const openEdit = useCallback((resource: StudyResource) => setEditResource(resource), []);
  const closeEdit = useCallback(() => setEditResource(null), []);

  const value = useMemo(
    () => ({
      resources,
      subjects,
      schemeCourses,
      semester: semester ?? null,
      isLibraryLoading,
      bookmarkIds,
      bookmarkCount: bookmarkIds.length,
      view,
      openHome,
      openSubject,
      openStudyWorkspace,
      switchStudyDocument,
      activeDocumentId,
      studyScope,
      setStudyScope,
      viewerPage,
      setViewerPage,
      viewerZoom,
      setViewerZoom,
      openAssistant,
      assistantScope,
      subjectSearch,
      setSubjectSearch,
      uploadSubjectId,
      openUploadModal,
      closeUploadModal,
      detailResource,
      detailPage,
      openDetail,
      closeDetail,
      editResource,
      openEdit,
      closeEdit,
      toggleBookmark,
      isBookmarked,
      downloadResource,
      collectDownloadArtifact,
      uploadFileWithProgress,
      createResource,
      updateResource,
      deleteResource,
      reindexResource,
      rateResource,
      resetToDefaults,
      addSubject,
      setSubjectArchived,
      toastMessage,
      showToast
    }),
    [
      resources,
      subjects,
      schemeCourses,
      semester,
      isLibraryLoading,
      bookmarkIds,
      view,
      openHome,
      openSubject,
      openStudyWorkspace,
      switchStudyDocument,
      activeDocumentId,
      studyScope,
      viewerPage,
      viewerZoom,
      openAssistant,
      assistantScope,
      subjectSearch,
      uploadSubjectId,
      openUploadModal,
      closeUploadModal,
      detailResource,
      detailPage,
      openDetail,
      closeDetail,
      editResource,
      openEdit,
      closeEdit,
      toggleBookmark,
      isBookmarked,
      downloadResource,
      collectDownloadArtifact,
      uploadFileWithProgress,
      createResource,
      updateResource,
      deleteResource,
      reindexResource,
      rateResource,
      resetToDefaults,
      addSubject,
      setSubjectArchived,
      toastMessage,
      showToast
    ]
  );

  return <ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>;
};

export const useResources = () => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourceProvider');
  }
  return context;
};
