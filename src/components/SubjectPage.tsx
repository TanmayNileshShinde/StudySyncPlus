import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useResources } from '../context/ResourceContext';
import { downloadResourcesAsZip } from '../lib/zipDownload';
import { SYLLABUS_MODULES } from '../data/syllabusData';
import { asSubjectId } from '../lib/convexIds';
import { getOwnerKey } from '../lib/owner';
import type { StudyResource, MoreSheetKind, ResourceType, Folder } from '../types';
import {
  ArrowLeft,
  Download,
  FileText,
  Presentation,
  Bookmark,
  RotateCcw,
  Sparkles,
  PlusCircle,
  Layers,
  LoaderCircle,
  Star,
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
  Search
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

interface ResourceRowProps {
  resource: StudyResource;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onAsk: (resource: StudyResource) => void;
  onQuickMove: (resource: StudyResource) => void;
  folderName: string;
  showFolderBadge: boolean;
  onFolderClick: (folderId: string | null) => void;
}

const ResourceRow: React.FC<ResourceRowProps> = ({
  resource,
  isSelected,
  onToggleSelect,
  onAsk,
  onQuickMove,
  folderName,
  showFolderBadge,
  onFolderClick
}) => {
  const { openDetail, toggleBookmark, isBookmarked, downloadResource, reindexResource, showToast } = useResources();
  const bookmarked = isBookmarked(resource.id);

  const handleRetry = async () => {
    try {
      showToast('Rebuilding vector index…');
      const result = await reindexResource(resource.id);
      showToast(result.message);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Re-index failed. Please try again.');
    }
  };

  const isDeck = resource.fileKind === 'pptx' || resource.fileKind === 'ppt';

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', resource.id);
        e.dataTransfer.setData('application/x-resource-id', resource.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      aria-label={`Open study view for ${resource.title}`}
      onClick={() => openDetail(resource)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail(resource);
        }
      }}
      className={`group flex items-center justify-between gap-3 px-4 py-3 transition-colors cursor-pointer border-b border-rule last:border-b-0 ${
        isSelected ? 'bg-lime-wash' : 'bg-paper hover:bg-paper-sunk'
      }`}
    >
      {/* Left: Checkbox + Icon + Title + Tags */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(resource.id);
          }}
          className="text-ink-3 hover:text-ink transition-colors p-0.5 shrink-0"
          aria-label={isSelected ? `Deselect ${resource.title}` : `Select ${resource.title}`}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-ink fill-lime/30" aria-hidden="true" />
          ) : (
            <Square className="w-4 h-4 text-ink-3 group-hover:text-ink" aria-hidden="true" />
          )}
        </button>

        <div className="shrink-0 text-ink-3 group-hover:text-ink transition-colors">
          {isDeck ? (
            <Presentation className="w-4 h-4" aria-hidden="true" />
          ) : (
            <FileText className="w-4 h-4" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
            <span className="text-[13.5px] font-bold text-ink truncate group-hover:text-ink-2">
              {resource.title}
            </span>

            {/* Folder Location badge (shown in flat/unorganized views) */}
            {showFolderBadge && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderClick(resource.folderId ?? null);
                }}
                className="inline-flex items-center gap-1 font-mono text-[9.5px] px-1.5 py-0.2 bg-paper-sunk border border-rule text-ink-3 hover:text-ink hover:border-ink transition-colors shrink-0"
                title={`Filed in ${folderName}. Click to open folder.`}
              >
                <FolderIcon className="w-2.5 h-2.5" aria-hidden="true" />
                <span className="truncate max-w-[120px]">{folderName}</span>
              </button>
            )}

            <span className="stamp stamp-outline text-[9px] py-0 px-1 font-mono shrink-0 hidden md:inline-flex">
              {resource.type}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-3 mt-0.5">
            <span>{resource.fileSize}</span>
            <span>·</span>
            <span className="truncate">{resource.uploadedBy}</span>
            <span className="hidden sm:inline">· {resource.uploadDate}</span>
            {resource.rating > 0 && (
              <>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline-flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-lime text-lime-deep" aria-hidden="true" />
                  <span>{resource.rating.toFixed(1)}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: AI Ingestion Mark */}
      <div className="hidden sm:block shrink-0 px-2">
        <IngestMark resource={resource} />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => void downloadResource(resource)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper transition-colors"
          aria-label={`Download ${resource.title}`}
          title="Download file"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          onClick={() => void toggleBookmark(resource.id)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper transition-colors"
          aria-label={bookmarked ? `Remove ${resource.title} from saved` : `Save ${resource.title}`}
          aria-pressed={bookmarked}
          title={bookmarked ? 'Saved for revision' : 'Save for revision'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-lime-deep text-lime-deep' : ''}`} aria-hidden="true" />
        </button>

        <button
          onClick={() => onAsk(resource)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper transition-colors"
          aria-label={`Ask Study Assistant about ${resource.title}`}
          title="Ask AI about this document"
        >
          <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
        </button>

        <button
          onClick={() => onQuickMove(resource)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper transition-colors hidden sm:inline-flex"
          aria-label={`Move ${resource.title} to folder`}
          title="Move to folder…"
        >
          <FolderInput className="w-4 h-4" aria-hidden="true" />
        </button>

        {resource.ingestStatus === 'failed' && (
          <button
            onClick={() => void handleRetry()}
            className="p-1.5 text-alert hover:bg-paper transition-colors"
            aria-label={`Retry vector indexing for ${resource.title}`}
            title="Retry vector indexing"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

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
    openUploadModal,
    subjectSearch,
    setSubjectSearch,
    collectDownloadArtifact,
    createFolder,
    renameFolder,
    removeFolder,
    moveToFolder,
    bulkMoveToFolder,
    bulkDelete,
    showToast
  } = useResources();

  const ownerKey = getOwnerKey();

  // Queries
  const rawFolders = useQuery(
    api.folders.listBySubject,
    subjectId ? { subjectId: asSubjectId(subjectId) } : 'skip'
  );
  const folders = useMemo(() => (rawFolders ?? []) as Folder[], [rawFolders]);

  // View state
  const [activeTab, setActiveTab] = useState<'materials' | 'syllabus' | 'scheme'>('materials');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL' | 'UNORGANIZED'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ResourceType | 'ALL'>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<'ALL' | 'pdf' | 'ppt'>('ALL');
  const [selectedIndexStatus, setSelectedIndexStatus] = useState<'ALL' | 'ready' | 'processing' | 'failed'>('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagBar, setShowTagBar] = useState(false);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [activeModuleNumber, setActiveModuleNumber] = useState(SYLLABUS_MODULES[0].moduleNumber);

  // Drag and drop state
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Modals & Popovers
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [deleteConfirmFolder, setDeleteConfirmFolder] = useState<Folder | null>(null);
  const [quickMoveResource, setQuickMoveResource] = useState<StudyResource | null>(null);
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState('');

  // Bulk ZIP state
  const [zipState, setZipState] = useState<{ busy: boolean; done: number; total: number }>({
    busy: false,
    done: 0,
    total: 0
  });

  const subject = subjects.find((s) => s.id === subjectId);
  const own = useMemo(() => resources.filter((r) => r.subjectId === subjectId), [resources, subjectId]);
  const scheme = schemeCourses.find((c) => c.id === subjectId);

  // Map of folder id -> folder
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

  // Map of folder id -> folder name
  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of folders) map.set(f.id, f.name);
    return map;
  }, [folders]);

  // Current active folder
  const activeFolder = useMemo(() => {
    if (selectedFolderId === 'ALL' || selectedFolderId === 'UNORGANIZED') return null;
    return folderMap.get(selectedFolderId) ?? null;
  }, [folderMap, selectedFolderId]);

  // Subfolders of current folder (or root folders when at root)
  const currentSubfolders = useMemo(() => {
    if (selectedFolderId === 'ALL') {
      return folders.filter((f) => !f.parentId);
    }
    if (selectedFolderId === 'UNORGANIZED') {
      return [];
    }
    return folders.filter((f) => f.parentId === selectedFolderId);
  }, [folders, selectedFolderId]);

  // Breadcrumbs calculation for nested folders
  const breadcrumbs = useMemo(() => {
    if (selectedFolderId === 'ALL' || selectedFolderId === 'UNORGANIZED') return [];
    const crumbs: Folder[] = [];
    let curId: string | null = selectedFolderId;
    const seen = new Set<string>();
    while (curId && !seen.has(curId)) {
      seen.add(curId);
      const f = folderMap.get(curId);
      if (!f) break;
      crumbs.unshift(f);
      curId = f.parentId ?? null;
    }
    return crumbs;
  }, [selectedFolderId, folderMap]);

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

  const unorganizedCount = useMemo(() => {
    return own.filter((r) => !r.folderId).length;
  }, [own]);

  // Filtered resources
  const filtered = useMemo(() => {
    let result = own;

    // 1. Folder filter
    if (selectedFolderId === 'UNORGANIZED') {
      result = result.filter((r) => !r.folderId);
    } else if (selectedFolderId !== 'ALL') {
      result = result.filter((r) => r.folderId === selectedFolderId);
    }

    // 2. Category
    if (selectedCategory !== 'ALL') {
      result = result.filter((r) => r.type === selectedCategory);
    }

    // 3. Format
    if (selectedFormat === 'pdf') {
      result = result.filter((r) => r.fileKind === 'pdf');
    } else if (selectedFormat === 'ppt') {
      result = result.filter((r) => r.fileKind === 'ppt' || r.fileKind === 'pptx');
    }

    // 4. Indexing status
    if (selectedIndexStatus === 'ready') {
      result = result.filter((r) => r.ingestStatus === 'ready');
    } else if (selectedIndexStatus === 'processing') {
      result = result.filter((r) => r.ingestStatus === 'processing' || r.ingestStatus === 'pending');
    } else if (selectedIndexStatus === 'failed') {
      result = result.filter((r) => r.ingestStatus === 'failed');
    }

    // 5. Tags
    if (selectedTags.length > 0) {
      result = result.filter((r) => selectedTags.every((t) => r.tags.includes(t)));
    }

    // 6. Search
    const q = subjectSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.uploadedBy.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [own, selectedFolderId, selectedCategory, selectedFormat, selectedIndexStatus, selectedTags, subjectSearch]);

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
    if (selectedResourceIds.size === filtered.length && filtered.length > 0) {
      setSelectedResourceIds(new Set());
    } else {
      setSelectedResourceIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
      setSelectedFolderId(newId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create folder.');
    }
  };

  const handleSaveRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFolder || !renamingName.trim()) return;
    try {
      await renameFolder(renamingFolder.id, renamingName.trim());
      setRenamingFolder(null);
      setRenamingName('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not rename folder.');
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deleteConfirmFolder) return;
    try {
      await removeFolder(deleteConfirmFolder.id);
      if (selectedFolderId === deleteConfirmFolder.id) {
        setSelectedFolderId('ALL');
      }
      setDeleteConfirmFolder(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete folder.');
    }
  };

  // Move single resource
  const handlePerformQuickMove = async (targetFolderId: string | null) => {
    if (!quickMoveResource) return;
    await moveToFolder(quickMoveResource.id, targetFolderId);
    setQuickMoveResource(null);
  };

  // Bulk ZIP download
  const handleDownloadSelectedZip = async () => {
    const selectedItems = own.filter((r) => selectedResourceIds.has(r.id));
    if (selectedItems.length === 0 || !subject) return;
    setZipState({ busy: true, done: 0, total: selectedItems.length });
    try {
      await downloadResourcesAsZip(
        subject.name,
        `${subject.courseCode}-selected`,
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

      {/* Subject Header (Official Course File Jacket) */}
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
            <button onClick={() => openUploadModal(subjectId)} className="btn btn-primary px-4">
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Add Materials</span>
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
            Study Materials ({own.length})
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

      {/* Main Study Materials View */}
      {activeTab === 'materials' && (
        <section className="pt-6 space-y-4">
          {/* 1. Compact Folder Navigation & Breadcrumbs Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-rule">
            {/* Breadcrumb Trail / Location */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setSelectedFolderId('ALL')}
                className={`font-mono text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  selectedFolderId === 'ALL'
                    ? 'text-ink'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>All Materials</span>
              </button>

              {selectedFolderId === 'UNORGANIZED' && (
                <>
                  <ChevronRight className="w-3 h-3 text-ink-3" aria-hidden="true" />
                  <span className="font-mono text-xs font-bold text-ink flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                    <span>Unorganized</span>
                  </span>
                </>
              )}

              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  <ChevronRight className="w-3 h-3 text-ink-3" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(crumb.id)}
                    className={`font-mono text-xs transition-colors flex items-center gap-1.5 ${
                      idx === breadcrumbs.length - 1
                        ? 'font-bold text-ink'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    <FolderIcon className="w-3.5 h-3.5 text-ink-2" aria-hidden="true" />
                    <span>{crumb.name}</span>
                  </button>
                </React.Fragment>
              ))}

              {/* Active Folder Actions (Ask Folder AI, Rename, Delete) */}
              {activeFolder && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-rule">
                  <button
                    type="button"
                    onClick={askActiveFolder}
                    className="btn btn-secondary px-2 py-0.5 text-[11px] font-mono flex items-center gap-1 text-ink"
                    title={`Ask Study Assistant about materials in ${activeFolder.name}`}
                  >
                    <Sparkles className="w-3 h-3 text-lime-deep" aria-hidden="true" />
                    <span>Ask Folder AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRenamingFolder(activeFolder);
                      setRenamingName(activeFolder.name);
                    }}
                    className="p-1 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
                    title="Rename folder"
                    aria-label="Rename folder"
                  >
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmFolder(activeFolder)}
                    className="p-1 text-ink-3 hover:text-alert hover:bg-paper-sunk transition-colors"
                    title="Delete folder (contents move to Unorganized)"
                    aria-label="Delete folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Folder Creator Action */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewFolderParentId(selectedFolderId !== 'ALL' && selectedFolderId !== 'UNORGANIZED' ? selectedFolderId : '');
                  setNewFolderOpen(true);
                }}
                className="btn btn-ghost px-2.5 py-1 text-xs font-mono text-ink-2 hover:text-ink flex items-center gap-1.5 border border-rule hover:border-ink"
              >
                <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>New Folder</span>
              </button>
            </div>
          </div>

          {/* 2. Compact Folder Chips Shelf (Click to enter or drag files to move) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs font-mono">
            {/* All Materials chip */}
            <button
              type="button"
              onClick={() => setSelectedFolderId('ALL')}
              className={`px-3 py-1.5 transition-colors shrink-0 flex items-center gap-1.5 border ${
                selectedFolderId === 'ALL'
                  ? 'bg-ink text-paper border-ink font-bold shadow-xs'
                  : 'bg-paper text-ink-2 border-rule hover:border-ink hover:text-ink'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All</span>
              <span className={`text-[10px] tabular ${selectedFolderId === 'ALL' ? 'text-lime' : 'text-ink-3'}`}>
                {own.length}
              </span>
            </button>

            {/* Unorganized chip with Drop Target */}
            <button
              type="button"
              onClick={() => setSelectedFolderId('UNORGANIZED')}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverFolderId('UNORGANIZED');
              }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverFolderId(null);
                const resId = e.dataTransfer.getData('application/x-resource-id') || e.dataTransfer.getData('text/plain');
                if (resId) await moveToFolder(resId, null);
              }}
              className={`px-3 py-1.5 transition-colors shrink-0 flex items-center gap-1.5 border ${
                dragOverFolderId === 'UNORGANIZED' ? 'border-2 border-lime bg-lime/20' : ''
              } ${
                selectedFolderId === 'UNORGANIZED'
                  ? 'bg-ink text-paper border-ink font-bold shadow-xs'
                  : 'bg-paper text-ink-2 border-rule hover:border-ink hover:text-ink'
              }`}
              title="Files not yet sorted into a folder (drag files here to remove from folder)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
              <span>Unorganized</span>
              <span className={`text-[10px] tabular ${selectedFolderId === 'UNORGANIZED' ? 'text-lime' : 'text-ink-3'}`}>
                {unorganizedCount}
              </span>
            </button>

            {/* Subfolders or root folders */}
            {currentSubfolders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              const isDragTarget = dragOverFolderId === folder.id;

              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverFolderId(folder.id);
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverFolderId(null);
                    const resId = e.dataTransfer.getData('application/x-resource-id') || e.dataTransfer.getData('text/plain');
                    if (resId) await moveToFolder(resId, folder.id);
                  }}
                  className={`group px-3 py-1.5 transition-colors shrink-0 flex items-center gap-1.5 border ${
                    isDragTarget ? 'border-2 border-lime bg-lime/20' : ''
                  } ${
                    isSelected
                      ? 'bg-ink text-paper border-ink font-bold shadow-xs'
                      : 'bg-paper text-ink-2 border-rule hover:border-ink hover:text-ink'
                  }`}
                  title={`Folder: ${folder.name} (${folder.resourceCount} items). Drag files here to move.`}
                >
                  <FolderIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-lime' : 'text-ink-3'}`} aria-hidden="true" />
                  <span className="truncate max-w-[160px]">{folder.name}</span>
                  <span className={`text-[10px] tabular ${isSelected ? 'text-lime' : 'text-ink-3'}`}>
                    {folder.resourceCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3. Single Unified Discovery Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 bg-paper border border-rule text-xs">
            {/* Search Input */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-paper-sunk border border-rule flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
              <input
                type="search"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Filter materials by title, tags or uploader…"
                aria-label="Filter materials in this subject"
                className="w-full bg-transparent text-xs text-ink placeholder:text-ink-3 focus:outline-none"
              />
            </div>

            {/* Filter Dropdowns in One Clean Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Select */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ResourceType | 'ALL')}
                aria-label="Filter by material category"
                className="field text-xs py-1.5 px-2 bg-paper-sunk border border-rule text-ink cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.type} value={cat.type}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {/* Indexing Status Select */}
              <select
                value={selectedIndexStatus}
                onChange={(e) => setSelectedIndexStatus(e.target.value as 'ALL' | 'ready' | 'processing' | 'failed')}
                aria-label="Filter by AI indexing status"
                className="field text-xs py-1.5 px-2 bg-paper-sunk border border-rule text-ink cursor-pointer"
              >
                <option value="ALL">All Index States</option>
                <option value="ready">Indexed for AI</option>
                <option value="processing">Indexing…</option>
                <option value="failed">Index Failed</option>
              </select>

              {/* Format Select */}
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as 'ALL' | 'pdf' | 'ppt')}
                aria-label="Filter by file format"
                className="field text-xs py-1.5 px-2 bg-paper-sunk border border-rule text-ink cursor-pointer"
              >
                <option value="ALL">All Formats</option>
                <option value="pdf">PDF only</option>
                <option value="ppt">PowerPoint (PPT/PPTX)</option>
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

              {/* Count */}
              <div className="font-mono text-[11px] text-ink-3 pl-1 shrink-0">
                <span className="text-ink font-bold tabular">{filtered.length}</span> of {own.length}
              </div>
            </div>
          </div>

          {/* 4. Secondary Tag Drawer (Hidden by default, cleanly revealed on request) */}
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

          {/* 5. Clean Resource List Table */}
          <div className="border border-rule bg-paper divide-y divide-rule overflow-hidden">
            {/* Table Header with Select All */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-paper-sunk font-mono text-[11px] text-ink-3 select-none">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-2 text-ink-3 hover:text-ink transition-colors"
                  aria-label={selectedResourceIds.size === filtered.length && filtered.length > 0 ? 'Deselect all materials' : 'Select all materials'}
                >
                  {selectedResourceIds.size > 0 && selectedResourceIds.size === filtered.length ? (
                    <CheckSquare className="w-4 h-4 text-ink fill-lime/30" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span className="uppercase tracking-[0.06em]">
                    {selectedResourceIds.size > 0
                      ? `${selectedResourceIds.size} Selected`
                      : 'Select All'}
                  </span>
                </button>
              </div>

              <div className="hidden sm:block text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                Drag rows onto folder chips to organize
              </div>
            </div>

            {/* List Rows */}
            {own.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
                <h3 className="text-sm font-bold text-ink mb-1">No Materials Filed Yet</h3>
                <p className="text-xs text-ink-2 max-w-[46ch] mx-auto mb-4">
                  Be the first to upload lecture notes, PYQs, or lab sheets for {subject.name}. Files are
                  indexed for AI study assistance in the background.
                </p>
                <button onClick={() => openUploadModal(subjectId)} className="btn btn-primary">
                  <PlusCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Upload Materials</span>
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-2">
                <p>No materials found matching current filters.</p>
                <button
                  onClick={() => {
                    setSelectedFolderId('ALL');
                    setSelectedCategory('ALL');
                    setSelectedFormat('ALL');
                    setSelectedIndexStatus('ALL');
                    setSelectedTags([]);
                    setSubjectSearch('');
                  }}
                  className="mt-2 text-ink font-semibold underline underline-offset-2"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filtered.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  isSelected={selectedResourceIds.has(resource.id)}
                  onToggleSelect={handleToggleSelect}
                  onAsk={(r) => openAssistant({ mode: 'resource', resourceId: r.id })}
                  onQuickMove={(r) => setQuickMoveResource(r)}
                  folderName={resource.folderId ? (folderNameMap.get(resource.folderId) ?? 'Folder') : 'Unorganized'}
                  showFolderBadge={selectedFolderId === 'ALL'}
                  onFolderClick={(fId) => setSelectedFolderId(fId ?? 'UNORGANIZED')}
                />
              ))
            )}
          </div>

          {/* 6. Floating Bulk Actions Bar (Appears ONLY when 1+ resources are selected) */}
          {selectedResourceIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-paper border-2 border-ink shadow-overlay px-4 py-2.5 flex items-center gap-3 flex-wrap animate-fadeIn max-w-[95vw]">
              <div className="font-mono text-xs font-bold text-ink">
                {selectedResourceIds.size} selected
              </div>

              <div className="h-4 w-[1px] bg-rule hidden sm:block" />

              {/* Bulk Move */}
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkTargetFolderId}
                  onChange={(e) => setBulkTargetFolderId(e.target.value)}
                  className="field text-xs py-1 px-2 bg-paper-sunk border border-rule text-ink cursor-pointer"
                  aria-label="Select destination folder"
                >
                  <option value="">Move to folder…</option>
                  <option value="UNORGANIZED">Unorganized (Root)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
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
                  placeholder="e.g. Module 1 - Trees, PYQ 2025"
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
                    className="field w-full px-2.5 py-2 text-xs bg-paper-sunk border border-rule"
                  >
                    <option value="">Root level (No parent)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
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
                <label className="block font-semibold text-xs text-ink mb-1">New Name</label>
                <input
                  type="text"
                  value={renamingName}
                  onChange={(e) => setRenamingName(e.target.value)}
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
                  disabled={!renamingName.trim()}
                  className="btn btn-primary text-xs px-4 py-1.5 disabled:opacity-40"
                >
                  Save Name
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

              {folders.map((f) => {
                const isCurrent = quickMoveResource.folderId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => void handlePerformQuickMove(f.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-paper-sunk transition-colors ${
                      isCurrent ? 'bg-lime/20 font-bold' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FolderIcon className="w-3.5 h-3.5 text-ink-2 shrink-0" />
                      <span className="truncate">{f.name}</span>
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

      {/* Delete Folder Confirmation Dialog */}
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
                <h3 className="text-base font-extrabold text-ink">Delete folder &ldquo;{deleteConfirmFolder.name}&rdquo;?</h3>
              </div>
              <button onClick={() => setDeleteConfirmFolder(null)} className="text-ink-3 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed">
              Files inside this folder will <strong>not be deleted</strong>. They will safely move to the <strong>Unorganized</strong> section of this subject, retaining all file contents and vector embeddings.
            </p>

            <div className="flex justify-end gap-2 pt-2">
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
    </div>
  );
};
