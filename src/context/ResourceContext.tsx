import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
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
import { getOwnerKey } from '../lib/owner';
import { asFolderId, asResourceId, asSemesterId, asStorageId, asSubjectId } from '../lib/convexIds';
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

  const moveToFolderMut = useMutation(api.resources.moveToFolder);
  const bulkMoveToFolderMut = useMutation(api.resources.bulkMoveToFolder);
  const bulkDeleteMut = useMutation(api.resources.bulkDelete);
  const bulkUpdateTagsMut = useMutation(api.resources.bulkUpdateTags);

  const createFolderMut = useMutation(api.folders.create);
  const renameFolderMut = useMutation(api.folders.rename);
  const moveFolderMut = useMutation(api.folders.moveFolder);
  const removeFolderMut = useMutation(api.folders.remove);

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

  // --- URL Router Integration -----------------------------------------------
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Reactive Navigation View derived from URL ----------------------------
  const view = useMemo<AppView>(() => {
    const raw = location.pathname.length > 1 ? location.pathname.replace(/\/+$/, '') : location.pathname;

    // 1. Study Workspace: /study/:documentId or /document/:documentId
    const studyMatch = raw.match(/^\/(?:study|document)\/([^/]+)/);
    if (studyMatch) {
      const documentId = decodeURIComponent(studyMatch[1]);
      const pageParam = searchParams.get('page');
      const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
      return { kind: 'study', documentId, page };
    }

    // 2. Study Assistant direct route: /assistant
    if (raw === '/assistant') {
      const docParam = searchParams.get('doc');
      const subjectParam = searchParams.get('subject');
      let targetDocId = docParam;
      if (!targetDocId && subjectParam && resourceRows) {
        const found = resourceRows.find((r) => r.subjectId === subjectParam);
        if (found) targetDocId = found.id;
      }
      if (!targetDocId && resourceRows && resourceRows.length > 0) {
        const mse = resourceRows.find((r) => r.title.includes('MSE Master Study Guide'));
        targetDocId = mse ? mse.id : resourceRows[0].id;
      }
      if (targetDocId) {
        return { kind: 'study', documentId: targetDocId, page: 1 };
      }
      return { kind: 'home' };
    }

    // 3. Individual Subject Workspace: /subject/:subjectId or /subjects/:subjectId
    const subjectMatch = raw.match(/^\/(?:subject|subjects)\/([^/]+)/);
    if (subjectMatch) {
      const subjectId = decodeURIComponent(subjectMatch[1]);
      return { kind: 'subject', subjectId };
    }

    // 4. Saved Materials: /saved or /bookmarks
    if (raw === '/saved' || raw === '/bookmarks') {
      return { kind: 'saved' };
    }

    // 5. Secondary academic modal routes (display over home shelf):
    // /syllabus, /scheme, /analytics, /async-lab
    if (['/syllabus', '/scheme', '/analytics', '/async-lab'].includes(raw)) {
      return { kind: 'home' };
    }

    // 6. Home: / or /home or /subjects
    if (raw === '/' || raw === '/home' || raw === '/subjects') {
      return { kind: 'home' };
    }

    // 7. Unknown route -> Not Found
    return { kind: 'not-found' };
  }, [location.pathname, searchParams, resourceRows]);

  // --- Temporary UI state ----------------------------------------------------
  const [assistantScope, setAssistantScope] = useState<AssistantScope>({ mode: 'semester' });

  // Derived studyScope from URL or local override
  const [localScope, setLocalScope] = useState<StudyScopeKind | null>(null);

  const studyScope = useMemo<StudyScopeKind>(() => {
    if (localScope) return localScope;
    const scopeParam = searchParams.get('scope') as StudyScopeKind | null;
    if (scopeParam && ['document', 'subject', 'library'].includes(scopeParam)) {
      return scopeParam;
    }
    if (location.pathname === '/assistant') return 'library';
    return 'document';
  }, [localScope, searchParams, location.pathname]);

  const setStudyScope = useCallback(
    (scope: StudyScopeKind) => {
      setLocalScope(scope);
      if (view.kind === 'study') {
        const nextParams = new URLSearchParams(searchParams);
        if (scope !== 'document') {
          nextParams.set('scope', scope);
        } else {
          nextParams.delete('scope');
        }
        setSearchParams(nextParams, { replace: true });
      }
    },
    [view.kind, searchParams, setSearchParams]
  );

  // Derived viewerPage from URL or local override
  const [localPage, setLocalPage] = useState<number | null>(null);

  const viewerPage = useMemo<number | null>(() => {
    if (localPage !== null) return localPage;
    if (view.kind === 'study' && view.page !== undefined) {
      return view.page;
    }
    const pageParam = searchParams.get('page');
    return pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  }, [localPage, view, searchParams]);

  const setViewerPage = useCallback(
    (page: number | null) => {
      setLocalPage(page);
      if (view.kind === 'study' && page) {
        const currentParam = searchParams.get('page');
        const targetParam = page > 1 ? String(page) : null;
        if (currentParam !== targetParam) {
          const nextParams = new URLSearchParams(searchParams);
          if (targetParam) {
            nextParams.set('page', targetParam);
          } else {
            nextParams.delete('page');
          }
          setSearchParams(nextParams, { replace: true });
        }
      }
    },
    [view.kind, searchParams, setSearchParams]
  );

  const [viewerZoom, setViewerZoom] = useState<number>(100);
  const [taggedTarget, setTaggedTarget] = useState<TaggedFocusTarget | null>(null);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState<string | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
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

  // --- Route-Driven Navigation Handlers --------------------------------------
  const openHome = useCallback(() => {
    setSubjectSearch('');
    navigate('/');
  }, [navigate]);

  const openSubject = useCallback(
    (subjectId: string) => {
      setSubjectSearch('');
      navigate(`/subject/${encodeURIComponent(subjectId)}`);
    },
    [navigate]
  );

  const openStudyWorkspace = useCallback(
    (documentId: string, page?: number, scope: StudyScopeKind = 'document') => {
      setLocalScope(scope);
      setLocalPage(page ?? 1);
      setDetailResourceOverride(null);
      const params = new URLSearchParams();
      if (page && page > 1) params.set('page', String(page));
      if (scope && scope !== 'document') params.set('scope', scope);
      const qs = params.toString() ? `?${params.toString()}` : '';
      navigate(`/study/${encodeURIComponent(documentId)}${qs}`);
    },
    [navigate]
  );

  const switchStudyDocument = useCallback(
    (documentId: string, page?: number) => {
      setLocalPage(page ?? 1);
      const params = new URLSearchParams();
      if (page && page > 1) params.set('page', String(page));
      const currentScope = searchParams.get('scope');
      if (currentScope) params.set('scope', currentScope);
      const qs = params.toString() ? `?${params.toString()}` : '';
      navigate(`/study/${encodeURIComponent(documentId)}${qs}`, { replace: true });
    },
    [navigate, searchParams]
  );

  const openSaved = useCallback(() => {
    navigate('/saved');
  }, [navigate]);

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
        fileName: input.file.name,
        folderId: input.folderId ? asFolderId(input.folderId) : undefined,
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
        replaceFileName: input.replaceFile?.name,
        folderId: input.folderId !== undefined ? (input.folderId ? asFolderId(input.folderId) : null) : undefined,
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

  // --- Folder & Organization Operations -------------------------------------
  const moveToFolder = useCallback(
    async (id: string, folderId: string | null) => {
      try {
        await moveToFolderMut({
          id: asResourceId(id),
          folderId: folderId ? asFolderId(folderId) : null,
        });
        showToast(folderId ? 'Moved to folder' : 'Moved to Unorganized');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not move resource.');
      }
    },
    [moveToFolderMut, showToast]
  );

  const bulkMoveToFolder = useCallback(
    async (ids: string[], folderId: string | null): Promise<number> => {
      try {
        const moved = await bulkMoveToFolderMut({
          ids: ids.map(asResourceId),
          folderId: folderId ? asFolderId(folderId) : null,
        });
        showToast(folderId ? `Moved ${moved} item${moved === 1 ? '' : 's'} to folder` : `Moved ${moved} item${moved === 1 ? '' : 's'} to Unorganized`);
        return moved;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not move resources.');
        return 0;
      }
    },
    [bulkMoveToFolderMut, showToast]
  );

  const bulkDelete = useCallback(
    async (ids: string[]): Promise<number> => {
      try {
        const count = await bulkDeleteMut({
          ids: ids.map(asResourceId),
          ownerKey,
        });
        showToast(`Removed ${count} item${count === 1 ? '' : 's'}`);
        return count;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not delete resources.');
        return 0;
      }
    },
    [ownerKey, bulkDeleteMut, showToast]
  );

  const bulkUpdateTags = useCallback(
    async (ids: string[], addTags?: string[], removeTags?: string[]): Promise<number> => {
      try {
        const count = await bulkUpdateTagsMut({
          ids: ids.map(asResourceId),
          addTags,
          removeTags,
        });
        showToast(`Updated tags for ${count} item${count === 1 ? '' : 's'}`);
        return count;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not update tags.');
        return 0;
      }
    },
    [bulkUpdateTagsMut, showToast]
  );

  const createFolder = useCallback(
    async (subjectId: string, name: string, parentId?: string, color?: string): Promise<string> => {
      if (!semester) throw new Error('Semester not loaded yet.');
      const id = (await createFolderMut({
        subjectId: asSubjectId(subjectId),
        semesterId: asSemesterId(semester.id),
        name,
        parentId: parentId ? asFolderId(parentId) : undefined,
        color,
        ownerKey,
      })) as unknown as string;
      showToast(`Folder "${name}" created`);
      return id;
    },
    [semester, ownerKey, createFolderMut, showToast]
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      await renameFolderMut({ id: asFolderId(id), name });
      showToast(`Folder renamed to "${name}"`);
    },
    [renameFolderMut, showToast]
  );

  const moveFolder = useCallback(
    async (id: string, targetParentId: string | null) => {
      await moveFolderMut({
        id: asFolderId(id),
        targetParentId: targetParentId ? asFolderId(targetParentId) : null,
      });
      showToast('Folder position updated');
    },
    [moveFolderMut, showToast]
  );

  const removeFolder = useCallback(
    async (id: string) => {
      await removeFolderMut({ id: asFolderId(id) });
      showToast('Folder deleted (contents moved to Unorganized)');
    },
    [removeFolderMut, showToast]
  );

  // --- Overlays & Study Navigation ------------------------------------------
  const openUploadModal = useCallback((subjectId?: string, folderId?: string) => {
    setUploadSubjectId(subjectId ?? null);
    setUploadFolderId(folderId ?? null);
  }, []);
  const closeUploadModal = useCallback(() => {
    setUploadSubjectId(null);
    setUploadFolderId(null);
  }, []);

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
          navigate(`/assistant?subject=${encodeURIComponent(scope.subjectId)}`);
        }
      } else if (scope.mode === 'folder') {
        const match = resources.find((r) => r.folderId === scope.folderId) ?? resources[0];
        if (match) {
          openStudyWorkspace(match.id, undefined, 'folder');
        } else {
          navigate(`/assistant?folder=${encodeURIComponent(scope.folderId)}`);
        }
      } else if (scope.mode === 'selected') {
        const match = resources.find((r) => scope.resourceIds.includes(r.id)) ?? resources[0];
        if (match) {
          openStudyWorkspace(match.id, undefined, 'selected');
        } else {
          navigate('/assistant');
        }
      } else {
        const match = resources.find((r) => r.title.includes('MSE Master Study Guide')) ?? resources[0];
        if (match) {
          openStudyWorkspace(match.id, undefined, 'library');
        } else {
          navigate('/assistant');
        }
      }
    },
    [resources, openStudyWorkspace, navigate]
  );

  const tagCurrentPage = useCallback(() => {
    if (!activeDocumentId) return;
    const doc = resources.find((r) => r.id === activeDocumentId);
    if (!doc) return;
    const pageNum = viewerPage ?? 1;
    const unit = doc.fileKind === 'pptx' || doc.fileKind === 'ppt' ? 'Slide' : 'Page';
    setTaggedTarget({
      resourceId: doc.id,
      resourceTitle: doc.title,
      page: pageNum,
      fileKind: doc.fileKind,
    });
    showToast(`Tagged ${unit} ${pageNum} of "${doc.title}". AI will explain strictly this.`);
  }, [activeDocumentId, resources, viewerPage, showToast]);

  const tagCurrentDocument = useCallback(() => {
    if (!activeDocumentId) return;
    const doc = resources.find((r) => r.id === activeDocumentId);
    if (!doc) return;
    setTaggedTarget({
      resourceId: doc.id,
      resourceTitle: doc.title,
      page: null,
      fileKind: doc.fileKind,
    });
    showToast(`Tagged "${doc.title}". AI will explain strictly this document.`);
  }, [activeDocumentId, resources, showToast]);

  const clearTaggedTarget = useCallback(() => {
    setTaggedTarget(null);
    showToast('Removed tagged focus. Returned to general study scope.');
  }, [showToast]);

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
      openSaved,
      activeDocumentId,
      studyScope,
      setStudyScope,
      viewerPage,
      setViewerPage,
      viewerZoom,
      setViewerZoom,
      openAssistant,
      assistantScope,
      taggedTarget,
      setTaggedTarget,
      tagCurrentPage,
      tagCurrentDocument,
      clearTaggedTarget,
      subjectSearch,
      setSubjectSearch,
      uploadSubjectId,
      uploadFolderId,
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
      moveToFolder,
      bulkMoveToFolder,
      bulkDelete,
      bulkUpdateTags,
      createFolder,
      renameFolder,
      moveFolder,
      removeFolder,
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
      openSaved,
      activeDocumentId,
      studyScope,
      setStudyScope,
      viewerPage,
      setViewerPage,
      viewerZoom,
      openAssistant,
      assistantScope,
      taggedTarget,
      setTaggedTarget,
      tagCurrentPage,
      tagCurrentDocument,
      clearTaggedTarget,
      subjectSearch,
      uploadSubjectId,
      uploadFolderId,
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
      moveToFolder,
      bulkMoveToFolder,
      bulkDelete,
      bulkUpdateTags,
      createFolder,
      renameFolder,
      moveFolder,
      removeFolder,
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
