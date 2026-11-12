import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { StudyResource, SubjectOption, SchemeCourse, ResourceType, ActiveTab, ResourceUploadInput, ResourceEditInput, NewSubjectInput, SemesterInfo } from '../types';
import { getOwnerKey } from '../lib/owner';
import { asResourceId, asSemesterId, asStorageId, asSubjectId } from '../lib/convexIds';
import { apiService } from '../services/apiService';

/**
 * Data lives in Convex (resources, subjects, semesters, bookmarks, ratings).
 * This context keeps the temporary UI state — tab, search, filters — and
 * exposes typed wrappers around the Convex functions the UI needs.
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

  // Temporary UI state (session-local by design)
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSubject: string | 'All';
  setSelectedSubject: (subject: string | 'All') => void;
  selectedType: ResourceType | 'All';
  setSelectedType: (type: ResourceType | 'All') => void;
  filteredResources: StudyResource[];

  // Actions
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  downloadResource: (resource: StudyResource) => Promise<void>;
  addResource: (input: ResourceUploadInput) => Promise<void>;
  updateResource: (id: string, input: ResourceEditInput) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string | 'All'>('All');
  const [selectedType, setSelectedType] = useState<ResourceType | 'All'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

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

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.courseCode.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        item.uploadedBy.toLowerCase().includes(q);

      const matchesSubject = selectedSubject === 'All' || item.subjectName === selectedSubject;
      const matchesType = selectedType === 'All' || item.type === selectedType;

      return matchesSearch && matchesSubject && matchesType;
    });
  }, [resources, searchQuery, selectedSubject, selectedType]);

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

  const uploadFileToStorage = useCallback(
    async (file: File): Promise<string> => {
      const uploadUrl = await generateUploadUrlMut({});
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/pdf' },
        body: file
      });
      if (!response.ok) {
        throw new Error(`File upload failed (HTTP ${response.status}).`);
      }
      const { storageId } = (await response.json()) as { storageId: string };
      return storageId;
    },
    [generateUploadUrlMut]
  );

  const addResource = useCallback(
    async (input: ResourceUploadInput) => {
      if (!semester) throw new Error('The library is still loading. Please try again in a moment.');
      const storageId = await uploadFileToStorage(input.file);
      await createResourceMut({
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
      });
      showToast(`PDF Resource "${input.title.slice(0, 24)}..." published!`);
    },
    [semester, ownerKey, uploadFileToStorage, createResourceMut, showToast]
  );

  const updateResource = useCallback(
    async (id: string, input: ResourceEditInput) => {
      let replaceStorageId: string | undefined;
      if (input.replaceFile) {
        replaceStorageId = await uploadFileToStorage(input.replaceFile);
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
    [ownerKey, uploadFileToStorage, updateResourceMut, showToast]
  );

  const deleteResource = useCallback(
    async (id: string) => {
      try {
        await removeResourceMut({ id: asResourceId(id), ownerKey });
        showToast('Resource removed successfully');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not delete this resource.');
      }
    },
    [ownerKey, removeResourceMut, showToast]
  );

  const downloadResource = useCallback(
    async (resource: StudyResource) => {
      try {
        const result = await downloadMut({ id: asResourceId(resource.id) });
        if (result) {
          // Stored PDF: fetch the signed URL and hand the real file to the user.
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
    [downloadMut, showToast]
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
      showToast(isArchived ? 'Course archived — hidden from the library.' : 'Course restored to the library.');
    },
    [setSubjectArchivedMut, showToast]
  );

  const value = useMemo(
    () => ({
      resources,
      subjects,
      schemeCourses,
      semester: semester ?? null,
      isLibraryLoading,
      bookmarkIds,
      bookmarkCount: bookmarkIds.length,
      activeTab,
      setActiveTab,
      searchQuery,
      setSearchQuery,
      selectedSubject,
      setSelectedSubject,
      selectedType,
      setSelectedType,
      filteredResources,
      toggleBookmark,
      isBookmarked,
      downloadResource,
      addResource,
      updateResource,
      deleteResource,
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
      activeTab,
      searchQuery,
      selectedSubject,
      selectedType,
      filteredResources,
      toggleBookmark,
      isBookmarked,
      downloadResource,
      addResource,
      updateResource,
      deleteResource,
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
