import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { useResources } from '../context/ResourceContext';
import { downloadResourcesAsZip } from '../lib/zipDownload';
import { SYLLABUS_MODULES } from '../data/syllabusData';
import { asSubjectId } from '../lib/convexIds';
import { getOwnerKey } from '../lib/owner';
import type { StudyResource, MoreSheetKind, ResourceType, Folder } from '../types';
import {
  ArrowLeft,
  ArrowUp,
  Download,
  FileText,
  Presentation,
  Bookmark,
  RotateCcw,
  Sparkles,
  PlusCircle,
  Layers,
  LoaderCircle,
  Folder as FolderIcon,
  FolderPlus,
  FolderOpen,
  FolderInput,
  Edit2,
  Trash2,
  Check,
  X,
  Tag,
  CheckSquare,
  Square,
  ChevronRight,
  Search,
  MoreVertical,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  File
} from 'lucide-react';

const CATEGORIES: Array<{ label: string; type: ResourceType | 'ALL' }> = [
  { label: 'All Categories', type: 'ALL' },
  { label: 'Lecture Notes', type: 'Lecture Notes' },
  { label: 'Past Papers / PYQs', type: 'Past Exam Papers' },
  { label: 'Lab Manuals', type: 'Lab Manual' },
  { label: 'Cheat Sheets', type: 'Cheat Sheet' },
  { label: 'Reference Books', type: 'Reference Book' }
];

/** Clean Ingestion mark */
const IngestMark: React.FC<{ resource: StudyResource }> = ({ resource }) => {
  if (!resource.hasFile) return null;
  if (resource.ingestStatus === 'ready') {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-lime-text font-semibold"
        title={`Indexed: ${resource.chunkCount ?? 0} vector chunks ready for AI queries`}
      >
        <span className="w-1.5 h-1.5 rounded-none bg-lime-deep inline-block shrink-0" aria-hidden="true" />
        <span>Indexed</span>
      </span>
    );
  }
  if (resource.ingestStatus === 'failed') {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-alert font-semibold"
        title={resource.ingestError ?? 'Vector indexing failed'}
      >
        <span className="w-1.5 h-1.5 rounded-none bg-alert inline-block shrink-0" aria-hidden="true" />
        <span>Failed</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3 font-semibold"
      title="Extracting pages & generating embeddings in background"
    >
      <LoaderCircle className="w-3 h-3 animate-spin text-lime-deep shrink-0" aria-hidden="true" />
      <span>Indexing</span>
    </span>
  );
};

interface FolderTreeNode {
  folder: Folder;
  depth: number;
}

/** Recursively build an indented tree of folders */
const buildFolderTree = (
  allFolders: Folder[],
  parentId: string | null = null,
  depth = 0,
  excludeIds = new Set<string>()
): FolderTreeNode[] => {
  const result: FolderTreeNode[] = [];
  const children = allFolders.filter((f) => (f.parentId ?? null) === parentId);
  for (const child of children) {
    if (excludeIds.has(child.id)) continue;
    result.push({ folder: child, depth });
    result.push(...buildFolderTree(allFolders, child.id, depth + 1, excludeIds));
  }
  return result;
};

/** Get all descendant IDs of a folder to avoid circular nesting */
const getDescendantFolderIds = (folderId: string, allFolders: Folder[]): Set<string> => {
  const descendants = new Set<string>();
  const queue = [folderId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.add(current);
    for (const f of allFolders) {
      if (f.parentId === current && !descendants.has(f.id)) {
        queue.push(f.id);
      }
    }
  }
  return descendants;
};

type SortField = 'name' | 'type' | 'size' | 'date';
type SortDirection = 'asc' | 'desc';

interface SubjectPageProps {
  subjectId: string;
  onOpenSheet: (kind: MoreSheetKind) => void;
}

export const SubjectPage: React.FC<SubjectPageProps> = ({ subjectId }) => {
  const {
    subjects,
    resources,
    schemeCourses,
    isLibraryLoading,
    openHome,
    openAssistant,
    openDetail,
    openUploadModal,
    collectDownloadArtifact,
    downloadResource,
    toggleBookmark,
    isBookmarked,
    reindexResource,
    updateResource,
    deleteResource,
    createFolder,
    renameFolder,
    moveFolder,
    removeFolder,
    moveToFolder,
    bulkMoveToFolder,
    bulkDelete,
    showToast
  } = useResources();

  const ownerKey = getOwnerKey();
  const [searchParams, setSearchParams] = useSearchParams();

  // Queries
  const rawFolders = useQuery(
    api.folders.listBySubject,
    subjectId ? { subjectId: asSubjectId(subjectId) } : 'skip'
  );
  const folders = useMemo(() => (rawFolders ?? []) as Folder[], [rawFolders]);

  // Map of folder id -> folder
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

  // Current Directory Location from URL (enables natural Back/Forward history & sharing)
  const currentFolderId = useMemo(() => {
    const f = searchParams.get('folder');
    if (!f || f === 'unorganized' || f === 'root') return null;
    return f;
  }, [searchParams]);

  const isUnorganizedView = useMemo(() => {
    return searchParams.get('folder') === 'unorganized';
  }, [searchParams]);

  const activeFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return folderMap.get(currentFolderId) ?? null;
  }, [folderMap, currentFolderId]);

  // Navigation handlers
  const navigateToFolder = useCallback(
    (folderId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('folder', folderId);
        return next;
      });
    },
    [setSearchParams]
  );

  const navigateToUnorganized = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('folder', 'unorganized');
      return next;
    });
  }, [setSearchParams]);

  const navigateToRoot = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('folder');
      return next;
    });
  }, [setSearchParams]);

  // Step Up one level to parent directory
  const navigateToParent = useCallback(() => {
    if (isUnorganizedView) {
      navigateToRoot();
      return;
    }
    if (!currentFolderId) return;
    const cur = folderMap.get(currentFolderId);
    if (cur?.parentId) {
      navigateToFolder(cur.parentId);
    } else {
      navigateToRoot();
    }
  }, [isUnorganizedView, currentFolderId, folderMap, navigateToFolder, navigateToRoot]);

  // Breadcrumbs calculation from root down to active folder
  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) return [];
    const crumbs: Folder[] = [];
    let curId: string | null = currentFolderId;
    const seen = new Set<string>();
    while (curId && !seen.has(curId)) {
      seen.add(curId);
      const f = folderMap.get(curId);
      if (!f) break;
      crumbs.unshift(f);
      curId = f.parentId ?? null;
    }
    return crumbs;
  }, [currentFolderId, folderMap]);

  // Redirect if invalid folder ID in URL
  useEffect(() => {
    if (currentFolderId && rawFolders !== undefined) {
      const exists = folders.some((f) => f.id === currentFolderId);
      if (!exists) {
        navigateToRoot();
      }
    }
  }, [currentFolderId, folders, rawFolders, navigateToRoot]);

  // View state: 'materials' | 'syllabus' | 'scheme'
  const [activeTab, setActiveTab] = useState<'materials' | 'syllabus' | 'scheme'>('materials');

  // File Manager View Options: List vs Grid (persisted in localStorage)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      return (localStorage.getItem('studysyncplus_file_view_mode') as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleSetViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('studysyncplus_file_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // Search & Filter state
  const [subjectSearch, setSubjectSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'current' | 'subject'>('current');
  const [selectedCategory, setSelectedCategory] = useState<ResourceType | 'ALL'>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<'ALL' | 'pdf' | 'ppt'>('ALL');
  const [selectedIndexStatus, setSelectedIndexStatus] = useState<'ALL' | 'ready' | 'processing' | 'failed'>('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagBar, setShowTagBar] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Multi-selection state
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'folder' | 'resource';
    folder?: Folder;
    resource?: StudyResource;
  } | null>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Modals
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');
  const [movingFolder, setMovingFolder] = useState<Folder | null>(null);
  const [movingFolderTargetId, setMovingFolderTargetId] = useState('');
  const [deleteConfirmFolder, setDeleteConfirmFolder] = useState<Folder | null>(null);
  const [deleteFolderMode, setDeleteFolderMode] = useState<'move' | 'deleteFiles'>('move');
  const [renamingResource, setRenamingResource] = useState<StudyResource | null>(null);
  const [renamingResourceTitle, setRenamingResourceTitle] = useState('');
  const [quickMoveResource, setQuickMoveResource] = useState<StudyResource | null>(null);
  const [deleteConfirmResource, setDeleteConfirmResource] = useState<StudyResource | null>(null);
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState('');
  const [activeModuleNumber, setActiveModuleNumber] = useState(SYLLABUS_MODULES[0].moduleNumber);

  // Bulk ZIP state
  const [zipState, setZipState] = useState<{ busy: boolean; done: number; total: number }>({
    busy: false,
    done: 0,
    total: 0
  });

  const subject = subjects.find((s) => s.id === subjectId);
  const own = useMemo(() => resources.filter((r) => r.subjectId === subjectId), [resources, subjectId]);
  const scheme = schemeCourses.find((c) => c.id === subjectId);

  // Unorganized resources count
  const unorganizedCount = useMemo(() => {
    return own.filter((r) => !r.folderId).length;
  }, [own]);

  // Indented folder tree for modals
  const folderTree = useMemo(() => {
    return buildFolderTree(folders, null, 0);
  }, [folders]);

  // Invalid targets when moving a folder
  const invalidMoveTargets = useMemo(() => {
    if (!movingFolder) return new Set<string>();
    return getDescendantFolderIds(movingFolder.id, folders);
  }, [movingFolder, folders]);

  // 1. Folders in current directory view
  const directoryFolders = useMemo(() => {
    if (isUnorganizedView) return [];
    if (searchScope === 'subject' && subjectSearch.trim()) {
      const q = subjectSearch.trim().toLowerCase();
      return folders.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (!currentFolderId) {
      return folders.filter((f) => !f.parentId);
    }
    return folders.filter((f) => f.parentId === currentFolderId);
  }, [folders, currentFolderId, isUnorganizedView, searchScope, subjectSearch]);

  // 2. Files in current directory view (STRICT DIRECTORY CONTENTS - NO DUPLICATE ALL-MATERIALS LIST)
  const directoryResources = useMemo(() => {
    let list: StudyResource[] = [];

    if (searchScope === 'subject' && subjectSearch.trim()) {
      // Searching across entire course
      const q = subjectSearch.trim().toLowerCase();
      list = own.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.uploadedBy.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    } else {
      // Local directory scope
      if (isUnorganizedView) {
        list = own.filter((r) => !r.folderId);
      } else if (currentFolderId) {
        list = own.filter((r) => r.folderId === currentFolderId);
      } else {
        // AT ROOT: Show ONLY loose files (files without a folder)!
        list = own.filter((r) => !r.folderId);
      }

      // Filter within directory by search query if present
      const q = subjectSearch.trim().toLowerCase();
      if (q) {
        list = list.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.uploadedBy.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
    }

    // Apply category, format, indexing status, tags
    if (selectedCategory !== 'ALL') {
      list = list.filter((r) => r.type === selectedCategory);
    }
    if (selectedFormat === 'pdf') {
      list = list.filter((r) => r.fileKind === 'pdf');
    } else if (selectedFormat === 'ppt') {
      list = list.filter((r) => r.fileKind === 'ppt' || r.fileKind === 'pptx');
    }
    if (selectedIndexStatus === 'ready') {
      list = list.filter((r) => r.ingestStatus === 'ready');
    } else if (selectedIndexStatus === 'processing') {
      list = list.filter((r) => r.ingestStatus === 'processing' || r.ingestStatus === 'pending');
    } else if (selectedIndexStatus === 'failed') {
      list = list.filter((r) => r.ingestStatus === 'failed');
    }
    if (selectedTags.length > 0) {
      list = list.filter((r) => selectedTags.every((t) => r.tags.includes(t)));
    }

    // Sort files
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === 'date') {
        cmp = (b.uploadDate || '').localeCompare(a.uploadDate || '');
      } else if (sortField === 'size') {
        cmp = (a.fileSizeBytes || 0) - (b.fileSizeBytes || 0);
      } else if (sortField === 'type') {
        cmp = a.type.localeCompare(b.type);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [
    own,
    currentFolderId,
    isUnorganizedView,
    searchScope,
    subjectSearch,
    selectedCategory,
    selectedFormat,
    selectedIndexStatus,
    selectedTags,
    sortField,
    sortDirection
  ]);

  // Unique tags across subject
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const r of own) {
      if (Array.isArray(r.tags)) {
        for (const t of r.tags) {
          if (t && t.trim()) tagSet.add(t.trim());
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [own]);

  // User uploaded resources in selection
  const userUploadedSelectedIds = useMemo(() => {
    return Array.from(selectedResourceIds).filter((id) => {
      const res = own.find((r) => r.id === id);
      return res && res.isUserUploaded && res.ownerKey === ownerKey;
    });
  }, [selectedResourceIds, own, ownerKey]);

  // Multi-select handlers
  const handleToggleSelect = (id: string) => {
    setSelectedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedResourceIds.size === directoryResources.length && directoryResources.length > 0) {
      setSelectedResourceIds(new Set());
    } else {
      setSelectedResourceIds(new Set(directoryResources.map((r) => r.id)));
    }
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Open Context Menu handler
  const handleOpenContextMenu = (
    e: React.MouseEvent,
    type: 'folder' | 'resource',
    item: Folder | StudyResource
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    if (type === 'folder') {
      setContextMenu({ x, y, type: 'folder', folder: item as Folder });
    } else {
      setContextMenu({ x, y, type: 'resource', resource: item as StudyResource });
    }
  };

  // Folder Actions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const newId = await createFolder(
        subjectId,
        newFolderName.trim(),
        newFolderParentId ? newFolderParentId : undefined
      );
      setNewFolderName('');
      setNewFolderParentId('');
      setNewFolderOpen(false);
      navigateToFolder(newId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create folder.');
    }
  };

  const handleSaveRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFolder || !renamingFolderName.trim()) return;
    try {
      await renameFolder(renamingFolder.id, renamingFolderName.trim());
      setRenamingFolder(null);
      setRenamingFolderName('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not rename folder.');
    }
  };

  const handlePerformMoveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingFolder) return;
    try {
      const target = movingFolderTargetId === '' ? null : movingFolderTargetId;
      await moveFolder(movingFolder.id, target);
      setMovingFolder(null);
      setMovingFolderTargetId('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not move folder.');
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deleteConfirmFolder) return;
    try {
      if (deleteFolderMode === 'deleteFiles') {
        const filesToDelete = own
          .filter(
            (r) =>
              r.folderId === deleteConfirmFolder.id &&
              r.isUserUploaded &&
              r.ownerKey === ownerKey
          )
          .map((r) => r.id);
        if (filesToDelete.length > 0) {
          await bulkDelete(filesToDelete);
        }
      }
      await removeFolder(deleteConfirmFolder.id);
      if (currentFolderId === deleteConfirmFolder.id) {
        navigateToParent();
      }
      setDeleteConfirmFolder(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete folder.');
    }
  };

  // File Actions
  const handleSaveRenameResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingResource || !renamingResourceTitle.trim()) return;
    try {
      await updateResource(renamingResource.id, {
        title: renamingResourceTitle.trim()
      });
      setRenamingResource(null);
      setRenamingResourceTitle('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not rename file.');
    }
  };

  const handlePerformQuickMove = async (targetFolderId: string | null) => {
    if (!quickMoveResource) return;
    try {
      await moveToFolder(quickMoveResource.id, targetFolderId);
      setQuickMoveResource(null);
      showToast('File moved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not move file.');
    }
  };

  const handleConfirmDeleteResource = async () => {
    if (!deleteConfirmResource) return;
    try {
      await deleteResource(deleteConfirmResource.id);
      setSelectedResourceIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteConfirmResource.id);
        return next;
      });
      setDeleteConfirmResource(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete file.');
    }
  };

  // Selected ZIP Download
  const handleDownloadSelectedZip = async () => {
    if (selectedResourceIds.size === 0 || zipState.busy || !subject) return;
    const selectedItems = own.filter((r) => selectedResourceIds.has(r.id));
    setZipState({ busy: true, done: 0, total: selectedItems.length });
    try {
      await downloadResourcesAsZip(
        `${subject.name}_Selected`,
        subject.courseCode,
        selectedItems,
        collectDownloadArtifact,
        (done, total) => setZipState({ busy: true, done, total })
      );
      showToast(`Downloaded ${selectedItems.length} selected files.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not generate ZIP archive.');
    } finally {
      setZipState({ busy: false, done: 0, total: 0 });
    }
  };

  // Bulk Delete
  const handleDeleteSelected = async () => {
    if (userUploadedSelectedIds.length === 0) {
      showToast('No user-uploaded resources selected.');
      return;
    }
    const confirmed = window.confirm(
      `Delete ${userUploadedSelectedIds.length} user-uploaded resource${userUploadedSelectedIds.length === 1 ? '' : 's'}?`
    );
    if (!confirmed) return;
    await bulkDelete(userUploadedSelectedIds);
    setSelectedResourceIds((prev) => {
      const next = new Set(prev);
      for (const id of userUploadedSelectedIds) next.delete(id);
      return next;
    });
  };

  // Full Subject ZIP
  const handleZipAll = async () => {
    if (zipState.busy || own.length === 0 || !subject) return;
    setZipState({ busy: true, done: 0, total: own.length });
    try {
      await downloadResourcesAsZip(
        subject.name,
        subject.courseCode,
        own,
        collectDownloadArtifact,
        (done, total) => setZipState({ busy: true, done, total })
      );
      showToast(`Subject course file downloaded (${own.length} items).`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not generate ZIP archive.');
    } finally {
      setZipState({ busy: false, done: 0, total: 0 });
    }
  };

  const askSubject = () => openAssistant({ mode: 'subject', subjectId });
  const askActiveFolder = () => {
    if (!activeFolder) return;
    openAssistant({
      mode: 'folder',
      folderId: activeFolder.id,
      folderName: activeFolder.name,
      subjectId
    });
  };

  if (isLibraryLoading) {
    return (
      <div className="flex-1 flex flex-col p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-paper-sunk w-64 border border-rule" />
        <div className="h-4 bg-paper-sunk w-96 border border-rule" />
        <div className="h-64 bg-paper-sunk border border-rule mt-6" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] bg-paper">
        <div className="border border-ink bg-paper p-8 max-w-md w-full shadow-xs">
          <span className="stamp stamp-alert font-mono mb-3 inline-block">Subject Not Found</span>
          <h2 className="text-base font-bold text-ink mb-1.5">Course not in active curriculum</h2>
          <p className="text-xs text-ink-2 mb-6 leading-relaxed">
            The course identifier does not match any active subject.
          </p>
          <button onClick={openHome} className="btn btn-secondary w-full justify-center">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to All Subjects</span>
          </button>
        </div>
      </div>
    );
  }

  const indexedCount = own.filter((r) => r.ingestStatus === 'ready').length;
  const activeModule = SYLLABUS_MODULES.find((m) => m.moduleNumber === activeModuleNumber) ?? SYLLABUS_MODULES[0];

  return (
    <div className="px-4 sm:px-8 pb-32 md:pb-24 animate-fadeIn max-w-7xl mx-auto">
      {/* Mobile Back Link */}
      <button
        onClick={openHome}
        className="md:hidden flex items-center gap-1.5 pt-4 pb-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>All Subjects</span>
      </button>

      {/* Subject Header */}
      <header className="pt-6 sm:pt-8 pb-6 border-b border-ink">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span className="stamp stamp-ink font-mono text-[11px]">{subject.courseCode}</span>
          {scheme && <span className="stamp stamp-outline text-[11px] font-bold">{scheme.credits} Credits</span>}
          {scheme && <span className="stamp stamp-outline text-[11px] hidden sm:inline-flex">{scheme.category}</span>}
          <span className="stamp stamp-verified bg-lime text-ink text-[10px] hidden sm:inline-flex">Official Course File</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-[2.2rem] sm:text-[3rem] font-black tracking-[-0.03em] leading-[1.04] text-ink">
              {subject.name}
            </h1>
            <p className="font-mono text-[12px] text-ink-2 tabular mt-2.5 flex items-center gap-2 flex-wrap">
              <span>{own.length} {own.length === 1 ? 'material' : 'materials'}</span>
              <span>·</span>
              <span className="text-lime-text font-bold">{indexedCount} indexed for AI</span>
              <span>·</span>
              <span>{folders.length} {folders.length === 1 ? 'folder' : 'folders'}</span>
              {scheme && (
                <>
                  <span>·</span>
                  <span>CL {scheme.cl} / TL {scheme.tl} / LL {scheme.ll} · {scheme.nh}h total</span>
                </>
              )}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => openUploadModal(subjectId, currentFolderId ?? undefined)}
              className="btn btn-primary px-4"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Upload Material</span>
            </button>

            <button
              onClick={() => void handleZipAll()}
              disabled={zipState.busy || own.length === 0}
              className="btn btn-secondary px-3.5"
              title="Download all subject files in a clean ZIP"
            >
              {zipState.busy ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="tabular">Packing {zipState.done}/{zipState.total}…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download All (ZIP)</span>
                </>
              )}
            </button>

            <button onClick={askSubject} className="btn btn-secondary px-3.5" title="Ask Study Assistant about this subject">
              <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
              <span>Ask Subject AI</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-6 flex items-center gap-1 border-b border-rule pt-2">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] border-b-2 transition-colors ${
              activeTab === 'materials'
                ? 'border-ink text-ink bg-paper'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            File Manager ({own.length})
          </button>
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] border-b-2 transition-colors ${
              activeTab === 'syllabus'
                ? 'border-ink text-ink bg-paper'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Syllabus &amp; Viva Map
          </button>
          {scheme && (
            <button
              onClick={() => setActiveTab('scheme')}
              className={`px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] border-b-2 transition-colors ${
                activeTab === 'scheme'
                  ? 'border-ink text-ink bg-paper'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              Course Scheme
            </button>
          )}
        </div>
      </header>

      {/* Main Study Materials File Manager View */}
      {activeTab === 'materials' && (
        <section className="pt-6 space-y-4">
          {/* 1. Breadcrumbs & Directory Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-paper border border-rule">
            {/* Interactive Breadcrumb Trail with Drop Targets & Up Button */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {/* Up to Parent Button (Active when not at root) */}
              {(currentFolderId || isUnorganizedView) && (
                <button
                  type="button"
                  onClick={navigateToParent}
                  className="btn btn-secondary px-2 py-1 text-xs font-mono mr-1 flex items-center gap-1"
                  title="Go up to parent folder"
                >
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Up</span>
                </button>
              )}

              {/* Course Root Crumb */}
              <button
                type="button"
                onClick={navigateToRoot}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverFolderId('CRUMB_ROOT');
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverFolderId(null);
                  const resId =
                    e.dataTransfer.getData('application/x-resource-id') ||
                    e.dataTransfer.getData('text/plain');
                  if (resId) {
                    await moveToFolder(resId, null);
                    showToast('Moved file to Subject Root (Unorganized)');
                  }
                }}
                className={`font-mono text-xs transition-colors flex items-center gap-1.5 px-2 py-1 ${
                  dragOverFolderId === 'CRUMB_ROOT'
                    ? 'border-2 border-lime bg-lime-wash text-ink font-bold'
                    : !currentFolderId && !isUnorganizedView
                    ? 'font-bold text-ink bg-paper-sunk border border-rule'
                    : 'text-ink-2 hover:text-ink hover:underline'
                }`}
                title="Navigate to course root"
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{subject.name}</span>
              </button>

              {isUnorganizedView && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                  <span className="font-mono text-xs font-bold text-ink bg-paper-sunk px-2 py-1 border border-rule flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                    <span>Unorganized Materials</span>
                  </span>
                </>
              )}

              {breadcrumbs.map((crumb, idx) => {
                const isCurrent = idx === breadcrumbs.length - 1;
                const isDropTarget = dragOverFolderId === `CRUMB_${crumb.id}`;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => navigateToFolder(crumb.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverFolderId(`CRUMB_${crumb.id}`);
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragOverFolderId(null);
                        const resId =
                          e.dataTransfer.getData('application/x-resource-id') ||
                          e.dataTransfer.getData('text/plain');
                        if (resId) {
                          await moveToFolder(resId, crumb.id);
                          showToast(`Moved file to "${crumb.name}"`);
                        }
                      }}
                      className={`font-mono text-xs transition-colors flex items-center gap-1 px-2 py-1 ${
                        isDropTarget
                          ? 'border-2 border-lime bg-lime-wash text-ink font-bold'
                          : isCurrent
                          ? 'font-bold text-ink bg-paper-sunk border border-rule'
                          : 'text-ink-2 hover:text-ink hover:underline'
                      }`}
                      title={`Navigate to ${crumb.name}`}
                    >
                      <FolderIcon className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                      <span>{crumb.name}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Directory Controls Right */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {activeFolder && (
                <button
                  type="button"
                  onClick={askActiveFolder}
                  className="btn btn-secondary px-2.5 py-1 text-xs font-mono flex items-center gap-1 text-ink"
                  title={`Ask Study Assistant about materials in ${activeFolder.name}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
                  <span>Ask Folder AI</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setNewFolderParentId(currentFolderId ?? '');
                  setNewFolderOpen(true);
                }}
                className="btn btn-secondary px-3 py-1 text-xs font-mono flex items-center gap-1.5 border-ink hover:bg-lime-wash"
              >
                <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{currentFolderId ? 'New Subfolder' : 'New Folder'}</span>
              </button>

              <button
                type="button"
                onClick={() => openUploadModal(subjectId, currentFolderId ?? undefined)}
                className="btn btn-primary px-3 py-1 text-xs font-mono flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Upload File</span>
              </button>

              {/* View Mode Toggle: List vs Grid */}
              <div className="flex items-center border border-rule ml-1">
                <button
                  type="button"
                  onClick={() => handleSetViewMode('list')}
                  className={`p-1.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-ink text-paper'
                      : 'bg-paper text-ink-3 hover:text-ink'
                  }`}
                  title="List view"
                  aria-label="List view"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode('grid')}
                  className={`p-1.5 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-ink text-paper'
                      : 'bg-paper text-ink-3 hover:text-ink'
                  }`}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. File Manager Filter & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 bg-paper border border-rule text-xs">
            {/* Search Input with Scope Selector */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[260px]">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-paper-sunk border border-rule flex-1">
                <Search className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
                <input
                  type="search"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder={
                    searchScope === 'subject'
                      ? 'Search all materials in course…'
                      : activeFolder
                      ? `Search in “${activeFolder.name}”…`
                      : 'Search in this folder…'
                  }
                  aria-label="Search materials"
                  className="w-full bg-transparent text-xs text-ink placeholder:text-ink-3 focus:outline-none"
                />
                {subjectSearch && (
                  <button
                    onClick={() => setSubjectSearch('')}
                    className="p-0.5 text-ink-3 hover:text-ink"
                    aria-label="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Scope Switcher (Current folder vs Entire Subject) */}
              <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value as 'current' | 'subject')}
                aria-label="Search scope"
                className="field text-xs py-1.5 pl-2.5 pr-8 bg-paper-sunk border border-rule text-ink cursor-pointer font-mono"
              >
                <option value="current">Current folder</option>
                <option value="subject">Entire course</option>
              </select>
            </div>

            {/* Filter Dropdowns in One Clean Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Select */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ResourceType | 'ALL')}
                aria-label="Filter by material category"
                className="field text-xs py-1.5 pl-2.5 pr-8 bg-paper-sunk border border-rule text-ink cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.type} value={cat.type}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {/* Format Select */}
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as 'ALL' | 'pdf' | 'ppt')}
                aria-label="Filter by file format"
                className="field text-xs py-1.5 pl-2.5 pr-8 bg-paper-sunk border border-rule text-ink cursor-pointer"
              >
                <option value="ALL">All Formats</option>
                <option value="pdf">PDF only</option>
                <option value="ppt">PowerPoint (PPT/PPTX)</option>
              </select>

              {/* Indexing Status Select */}
              <select
                value={selectedIndexStatus}
                onChange={(e) => setSelectedIndexStatus(e.target.value as 'ALL' | 'ready' | 'processing' | 'failed')}
                aria-label="Filter by AI indexing status"
                className="field text-xs py-1.5 pl-2.5 pr-8 bg-paper-sunk border border-rule text-ink cursor-pointer"
              >
                <option value="ALL">All Index States</option>
                <option value="ready">Indexed for AI</option>
                <option value="processing">Indexing…</option>
                <option value="failed">Index Failed</option>
              </select>

              {/* Tags Drawer Toggle */}
              {availableTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTagBar((v) => !v)}
                  className={`btn px-2.5 py-1.5 text-xs font-mono flex items-center gap-1 border transition-colors ${
                    showTagBar || selectedTags.length > 0
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper text-ink-2 border-rule hover:border-ink hover:text-ink'
                  }`}
                  title="Toggle tag filter drawer"
                >
                  <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tags {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}</span>
                </button>
              )}

              {/* Directory Count */}
              <div className="font-mono text-[11px] text-ink-3 pl-1 shrink-0 tabular">
                <span className="text-ink font-bold">{directoryResources.length}</span> files
                {directoryFolders.length > 0 && (
                  <span> · <strong className="text-ink">{directoryFolders.length}</strong> folders</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Secondary Tag Drawer (when active) */}
          {showTagBar && availableTags.length > 0 && (
            <div className="p-3 bg-paper-sunk border border-rule flex items-center gap-1.5 flex-wrap text-xs animate-fadeIn">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3 shrink-0 mr-1">
                Filter by tag:
              </span>
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`px-2 py-0.5 font-mono text-[10.5px] transition-colors border ${
                      active
                        ? 'bg-lime text-ink border-lime font-bold'
                        : 'bg-paper text-ink-2 border-rule hover:border-ink hover:text-ink'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-[10px] font-mono text-ink-3 hover:text-alert underline underline-offset-2 ml-2"
                >
                  Clear tags
                </button>
              )}
            </div>
          )}

          {/* 4. Active Location Notice if in Unorganized */}
          {isUnorganizedView && (
            <div className="p-3.5 bg-paper-sunk border border-rule flex items-center justify-between gap-3 text-xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-ink-3 shrink-0" aria-hidden="true" />
                <span className="text-ink-2">
                  Showing <strong>{unorganizedCount}</strong> loose materials not filed into any folder.
                  Drag rows onto folder cards or select files to bulk move them.
                </span>
              </div>
              <button
                type="button"
                onClick={navigateToRoot}
                className="btn btn-ghost text-xs px-2.5 py-1 font-mono shrink-0 hover:underline"
              >
                Return to Course Root
              </button>
            </div>
          )}

          {/* 5. FOLDERS SECTION (Visible at Root or inside Folders with child subfolders) */}
          {(directoryFolders.length > 0 || (!currentFolderId && !isUnorganizedView && unorganizedCount > 0)) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink flex items-center gap-2">
                  <FolderIcon className="w-3.5 h-3.5 text-ink-2" aria-hidden="true" />
                  <span>
                    {currentFolderId
                      ? `Subfolders (${directoryFolders.length})`
                      : `Folders (${directoryFolders.length + (unorganizedCount > 0 ? 1 : 0)})`}
                  </span>
                </h3>
                <span className="font-mono text-[10.5px] text-ink-3 hidden sm:inline">
                  Click to open · Drag files to move
                </span>
              </div>

              {/* Grid view for folders */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {/* Unorganized system folder card at root */}
                  {!currentFolderId && !isUnorganizedView && unorganizedCount > 0 && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={navigateToUnorganized}
                      onContextMenu={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigateToUnorganized();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverFolderId('UNORGANIZED_CARD');
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragOverFolderId(null);
                        const resId =
                          e.dataTransfer.getData('application/x-resource-id') ||
                          e.dataTransfer.getData('text/plain');
                        if (resId) {
                          await moveToFolder(resId, null);
                          showToast('Moved file to Unorganized');
                        }
                      }}
                      className={`group p-4 border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] ${
                        dragOverFolderId === 'UNORGANIZED_CARD'
                          ? 'border-2 border-lime bg-lime-wash/60 shadow-xs'
                          : 'border-dashed border-rule bg-paper-sunk/20 hover:border-ink hover:bg-paper'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FolderOpen className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                          <span className="font-bold text-[13.5px] text-ink group-hover:underline">
                            Unorganized
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-ink-3 tabular">
                          {unorganizedCount} {unorganizedCount === 1 ? 'material' : 'materials'} needing filing
                        </p>
                      </div>

                      <div className="pt-2 border-t border-rule mt-2.5 flex items-center justify-between text-[11px] font-mono text-ink-3">
                        <span className="text-[10px] uppercase tracking-wider text-ink-3 group-hover:text-ink transition-colors">
                          {dragOverFolderId === 'UNORGANIZED_CARD' ? 'Drop to un-file' : 'Open folder'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-ink-3 group-hover:translate-x-0.5 group-hover:text-ink transition-transform" />
                      </div>
                    </div>
                  )}

                  {/* Normal Folder Cards */}
                  {directoryFolders.map((folder) => {
                    const subCount = folders.filter((child) => child.parentId === folder.id).length;
                    const isDragTarget = dragOverFolderId === folder.id;

                    return (
                      <div
                        key={folder.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigateToFolder(folder.id)}
                        onContextMenu={(e) => handleOpenContextMenu(e, 'folder', folder)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigateToFolder(folder.id);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverFolderId(folder.id);
                        }}
                        onDragLeave={() => setDragOverFolderId(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverFolderId(null);
                          const resId =
                            e.dataTransfer.getData('application/x-resource-id') ||
                            e.dataTransfer.getData('text/plain');
                          if (resId) {
                            await moveToFolder(resId, folder.id);
                            showToast(`Moved file to "${folder.name}"`);
                          }
                        }}
                        className={`group p-4 border transition-all cursor-pointer bg-paper flex flex-col justify-between min-h-[105px] ${
                          isDragTarget
                            ? 'border-2 border-lime bg-lime-wash/60 shadow-xs'
                            : 'border-rule hover:border-ink hover:bg-paper-sunk/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FolderIcon className="w-4 h-4 text-ink-2 group-hover:text-lime-deep shrink-0 transition-colors" />
                              <span className="font-bold text-[13.5px] text-ink truncate group-hover:underline">
                                {folder.name}
                              </span>
                            </div>

                            {/* Three dots / action button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenContextMenu(e, 'folder', folder)}
                              className="p-1 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors shrink-0"
                              title="Folder actions"
                              aria-label="Folder actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="font-mono text-[11px] text-ink-3 tabular flex items-center gap-2">
                            <span>
                              {folder.resourceCount} {folder.resourceCount === 1 ? 'file' : 'files'}
                            </span>
                            {subCount > 0 && <span>· {subCount} subfolders</span>}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-rule mt-2.5 flex items-center justify-between text-[11px] font-mono text-ink-3">
                          <span className="text-[10px] uppercase tracking-wider text-ink-3 group-hover:text-ink transition-colors">
                            {isDragTarget ? 'Drop to move here' : 'Open folder'}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-ink-3 group-hover:translate-x-0.5 group-hover:text-ink transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List view for folders */
                <div className="border border-rule bg-paper divide-y divide-rule">
                  {/* Unorganized row at root */}
                  {!currentFolderId && !isUnorganizedView && unorganizedCount > 0 && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={navigateToUnorganized}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverFolderId('UNORGANIZED_ROW');
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragOverFolderId(null);
                        const resId =
                          e.dataTransfer.getData('application/x-resource-id') ||
                          e.dataTransfer.getData('text/plain');
                        if (resId) {
                          await moveToFolder(resId, null);
                          showToast('Moved file to Unorganized');
                        }
                      }}
                      className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        dragOverFolderId === 'UNORGANIZED_ROW'
                          ? 'border-2 border-lime bg-lime-wash/60'
                          : 'hover:bg-paper-sunk/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FolderOpen className="w-4 h-4 text-ink-3 shrink-0" />
                        <span className="font-bold text-[13px] text-ink">Unorganized Files</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs text-ink-3 tabular">
                        <span>{unorganizedCount} loose files</span>
                        <ChevronRight className="w-3.5 h-3.5 text-ink-3" />
                      </div>
                    </div>
                  )}

                  {directoryFolders.map((folder) => {
                    const subCount = folders.filter((child) => child.parentId === folder.id).length;
                    const isDragTarget = dragOverFolderId === folder.id;

                    return (
                      <div
                        key={folder.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigateToFolder(folder.id)}
                        onContextMenu={(e) => handleOpenContextMenu(e, 'folder', folder)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverFolderId(folder.id);
                        }}
                        onDragLeave={() => setDragOverFolderId(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverFolderId(null);
                          const resId =
                            e.dataTransfer.getData('application/x-resource-id') ||
                            e.dataTransfer.getData('text/plain');
                          if (resId) {
                            await moveToFolder(resId, folder.id);
                            showToast(`Moved file to "${folder.name}"`);
                          }
                        }}
                        className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors group ${
                          isDragTarget
                            ? 'border-2 border-lime bg-lime-wash/60'
                            : 'hover:bg-paper-sunk/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FolderIcon className="w-4 h-4 text-ink-2 group-hover:text-lime-deep shrink-0 transition-colors" />
                          <span className="font-bold text-[13px] text-ink group-hover:underline truncate">
                            {folder.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-xs text-ink-3 tabular shrink-0">
                          <span>
                            {folder.resourceCount} {folder.resourceCount === 1 ? 'file' : 'files'}
                          </span>
                          {subCount > 0 && <span>· {subCount} subfolders</span>}
                          <button
                            type="button"
                            onClick={(e) => handleOpenContextMenu(e, 'folder', folder)}
                            className="p-1 text-ink-3 hover:text-ink hover:bg-paper transition-colors"
                            aria-label="Folder actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 6. FILES SECTION (Strict directory contents) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink flex items-center gap-2">
                <File className="w-3.5 h-3.5 text-ink-2" aria-hidden="true" />
                <span>
                  {searchScope === 'subject' && subjectSearch.trim()
                    ? `Matching Course Files (${directoryResources.length})`
                    : currentFolderId
                    ? `Files in “${activeFolder?.name ?? 'Folder'}” (${directoryResources.length})`
                    : isUnorganizedView
                    ? `Unorganized Files (${directoryResources.length})`
                    : `Root Files (${directoryResources.length})`}
                </span>
              </h3>
              <span className="font-mono text-[10.5px] text-ink-3 hidden sm:inline">
                Drag to move · Right-click for options
              </span>
            </div>

            {/* List View Table */}
            {viewMode === 'list' ? (
              <div className="border border-rule bg-paper divide-y divide-rule overflow-hidden">
                {/* Table Header with interactive column sort & Select All */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-paper-sunk font-mono text-[11px] text-ink-3 select-none items-center">
                  <div className="col-span-6 flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-ink-3 hover:text-ink transition-colors p-0.5"
                      aria-label="Select all files in directory"
                    >
                      {selectedResourceIds.size > 0 &&
                      selectedResourceIds.size === directoryResources.length ? (
                        <CheckSquare className="w-4 h-4 text-ink fill-lime/30" />
                      ) : (
                        <Square className="w-4 h-4 text-ink-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSort('name')}
                      className="font-bold uppercase tracking-[0.06em] text-ink flex items-center gap-1 hover:underline"
                    >
                      <span>Name</span>
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="col-span-2 hidden md:block">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('type')}
                      className="font-bold uppercase tracking-[0.06em] text-ink flex items-center gap-1 hover:underline"
                    >
                      <span>Type</span>
                      {sortField === 'type' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="col-span-2 hidden sm:block">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('size')}
                      className="font-bold uppercase tracking-[0.06em] text-ink flex items-center gap-1 hover:underline"
                    >
                      <span>Size</span>
                      {sortField === 'size' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="col-span-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('date')}
                      className="font-bold uppercase tracking-[0.06em] text-ink inline-flex items-center gap-1 hover:underline ml-auto"
                    >
                      <span>Date Added</span>
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Rows or Empty States */}
                {directoryResources.length === 0 ? (
                  <div className="p-10 text-center text-xs text-ink-2">
                    {activeFolder ? (
                      <>
                        <FolderOpen className="w-8 h-8 text-ink-3 mx-auto mb-2" aria-hidden="true" />
                        <h4 className="text-sm font-bold text-ink mb-1">This folder has no files</h4>
                        <p className="max-w-[42ch] mx-auto mb-4">
                          Drag files here from other locations or upload new study materials into “{activeFolder.name}”.
                        </p>
                        <button
                          onClick={() => openUploadModal(subjectId, activeFolder.id)}
                          className="btn btn-secondary text-xs px-3 py-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Upload File into Folder</span>
                        </button>
                      </>
                    ) : isUnorganizedView ? (
                      <>
                        <Check className="w-8 h-8 text-lime-deep mx-auto mb-2" aria-hidden="true" />
                        <h4 className="text-sm font-bold text-ink mb-1">All Materials Are Organized</h4>
                        <p className="max-w-[42ch] mx-auto mb-4">
                          No loose files remain. Every document in this course is filed into a folder.
                        </p>
                        <button
                          onClick={navigateToRoot}
                          className="btn btn-secondary text-xs px-3 py-1.5"
                        >
                          Return to Course Root
                        </button>
                      </>
                    ) : (
                      <>
                        <FileText className="w-8 h-8 text-ink-3 mx-auto mb-2" aria-hidden="true" />
                        <h4 className="text-sm font-bold text-ink mb-1">No Loose Files at Root</h4>
                        <p className="max-w-[42ch] mx-auto mb-4">
                          All files are neatly filed in the folders above, or no files match the current filters.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  directoryResources.map((resource) => {
                    const isSelected = selectedResourceIds.has(resource.id);
                    const isDeck = resource.fileKind === 'pptx' || resource.fileKind === 'ppt';
                    const bookmarked = isBookmarked(resource.id);

                    return (
                      <div
                        key={resource.id}
                        role="row"
                        tabIndex={0}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', resource.id);
                          e.dataTransfer.setData('application/x-resource-id', resource.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => openDetail(resource)}
                        onContextMenu={(e) => handleOpenContextMenu(e, 'resource', resource)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDetail(resource);
                          }
                        }}
                        className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center cursor-pointer transition-colors border-b border-rule last:border-b-0 group ${
                          isSelected ? 'bg-lime-wash' : 'bg-paper hover:bg-paper-sunk/60'
                        }`}
                      >
                        {/* Name Column */}
                        <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(resource.id);
                            }}
                            className="p-0.5 text-ink-3 hover:text-ink shrink-0"
                            aria-label={isSelected ? `Deselect ${resource.title}` : `Select ${resource.title}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-ink fill-lime/30" />
                            ) : (
                              <Square className="w-4 h-4 text-ink-3 group-hover:text-ink" />
                            )}
                          </button>

                          <div className="shrink-0 text-ink-3 group-hover:text-ink">
                            {isDeck ? (
                              <Presentation className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[13px] text-ink group-hover:underline truncate max-w-sm">
                                {resource.title}
                              </span>
                              <IngestMark resource={resource} />
                            </div>

                            {/* Show folder provenance if searching across course */}
                            {searchScope === 'subject' && resource.folderId && (
                              <span className="font-mono text-[10px] text-ink-3 block truncate">
                                in 📁 {folderMap.get(resource.folderId)?.name ?? 'Folder'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Kind Column */}
                        <div className="col-span-2 hidden md:block font-mono text-[11px] text-ink-2 truncate">
                          <span className="stamp stamp-outline text-[9px] py-0 px-1 font-mono">
                            {resource.type}
                          </span>
                        </div>

                        {/* Size Column */}
                        <div className="col-span-2 hidden sm:block font-mono text-[11px] text-ink-3 tabular">
                          {resource.fileSize}
                        </div>

                        {/* Date & Actions Column */}
                        <div
                          className="col-span-2 flex items-center justify-end gap-1.5 font-mono text-[11px] text-ink-3 tabular"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="hidden sm:inline">{resource.uploadDate}</span>

                          <button
                            type="button"
                            onClick={() => void downloadResource(resource)}
                            className="p-1 text-ink-3 hover:text-ink hover:bg-paper transition-colors hidden md:inline-flex"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleBookmark(resource.id)}
                            className="p-1 text-ink-3 hover:text-ink hover:bg-paper transition-colors hidden md:inline-flex"
                            title={bookmarked ? 'Saved' : 'Save'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-lime-deep text-lime-deep' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenContextMenu(e, 'resource', resource)}
                            className="p-1 text-ink-3 hover:text-ink hover:bg-paper transition-colors"
                            aria-label="File options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Grid View Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {directoryResources.length === 0 ? (
                  <div className="col-span-full p-8 border border-rule bg-paper-sunk text-center text-xs text-ink-3">
                    No files found in this directory.
                  </div>
                ) : (
                  directoryResources.map((resource) => {
                    const isSelected = selectedResourceIds.has(resource.id);
                    const isDeck = resource.fileKind === 'pptx' || resource.fileKind === 'ppt';

                    return (
                      <div
                        key={resource.id}
                        role="button"
                        tabIndex={0}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', resource.id);
                          e.dataTransfer.setData('application/x-resource-id', resource.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => openDetail(resource)}
                        onContextMenu={(e) => handleOpenContextMenu(e, 'resource', resource)}
                        className={`group p-4 border transition-all cursor-pointer flex flex-col justify-between min-h-[120px] ${
                          isSelected
                            ? 'border-2 border-lime bg-lime-wash'
                            : 'border-rule bg-paper hover:border-ink hover:bg-paper-sunk/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isDeck ? (
                                <Presentation className="w-4 h-4 text-ink-3 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-ink-3 shrink-0" />
                              )}
                              <span className="font-bold text-[13px] text-ink truncate group-hover:underline">
                                {resource.title}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleOpenContextMenu(e, 'resource', resource)}
                              className="p-1 text-ink-3 hover:text-ink shrink-0"
                              aria-label="File options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="stamp stamp-outline text-[9px] py-0 px-1 font-mono">
                              {resource.type}
                            </span>
                            <IngestMark resource={resource} />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-rule mt-3 flex items-center justify-between font-mono text-[10.5px] text-ink-3 tabular">
                          <span>{resource.fileSize}</span>
                          <span>{resource.uploadDate}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 7. Floating Multi-Select Action Bar */}
          {selectedResourceIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-paper border-2 border-ink shadow-overlay px-4 py-2.5 flex items-center gap-3 flex-wrap animate-fadeIn max-w-[95vw]">
              <div className="font-mono text-xs font-bold text-ink">
                {selectedResourceIds.size} files selected
              </div>

              <div className="h-4 w-[1px] bg-rule hidden sm:block" />

              {/* Bulk Move into Folder */}
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkTargetFolderId}
                  onChange={(e) => setBulkTargetFolderId(e.target.value)}
                  className="field text-xs py-1.5 pl-2.5 pr-8 bg-paper-sunk border border-rule text-ink cursor-pointer font-mono"
                  aria-label="Select destination folder"
                >
                  <option value="">Move to folder…</option>
                  <option value="UNORGANIZED">Unorganized (Root)</option>
                  {folderTree.map(({ folder, depth }) => (
                    <option key={folder.id} value={folder.id}>
                      {'\u00A0\u00A0'.repeat(depth)}📁 {folder.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkTargetFolderId}
                  onClick={async () => {
                    if (!bulkTargetFolderId) return;
                    const target = bulkTargetFolderId === 'UNORGANIZED' ? null : bulkTargetFolderId;
                    await bulkMoveToFolder(Array.from(selectedResourceIds), target);
                    setSelectedResourceIds(new Set());
                    setBulkTargetFolderId('');
                  }}
                  className="btn btn-secondary text-xs px-2.5 py-1 disabled:opacity-40"
                >
                  Move
                </button>
              </div>

              <div className="h-4 w-[1px] bg-rule hidden sm:block" />

              {/* Ask AI About Selected */}
              <button
                type="button"
                onClick={() => {
                  openAssistant({
                    mode: 'selected',
                    resourceIds: Array.from(selectedResourceIds),
                    subjectId
                  });
                }}
                className="btn btn-primary text-xs px-3 py-1 flex items-center gap-1.5"
                title="Synthesize an answer using exclusively these selected documents"
              >
                <Sparkles className="w-3.5 h-3.5 text-lime" />
                <span>Ask AI About Selected</span>
              </button>

              {/* Download ZIP */}
              <button
                type="button"
                onClick={handleDownloadSelectedZip}
                disabled={zipState.busy}
                className="btn btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ZIP</span>
              </button>

              {/* Delete user uploaded */}
              {userUploadedSelectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="btn btn-ghost text-alert hover:bg-alert/10 text-xs px-2 py-1 flex items-center gap-1"
                  title="Delete user-uploaded files you authored"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({userUploadedSelectedIds.length})</span>
                </button>
              )}

              {/* Deselect All */}
              <button
                type="button"
                onClick={() => setSelectedResourceIds(new Set())}
                className="btn btn-ghost text-ink-3 hover:text-ink text-xs px-2 py-1"
              >
                Clear
              </button>
            </div>
          )}
        </section>
      )}

      {/* Syllabus Tab */}
      {activeTab === 'syllabus' && (
        <section className="pt-6 space-y-6">
          <div className="border border-rule p-5 bg-paper">
            <h2 className="text-base font-extrabold text-ink mb-1">
              Curriculum Modules &amp; Viva Voce Guide
            </h2>
            <p className="text-xs text-ink-2 max-w-2xl leading-relaxed">
              Official module outcomes mapped to SAKEC Semester III syllabus. Evaluators examine student understanding
              across these modules during internal and oral viva examinations.
            </p>
          </div>

          <nav className="tab-rail no-scrollbar" aria-label="Syllabus modules">
            {SYLLABUS_MODULES.map((mod) => (
              <button
                key={mod.moduleNumber}
                onClick={() => setActiveModuleNumber(mod.moduleNumber)}
                aria-pressed={activeModuleNumber === mod.moduleNumber}
                className={`tab-rail-item flex flex-col items-start gap-1 ${
                  activeModuleNumber === mod.moduleNumber ? 'is-active' : ''
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-80">
                  Module {mod.moduleNumber} · {mod.mappedCO}
                </span>
                <span className="font-bold text-xs sm:text-sm">{mod.name}</span>
              </button>
            ))}
          </nav>

          <div className="border border-rule p-5 sm:p-6 space-y-5 bg-paper">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-ink">
              <div>
                <p className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
                  Module {activeModule.moduleNumber} · {activeModule.mappedCO} · {activeModule.hours} Lecture Hours
                </p>
                <h3 className="text-xl font-black text-ink tracking-tight">{activeModule.name}</h3>
              </div>
              <button
                onClick={() =>
                  openAssistant({
                    mode: 'subject',
                    subjectId
                  })
                }
                className="btn btn-secondary px-3 py-1.5 text-xs font-mono shrink-0 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
                <span>Ask Viva AI</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
                  Key Topics &amp; Course Outcomes
                </h4>
                <ul className="space-y-2">
                  {activeModule.outcomes.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-3 bg-paper-sunk border border-rule text-xs sm:text-sm text-ink-2">
                      <span className="w-1.5 h-1.5 bg-lime-deep mt-2 shrink-0" aria-hidden="true" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-paper-sunk border border-rule">
                <h4 className="text-[11px] font-mono font-semibold text-ink uppercase tracking-[0.08em] mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                  Engineering Implementation
                </h4>
                <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">{activeModule.implementationInApp}</p>
              </div>

              <div className="bg-ink text-paper font-mono text-xs p-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-ink-3">Code Reference:</span>
                  <span className="font-bold break-all">{activeModule.codeReference}</span>
                </div>
                <span className="text-lime font-bold uppercase text-[10px] tracking-[0.08em] shrink-0">
                  Verified &amp; Active
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Scheme Tab */}
      {activeTab === 'scheme' && scheme && (
        <section className="pt-6">
          <div className="border border-rule p-5 sm:p-6 bg-paper space-y-4">
            <h2 className="text-base font-extrabold text-ink mb-1">Official Course Structure</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3 bg-paper-sunk border border-rule">
                <span className="text-[10px] text-ink-3 uppercase block">Course Code</span>
                <span className="font-bold text-ink">{subject.courseCode}</span>
              </div>
              <div className="p-3 bg-paper-sunk border border-rule">
                <span className="text-[10px] text-ink-3 uppercase block">Credits</span>
                <span className="font-bold text-ink">{scheme.credits} Credits</span>
              </div>
              <div className="p-3 bg-paper-sunk border border-rule">
                <span className="text-[10px] text-ink-3 uppercase block">Total Hours</span>
                <span className="font-bold text-ink">{scheme.nh} Hours</span>
              </div>
              <div className="p-3 bg-paper-sunk border border-rule">
                <span className="text-[10px] text-ink-3 uppercase block">Teaching Scheme</span>
                <span className="font-bold text-ink">CL {scheme.cl} / TL {scheme.tl} / LL {scheme.ll}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-paper border border-ink shadow-overlay py-1 min-w-[200px] text-xs font-mono animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'folder' && contextMenu.folder && (
            <>
              <div className="px-3 py-1 text-[10.5px] font-bold text-ink-3 border-b border-rule truncate">
                📁 {contextMenu.folder.name}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigateToFolder(contextMenu.folder!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <FolderOpen className="w-3.5 h-3.5 text-ink-2" />
                <span>Open Folder</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  openAssistant({
                    mode: 'folder',
                    folderId: contextMenu.folder!.id,
                    folderName: contextMenu.folder!.name,
                    subjectId
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-lime-deep" />
                <span>Ask Folder AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewFolderParentId(contextMenu.folder!.id);
                  setNewFolderOpen(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <FolderPlus className="w-3.5 h-3.5 text-ink-2" />
                <span>New Subfolder inside…</span>
              </button>
              <div className="border-t border-rule my-1" />
              <button
                type="button"
                onClick={() => {
                  setRenamingFolder(contextMenu.folder!);
                  setRenamingFolderName(contextMenu.folder!.name);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-ink-2" />
                <span>Rename Folder</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovingFolder(contextMenu.folder!);
                  setMovingFolderTargetId(contextMenu.folder!.parentId ?? '');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <FolderInput className="w-3.5 h-3.5 text-ink-2" />
                <span>Move to…</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmFolder(contextMenu.folder!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-alert/10 text-alert flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Folder…</span>
              </button>
            </>
          )}

          {contextMenu.type === 'resource' && contextMenu.resource && (
            <>
              <div className="px-3 py-1 text-[10.5px] font-bold text-ink-3 border-b border-rule truncate">
                📄 {contextMenu.resource.title}
              </div>
              <button
                type="button"
                onClick={() => {
                  openDetail(contextMenu.resource!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-ink-2" />
                <span>Open in Study View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  openAssistant({
                    mode: 'resource',
                    resourceId: contextMenu.resource!.id
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-lime-deep" />
                <span>Ask AI About Document</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void downloadResource(contextMenu.resource!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-ink-2" />
                <span>Download File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void toggleBookmark(contextMenu.resource!.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
              >
                <Bookmark className="w-3.5 h-3.5 text-ink-2" />
                <span>{isBookmarked(contextMenu.resource!.id) ? 'Remove from Saved' : 'Save for Revision'}</span>
              </button>
              {contextMenu.resource.ingestStatus === 'failed' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      showToast('Rebuilding vector index…');
                      const result = await reindexResource(contextMenu.resource!.id);
                      showToast(result.message);
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : 'Re-index failed');
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-alert/10 text-alert flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry AI Indexing</span>
                </button>
              )}
              <div className="border-t border-rule my-1" />
              {contextMenu.resource.isUserUploaded && contextMenu.resource.ownerKey === ownerKey ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingResource(contextMenu.resource!);
                      setRenamingResourceTitle(contextMenu.resource!.title);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-ink-2" />
                    <span>Rename File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickMoveResource(contextMenu.resource!);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-ink-2" />
                    <span>Move to Folder…</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmResource(contextMenu.resource!);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-alert/10 text-alert flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete File</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setQuickMoveResource(contextMenu.resource!);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-lime-wash hover:text-ink flex items-center gap-2"
                >
                  <FolderInput className="w-3.5 h-3.5 text-ink-2" />
                  <span>Move to Folder…</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      {newFolderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setNewFolderOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-2 border-ink max-w-sm w-full bg-paper p-6 shadow-overlay animate-fadeIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-ink" />
                <h3 className="text-sm font-extrabold text-ink uppercase font-mono tracking-tight">New Folder</h3>
              </div>
              <button onClick={() => setNewFolderOpen(false)} className="text-ink-3 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block font-semibold text-xs text-ink mb-1">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Module 1 - Trees, Lab Manuals"
                  className="field w-full px-3 py-2 text-xs"
                  autoFocus
                />
              </div>

              {folders.length > 0 && (
                <div>
                  <label className="block font-semibold text-xs text-ink mb-1">Parent Folder (Optional)</label>
                  <select
                    value={newFolderParentId}
                    onChange={(e) => setNewFolderParentId(e.target.value)}
                    className="field w-full pl-2.5 pr-8 py-2 text-xs bg-paper-sunk border border-rule font-mono"
                  >
                    <option value="">Root level (Top Level)</option>
                    {folderTree.map(({ folder, depth }) => (
                      <option key={folder.id} value={folder.id}>
                        {'\u00A0\u00A0'.repeat(depth)}📁 {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setNewFolderOpen(false)}
                  className="btn btn-ghost text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="btn btn-primary text-xs px-4 py-1.5 disabled:opacity-40"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {renamingFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setRenamingFolder(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-2 border-ink max-w-sm w-full bg-paper p-6 shadow-overlay animate-fadeIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-ink" />
                <h3 className="text-sm font-extrabold text-ink uppercase font-mono tracking-tight">Rename Folder</h3>
              </div>
              <button onClick={() => setRenamingFolder(null)} className="text-ink-3 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameFolder} className="space-y-3">
              <div>
                <label className="block font-semibold text-xs text-ink mb-1">New Folder Name</label>
                <input
                  type="text"
                  value={renamingFolderName}
                  onChange={(e) => setRenamingFolderName(e.target.value)}
                  className="field w-full px-3 py-2 text-xs"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setRenamingFolder(null)}
                  className="btn btn-ghost text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renamingFolderName.trim()}
                  className="btn btn-primary text-xs px-4 py-1.5 disabled:opacity-40"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Folder Modal (Cycle Prevention & Indented Hierarchy) */}
      {movingFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setMovingFolder(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-2 border-ink max-w-sm w-full bg-paper p-6 shadow-overlay animate-fadeIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FolderInput className="w-5 h-5 text-ink" />
                <h3 className="text-sm font-extrabold text-ink uppercase font-mono tracking-tight">Move Folder</h3>
              </div>
              <button onClick={() => setMovingFolder(null)} className="text-ink-3 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-2">
              Move <strong className="text-ink">&ldquo;{movingFolder.name}&rdquo;</strong> into a destination parent or to root.
            </p>

            <form onSubmit={handlePerformMoveFolder} className="space-y-3">
              <div>
                <label className="block font-semibold text-xs text-ink mb-1">Destination Parent</label>
                <select
                  value={movingFolderTargetId}
                  onChange={(e) => setMovingFolderTargetId(e.target.value)}
                  className="field w-full pl-2.5 pr-8 py-2 text-xs bg-paper-sunk border border-rule font-mono"
                >
                  <option value="">Root level (Top Level)</option>
                  {folderTree
                    .filter(({ folder }) => !invalidMoveTargets.has(folder.id))
                    .map(({ folder, depth }) => (
                      <option key={folder.id} value={folder.id}>
                        {'\u00A0\u00A0'.repeat(depth)}📁 {folder.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setMovingFolder(null)}
                  className="btn btn-ghost text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs px-4 py-1.5"
                >
                  Move Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Dialog (Choice to move contents or delete) */}
      {deleteConfirmFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setDeleteConfirmFolder(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-2 border-ink max-w-md w-full bg-paper p-6 shadow-overlay animate-fadeIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-alert" />
                <h3 className="text-base font-extrabold text-ink">
                  Delete folder &ldquo;{deleteConfirmFolder.name}&rdquo;?
                </h3>
              </div>
              <button onClick={() => setDeleteConfirmFolder(null)} className="text-ink-3 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-ink-2">
              <p>Choose what happens to the files inside this folder:</p>

              <label className="flex items-start gap-2.5 p-3 border border-rule bg-paper-sunk cursor-pointer">
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteFolderMode === 'move'}
                  onChange={() => setDeleteFolderMode('move')}
                  className="mt-0.5"
                />
                <div>
                  <strong className="text-ink block">Move contents to Unorganized (Recommended)</strong>
                  <span>Preserves all files, vector chunks, and bookmarks in the course unorganized directory.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 border border-rule bg-paper-sunk cursor-pointer">
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteFolderMode === 'deleteFiles'}
                  onChange={() => setDeleteFolderMode('deleteFiles')}
                  className="mt-0.5"
                />
                <div>
                  <strong className="text-alert block">Also delete user-uploaded files</strong>
                  <span>Permanently removes files you authored inside this folder. Official files move to Unorganized.</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-rule">
              <button onClick={() => setDeleteConfirmFolder(null)} className="btn btn-ghost text-xs px-3 py-1.5">
                Cancel
              </button>
              <button onClick={() => void handleConfirmDeleteFolder()} className="btn btn-alert text-xs px-4 py-1.5">
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {renamingResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setRenamingResource(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-2 border-ink max-w-sm w-full bg-paper p-6 shadow-overlay animate-fadeIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-ink" />
                <h3 className="text-sm font-extrabold text-ink uppercase font-mono tracking-tight">Rename File</h3>
              </div>
              <button onClick={() => setRenamingResource(null)} className="text-ink-3 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameResource} className="space-y-3">
              <div>
                <label className="block font-semibold text-xs text-ink mb-1">Document Title</label>
                <input
                  type="text"
                  value={renamingResourceTitle}
                  onChange={(e) => setRenamingResourceTitle(e.target.value)}
                  className="field w-full px-3 py-2 text-xs"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setRenamingResource(null)}
                  className="btn btn-ghost text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renamingResourceTitle.trim()}
                  className="btn btn-primary text-xs px-4 py-1.5 disabled:opacity-40"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Move Single Resource Modal */}
      {quickMoveResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setQuickMoveResource(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-2 border-ink max-w-sm w-full bg-paper p-5 shadow-overlay animate-fadeIn space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <h3 className="text-xs font-bold text-ink uppercase font-mono tracking-tight">Move to folder</h3>
                <p className="text-xs text-ink-2 truncate mt-0.5">{quickMoveResource.title}</p>
              </div>
              <button onClick={() => setQuickMoveResource(null)} className="text-ink-3 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-rule border border-rule max-h-56 overflow-y-auto text-xs font-mono">
              <button
                type="button"
                onClick={() => void handlePerformQuickMove(null)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-paper-sunk transition-colors ${
                  !quickMoveResource.folderId ? 'bg-lime/20 font-bold' : ''
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-ink-3" />
                  <span>Unorganized (Root)</span>
                </span>
                {!quickMoveResource.folderId && <Check className="w-3.5 h-3.5 text-lime-deep" />}
              </button>

              {folderTree.map(({ folder, depth }) => {
                const isCurrent = quickMoveResource.folderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => void handlePerformQuickMove(folder.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-paper-sunk transition-colors ${
                      isCurrent ? 'bg-lime/20 font-bold' : ''
                    }`}
                    style={{ paddingLeft: `${12 + depth * 12}px` }}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FolderIcon className="w-3.5 h-3.5 text-ink-2 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-lime-deep shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setQuickMoveResource(null)}
                className="btn btn-ghost text-xs px-3 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Resource Confirmation Dialog */}
      {deleteConfirmResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setDeleteConfirmResource(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="border-2 border-ink max-w-sm w-full bg-paper p-6 shadow-overlay animate-fadeIn space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-alert" />
                <h3 className="text-base font-extrabold text-ink">Delete this file?</h3>
              </div>
              <button onClick={() => setDeleteConfirmResource(null)} className="text-ink-3 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed">
              Are you sure you want to delete <strong className="text-ink">&ldquo;{deleteConfirmResource.title}&rdquo;</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-rule">
              <button
                onClick={() => setDeleteConfirmResource(null)}
                className="btn btn-ghost text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmDeleteResource()}
                className="btn btn-alert text-xs px-4 py-1.5"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
