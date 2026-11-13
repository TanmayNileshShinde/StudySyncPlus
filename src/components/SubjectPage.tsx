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
  Edit2,
  Trash2,
  Check,
  X,
  Tag,
  CheckSquare,
  Square,
  CornerDownRight,
  Filter
} from 'lucide-react';

const CATEGORY_TABS: Array<{ label: string; type: ResourceType | 'ALL'; short: string }> = [
  { label: 'All', type: 'ALL', short: 'All' },
  { label: 'Lecture Notes', type: 'Lecture Notes', short: 'Notes' },
  { label: 'Past Papers / PYQs', type: 'Past Exam Papers', short: 'PYQs' },
  { label: 'Lab Manuals', type: 'Lab Manual', short: 'Labs' },
  { label: 'Cheat Sheets', type: 'Cheat Sheet', short: 'Sheets' },
  { label: 'Reference Books', type: 'Reference Book', short: 'Books' }
];

/** Ingestion state badge */
const IngestMark: React.FC<{ resource: StudyResource }> = ({ resource }) => {
  if (!resource.hasFile) return null;
  if (resource.ingestStatus === 'ready') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-lime-text bg-lime/15 px-1.5 py-0.5 border border-lime/30"
        title={`Indexed ${resource.chunkCount ?? 0} vector chunks ready for AI queries`}
      >
        <span className="w-1.5 h-1.5 bg-lime-deep inline-block" aria-hidden="true" />
        Indexed
      </span>
    );
  }
  if (resource.ingestStatus === 'failed') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-alert bg-alert/10 px-1.5 py-0.5 border border-alert/30"
        title={resource.ingestError ?? 'Vector indexing failed'}
      >
        <span className="w-1.5 h-1.5 bg-alert inline-block" aria-hidden="true" />
        Failed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 bg-paper-sunk px-1.5 py-0.5 border border-rule"
      title="Extracting pages & building vector embeddings"
    >
      <LoaderCircle className="w-3 h-3 animate-spin text-lime-deep" aria-hidden="true" />
      Indexing
    </span>
  );
};

interface ResourceRowProps {
  resource: StudyResource;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onAsk: (resource: StudyResource) => void;
  folderNameMap: Map<string, string>;
  showFolderTag: boolean;
}

const ResourceRow: React.FC<ResourceRowProps> = ({
  resource,
  isSelected,
  onToggleSelect,
  onAsk,
  folderNameMap,
  showFolderTag
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
  const folderName = resource.folderId ? folderNameMap.get(resource.folderId) : 'Unorganized';

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
      className={`group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 gap-y-1.5 px-3.5 sm:px-4 py-3 transition-colors cursor-pointer border-b border-rule last:border-b-0 ${
        isSelected ? 'bg-lime/10 hover:bg-lime/15' : 'bg-paper hover:bg-lime-wash/60'
      }`}
    >
      {/* Checkbox */}
      <div
        className="flex items-center justify-center p-1"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(resource.id);
        }}
      >
        <button
          type="button"
          aria-label={isSelected ? `Deselect ${resource.title}` : `Select ${resource.title}`}
          className="text-ink-3 hover:text-ink transition-colors"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-ink fill-lime/30" aria-hidden="true" />
          ) : (
            <Square className="w-4 h-4 text-ink-3 group-hover:text-ink" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Main Details */}
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
          {isDeck ? (
            <Presentation className="w-4 h-4 text-ink-3 shrink-0 group-hover:text-ink" aria-hidden="true" />
          ) : (
            <FileText className="w-4 h-4 text-ink-3 shrink-0 group-hover:text-ink" aria-hidden="true" />
          )}
          <span className="text-[13.5px] font-bold text-ink truncate group-hover:text-ink-2">
            {resource.title}
          </span>
          <span className="stamp stamp-outline text-[9px] py-0 px-1 font-mono shrink-0 hidden md:inline-flex">
            {resource.type}
          </span>
          {showFolderTag && (
            <span className="stamp bg-paper-sunk border border-rule text-ink-3 text-[9px] py-0 px-1 font-mono shrink-0 hidden lg:inline-flex items-center gap-1">
              <FolderIcon className="w-2.5 h-2.5" aria-hidden="true" />
              <span>{folderName}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap font-mono text-[10.5px] text-ink-3 mt-1 truncate">
          <span>{resource.fileSize}</span>
          <span>·</span>
          <span>{resource.uploadedBy} ({resource.rollNumber})</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-lime text-lime-deep" aria-hidden="true" />
            {resource.rating > 0 ? resource.rating.toFixed(1) : 'Unrated'}
          </span>
          <span className="hidden sm:inline">· {resource.uploadDate}</span>

          {resource.tags && resource.tags.length > 0 && (
            <span className="hidden xl:inline-flex items-center gap-1 ml-1 text-ink-3">
              {resource.tags.slice(0, 3).map((t) => (
                <span key={t} className="bg-paper-sunk px-1 border border-rule text-[9.5px]">
                  #{t}
                </span>
              ))}
              {resource.tags.length > 3 && <span>+{resource.tags.length - 3}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Index Status */}
      <div className="hidden sm:block shrink-0">
        <IngestMark resource={resource} />
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => void downloadResource(resource)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={`Download ${resource.title}`}
          title="Download file"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          onClick={() => void toggleBookmark(resource.id)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={bookmarked ? `Remove ${resource.title} from saved` : `Save ${resource.title}`}
          aria-pressed={bookmarked}
          title={bookmarked ? 'Saved for exam revision' : 'Save for revision'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-lime-deep text-lime-deep' : ''}`} aria-hidden="true" />
        </button>

        <button
          onClick={() => onAsk(resource)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={`Ask Study Assistant about ${resource.title}`}
          title="Ask AI about this document"
        >
          <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
        </button>

        {resource.ingestStatus === 'failed' && (
          <button
            onClick={() => void handleRetry()}
            className="p-1.5 text-alert hover:bg-paper-sunk transition-colors"
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
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [activeModuleNumber, setActiveModuleNumber] = useState(SYLLABUS_MODULES[0].moduleNumber);

  // Drag & drop state
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Folder management state
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [deleteConfirmFolder, setDeleteConfirmFolder] = useState<Folder | null>(null);
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

  // Folder lookup map
  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of folders) {
      map.set(f.id, f.name);
    }
    return map;
  }, [folders]);

  // Available unique tags across this subject
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

  // Unorganized resource count (files without folderId)
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

    // 2. Category tab
    if (selectedCategory !== 'ALL') {
      result = result.filter((r) => r.type === selectedCategory);
    }

    // 3. Format filter
    if (selectedFormat === 'pdf') {
      result = result.filter((r) => r.fileKind === 'pdf');
    } else if (selectedFormat === 'ppt') {
      result = result.filter((r) => r.fileKind === 'ppt' || r.fileKind === 'pptx');
    }

    // 4. Index status filter
    if (selectedIndexStatus === 'ready') {
      result = result.filter((r) => r.ingestStatus === 'ready');
    } else if (selectedIndexStatus === 'processing') {
      result = result.filter((r) => r.ingestStatus === 'processing' || r.ingestStatus === 'pending');
    } else if (selectedIndexStatus === 'failed') {
      result = result.filter((r) => r.ingestStatus === 'failed');
    }

    // 5. Multi-tag filter
    if (selectedTags.length > 0) {
      result = result.filter((r) => selectedTags.every((t) => r.tags.includes(t)));
    }

    // 6. Search query
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

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: own.length };
    for (const r of own) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
  }, [own]);

  // Active folder details
  const activeFolder = useMemo(() => {
    if (selectedFolderId === 'ALL' || selectedFolderId === 'UNORGANIZED') return null;
    return folders.find((f) => f.id === selectedFolderId) ?? null;
  }, [folders, selectedFolderId]);

  // User uploaded resources in current selection (for deletion gating)
  const userUploadedSelectedIds = useMemo(() => {
    return Array.from(selectedResourceIds).filter((id) => {
      const res = own.find((r) => r.id === id);
      return res && res.isUserUploaded && res.ownerKey === ownerKey;
    });
  }, [selectedResourceIds, own, ownerKey]);

  // Multi-select helpers
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

  // Folder actions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(
        subjectId,
        newFolderName.trim(),
        newFolderParentId ? newFolderParentId : undefined
      );
      setNewFolderName('');
      setNewFolderParentId('');
      setNewFolderOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create folder.');
    }
  };

  const handleSaveRenameFolder = async (id: string) => {
    if (!editingFolderName.trim()) return;
    try {
      await renameFolder(id, editingFolderName.trim());
      setEditingFolderId(null);
      setEditingFolderName('');
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

  // Handle Full Subject ZIP
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-paper-sunk border border-rule" />
          ))}
        </div>
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
            The subject identifier <code className="bg-paper-sunk px-1.5 py-0.5 font-mono text-[11px] text-ink">{subjectId}</code> does not match any course.
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
    <div className="px-4 sm:px-8 pb-32 md:pb-24 animate-fadeIn">
      {/* Mobile Back Link */}
      <button
        onClick={openHome}
        className="md:hidden flex items-center gap-1.5 pt-4 pb-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>All Subjects</span>
      </button>

      {/* Subject Header */}
      <header className="pt-5 sm:pt-8 pb-6 border-b border-ink">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span className="stamp stamp-ink font-mono text-[11px]">{subject.courseCode}</span>
          {scheme && <span className="stamp stamp-outline text-[11px] font-bold">{scheme.credits} Credits</span>}
          {scheme && <span className="stamp stamp-outline text-[11px] hidden sm:inline-flex">{scheme.category}</span>}
          <span className="stamp stamp-verified bg-lime text-ink text-[10px] hidden sm:inline-flex">Official Course File</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-[2.1rem] sm:text-[2.85rem] font-black tracking-[-0.03em] leading-[1.04] text-ink">
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

      {/* Main Tab Content */}
      {activeTab === 'materials' && (
        <section className="pt-6">
          {/* Two-Column Responsive Workspace: Folder Tree (Left) + Document Browser (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
            {/* Left Column: Folders Rail */}
            <aside className="border border-rule bg-paper">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-rule bg-paper-sunk">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink flex items-center gap-1.5">
                  <FolderIcon className="w-3.5 h-3.5 text-ink-2" aria-hidden="true" />
                  <span>Folders</span>
                </span>
                <button
                  onClick={() => setNewFolderOpen((v) => !v)}
                  className="btn btn-ghost px-1.5 py-0.5 text-[11px] font-mono text-ink-2 hover:text-ink flex items-center gap-1"
                  title="Create a new folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>New</span>
                </button>
              </div>

              {/* Inline Create Folder Form */}
              {newFolderOpen && (
                <form onSubmit={handleCreateFolder} className="p-3 border-b border-rule bg-lime-wash/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-ink-2">Create Folder</span>
                    <button
                      type="button"
                      onClick={() => setNewFolderOpen(false)}
                      className="text-ink-3 hover:text-ink p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name (e.g. Module 1, Lab Codes)"
                    className="field w-full px-2 py-1 text-xs"
                    autoFocus
                  />
                  {folders.length > 0 && (
                    <select
                      value={newFolderParentId}
                      onChange={(e) => setNewFolderParentId(e.target.value)}
                      className="field w-full px-2 py-1 text-[11px]"
                    >
                      <option value="">Root level (No parent)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          Subfolder of: {f.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setNewFolderOpen(false)}
                      className="btn btn-ghost text-xs px-2 py-0.5"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={!newFolderName.trim()} className="btn btn-primary text-xs px-3 py-0.5">
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* Folder Tree Items */}
              <div className="divide-y divide-rule font-mono text-[12px]">
                {/* 1. All Materials */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedFolderId('ALL')}
                  className={`flex items-center justify-between px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                    selectedFolderId === 'ALL'
                      ? 'bg-ink text-paper font-bold shadow-xs'
                      : 'hover:bg-paper-sunk text-ink'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">All Materials</span>
                  </span>
                  <span className={`text-[10px] tabular ${selectedFolderId === 'ALL' ? 'text-lime' : 'text-ink-3'}`}>
                    {own.length}
                  </span>
                </div>

                {/* 2. Unorganized (Root) with Drop Target */}
                <div
                  role="button"
                  tabIndex={0}
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
                  className={`flex items-center justify-between px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                    dragOverFolderId === 'UNORGANIZED' ? 'bg-lime/20 border-2 border-lime' : ''
                  } ${
                    selectedFolderId === 'UNORGANIZED'
                      ? 'bg-ink text-paper font-bold shadow-xs'
                      : 'hover:bg-paper-sunk text-ink-2'
                  }`}
                  title="Files that have not been sorted into a folder (drag files here to remove from folders)"
                >
                  <span className="flex items-center gap-2 truncate">
                    <FolderOpen className="w-3.5 h-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                    <span className="truncate">Unorganized</span>
                  </span>
                  <span className={`text-[10px] tabular ${selectedFolderId === 'UNORGANIZED' ? 'text-lime' : 'text-ink-3'}`}>
                    {unorganizedCount}
                  </span>
                </div>

                {/* 3. Custom Folders */}
                {folders.map((folder) => {
                  const isSelected = selectedFolderId === folder.id;
                  const isDragTarget = dragOverFolderId === folder.id;
                  const isNested = Boolean(folder.parentId);

                  return (
                    <div
                      key={folder.id}
                      role="button"
                      tabIndex={0}
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
                      className={`group flex items-center justify-between px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                        isNested ? 'pl-7' : ''
                      } ${isDragTarget ? 'bg-lime/25 border-2 border-lime' : ''} ${
                        isSelected ? 'bg-ink text-paper font-bold shadow-xs' : 'hover:bg-paper-sunk text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        {isNested ? (
                          <CornerDownRight className="w-3 h-3 text-ink-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <FolderIcon
                            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-lime' : 'text-ink-2'}`}
                            aria-hidden="true"
                          />
                        )}

                        {editingFolderId === folder.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              className="field px-1.5 py-0.5 text-xs text-ink bg-paper"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSaveRenameFolder(folder.id);
                                if (e.key === 'Escape') setEditingFolderId(null);
                              }}
                            />
                            <button
                              onClick={() => void handleSaveRenameFolder(folder.id)}
                              className="p-1 text-lime hover:text-lime-deep"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingFolderId(null)}
                              className="p-1 text-ink-3 hover:text-ink"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="truncate">{folder.name}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-[10px] tabular ${isSelected ? 'text-lime' : 'text-ink-3'}`}>
                          {folder.resourceCount}
                        </span>

                        {editingFolderId !== folder.id && (
                          <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                            <button
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                              }}
                              className={`p-1 hover:text-ink transition-colors ${
                                isSelected ? 'text-paper hover:bg-paper/20' : 'text-ink-3 hover:bg-paper'
                              }`}
                              title="Rename folder"
                              aria-label={`Rename ${folder.name}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmFolder(folder)}
                              className={`p-1 hover:text-alert transition-colors ${
                                isSelected ? 'text-paper hover:bg-paper/20' : 'text-ink-3 hover:bg-paper'
                              }`}
                              title="Delete folder (resources will move to Unorganized)"
                              aria-label={`Delete ${folder.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drag drop hint */}
              <div className="p-2.5 border-t border-rule bg-paper-sunk text-[10px] font-mono text-ink-3 text-center">
                Drag any resource to move into folders
              </div>
            </aside>

            {/* Right Column: Document Catalog & Filters */}
            <main className="space-y-4 min-w-0">
              {/* Active Folder Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border border-rule bg-paper">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1.5 bg-paper-sunk border border-rule text-ink">
                    <FolderIcon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-ink truncate">
                      {selectedFolderId === 'ALL'
                        ? 'All Materials'
                        : selectedFolderId === 'UNORGANIZED'
                          ? 'Unorganized Files'
                          : activeFolder?.name ?? 'Folder'}
                    </h2>
                    <p className="font-mono text-[10.5px] text-ink-3">
                      Showing {filtered.length} of {own.length} resources
                    </p>
                  </div>
                </div>

                {/* Scope-level AI ask */}
                {selectedFolderId !== 'ALL' && selectedFolderId !== 'UNORGANIZED' && activeFolder && (
                  <button
                    onClick={askActiveFolder}
                    className="btn btn-secondary px-3 py-1 text-xs font-mono shrink-0 flex items-center gap-1.5"
                    title={`Ask Study Assistant about all materials in ${activeFolder.name}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-lime-deep" />
                    <span>Ask Folder AI</span>
                  </button>
                )}
              </div>

              {/* Category Pills & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {CATEGORY_TABS.map((tab) => {
                    const count = tabCounts[tab.type] || 0;
                    if (tab.type !== 'ALL' && count === 0) return null;
                    const active = selectedCategory === tab.type;
                    return (
                      <button
                        key={tab.type}
                        onClick={() => setSelectedCategory(tab.type)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-none transition-colors shrink-0 flex items-center gap-1.5 ${
                          active
                            ? 'bg-ink text-paper shadow-[inset_0_-2px_0_var(--lime)]'
                            : 'bg-paper text-ink-2 border border-rule hover:border-ink hover:text-ink'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`font-mono text-[10px] tabular ${active ? 'text-lime' : 'text-ink-3'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <label className="relative w-full md:w-64 shrink-0">
                  <input
                    type="search"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Search notes, tags…"
                    aria-label="Filter materials in this subject"
                    className="field w-full px-3 py-1.5 text-[12.5px]"
                  />
                </label>
              </div>

              {/* Smart Filter Bar (Format + Index Status) */}
              <div className="flex flex-wrap items-center gap-3 py-2 px-3 border border-rule bg-paper-sunk text-xs font-mono">
                <div className="flex items-center gap-1.5 text-ink-3">
                  <Filter className="w-3 h-3" />
                  <span className="uppercase text-[10px] tracking-wider">Format:</span>
                  {(['ALL', 'pdf', 'ppt'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-1.5 py-0.5 uppercase text-[10.5px] transition-colors ${
                        selectedFormat === fmt ? 'bg-ink text-paper font-bold' : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                <div className="h-3 w-[1px] bg-rule hidden sm:block" />

                <div className="flex items-center gap-1.5 text-ink-3">
                  <span className="uppercase text-[10px] tracking-wider">AI Index:</span>
                  {(['ALL', 'ready', 'processing', 'failed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedIndexStatus(st)}
                      className={`px-1.5 py-0.5 uppercase text-[10.5px] transition-colors ${
                        selectedIndexStatus === st ? 'bg-ink text-paper font-bold' : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      {st === 'ready' ? 'Indexed' : st === 'processing' ? 'Indexing' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Chips Filter Bar */}
              {availableTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <Tag className="w-3 h-3 text-ink-3 shrink-0 ml-1" />
                  <span className="font-mono text-[10px] uppercase text-ink-3 tracking-wider shrink-0">Tags:</span>
                  {availableTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-2 py-0.5 font-mono text-[10.5px] transition-colors shrink-0 border ${
                          active
                            ? 'bg-lime text-ink border-lime font-bold'
                            : 'bg-paper text-ink-3 border-rule hover:border-ink hover:text-ink'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-[10px] font-mono text-ink-3 hover:text-alert underline underline-offset-2 ml-1 shrink-0"
                    >
                      Clear tags
                    </button>
                  )}
                </div>
              )}

              {/* Document Rows Header with Select-All */}
              <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 border border-rule border-b-0 bg-paper-sunk font-mono text-[11px] text-ink-3 select-none">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-2 hover:text-ink transition-colors"
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
                <div className="hidden sm:block text-[10px] uppercase tracking-[0.06em]">
                  Drag row to folder to organize
                </div>
              </div>

              {/* Resource Rows List */}
              {own.length === 0 ? (
                <div className="ruled-sunk p-10 text-center">
                  <FileText className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-ink mb-1">No Materials Filed Yet</h3>
                  <p className="text-xs text-ink-2 max-w-[46ch] mx-auto mb-4">
                    Be the first to contribute lecture notes, PYQs, or slides for {subject.name}. Files are
                    indexed for the AI Study Assistant automatically.
                  </p>
                  <button onClick={() => openUploadModal(subjectId)} className="btn btn-primary">
                    <PlusCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Upload Materials</span>
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="ruled-sunk p-8 text-center text-xs text-ink-2">
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
                <div className="ruled divide-y divide-rule overflow-hidden">
                  {filtered.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      resource={resource}
                      isSelected={selectedResourceIds.has(resource.id)}
                      onToggleSelect={handleToggleSelect}
                      onAsk={(r) => openAssistant({ mode: 'resource', resourceId: r.id })}
                      folderNameMap={folderNameMap}
                      showFolderTag={selectedFolderId === 'ALL'}
                    />
                  ))}
                </div>
              )}
            </main>
          </div>

          {/* Sticky Bulk Action Bar */}
          {selectedResourceIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-paper border-2 border-ink shadow-overlay px-4 py-2.5 flex items-center gap-3 flex-wrap animate-fadeIn max-w-[95vw]">
              <div className="font-mono text-xs font-bold text-ink">
                {selectedResourceIds.size} selected
              </div>

              <div className="h-4 w-[1px] bg-rule hidden sm:block" />

              {/* Bulk Move to Folder */}
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkTargetFolderId}
                  onChange={(e) => setBulkTargetFolderId(e.target.value)}
                  className="field text-xs py-1 px-2"
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

              {/* Ask AI about selected */}
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
                title="Ask Study Assistant questions synthesized across only these selected documents"
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

              {/* Deselect */}
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

      {/* Syllabus & Viva Guide Tab */}
      {activeTab === 'syllabus' && (
        <section className="pt-6 space-y-6">
          <div className="ruled p-5 bg-paper">
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

          <div className="ruled p-5 sm:p-6 space-y-5 bg-paper">
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
                    <li key={i} className="flex items-start gap-2.5 p-3 ruled-sunk text-xs sm:text-sm text-ink-2">
                      <span className="w-1.5 h-1.5 bg-lime-deep mt-2 shrink-0" aria-hidden="true" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ruled-sunk p-4">
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
          <div className="ruled p-5 sm:p-6 bg-paper space-y-4">
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

      {/* Delete Folder Confirmation Dialog */}
      {deleteConfirmFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
          onClick={() => setDeleteConfirmFolder(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="ruled max-w-md w-full bg-paper p-6 shadow-overlay animate-fadeIn space-y-4"
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
              Files inside this folder will <strong>not be deleted</strong>. They will safely move to the <strong>Unorganized</strong> section of this subject, retaining all file contents and AI vector embeddings.
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
