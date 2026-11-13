import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useResources } from '../context/ResourceContext';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
import { asSubjectId } from '../lib/convexIds';
import type { ResourceType, StudyResource } from '../types';
import { X, UploadCloud, FileText, Presentation, LoaderCircle, CheckCircle2, AlertCircle, Trash2, RotateCcw, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

const RESOURCE_TYPES: ResourceType[] = [
  'Lecture Notes',
  'Past Exam Papers',
  'Lab Manual',
  'Cheat Sheet',
  'Reference Book'
];

/** Parity with the server-side storage cap. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const CONFETTI_COLORS = ['#111111', '#a3e635', '#d6d3d1'];

const DEMO_STUDENT = { name: 'Tanmay Shinde', studentId: '126BTCM2008' };
const UPLOADER_STORAGE_KEY = 'studysyncplus_uploader_v1';

type UploadPhase = 'queued' | 'uploading' | 'uploaded' | 'failed';
type IndexingPhase = 'pending' | 'processing' | 'ready' | 'failed' | null;

interface QueueItem {
  uid: string;
  file: File;
  title: string;
  type: ResourceType;
  note: string; // optional per-file description override
  uploadStatus: UploadPhase;
  indexingStatus: IndexingPhase;
  progress: number; // 0..100 while uploading bytes
  error?: string;
  createdId?: string;
}

const ACCEPTED = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

function isAcceptedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    ACCEPTED.includes(file.type) ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.pptx')
  );
}

function cleanTitle(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.slice(0, 90);
}

function loadUploader(): { name: string; roll: string } {
  try {
    const raw = localStorage.getItem(UPLOADER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { name?: string; roll?: string };
      if (parsed.name && parsed.roll) return { name: parsed.name, roll: parsed.roll };
    }
  } catch {
    // fall through to demo defaults
  }
  return { name: DEMO_STUDENT.name, roll: DEMO_STUDENT.studentId };
}

const StatusCell: React.FC<{ item: QueueItem }> = ({ item }) => {
  if (item.uploadStatus === 'queued') {
    return <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">Queued</span>;
  }
  if (item.uploadStatus === 'uploading') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 tabular w-16">
        Uploading {item.progress}%
      </span>
    );
  }
  if (item.uploadStatus === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-alert" title={item.error}>
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
        Upload Failed
      </span>
    );
  }

  // Upload succeeded — show live background indexing pipeline status
  switch (item.indexingStatus) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-lime-text">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Indexed
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2">
          <LoaderCircle className="w-3 h-3 animate-spin text-lime-deep" aria-hidden="true" />
          Indexing…
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-alert" title={item.error}>
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Index Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          <span className="w-1.5 h-1.5 bg-ink-3 inline-block" aria-hidden="true" />
          Queued for AI
        </span>
      );
  }
};

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Subject preselected when opened from inside a subject. */
  subjectId: string | null;
  folderId?: string | null;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, subjectId, folderId }) => {
  const { subjects, createResource, reindexResource, showToast, resources } = useResources();
  const panelRef = useOverlayBehavior(isOpen, onClose);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [uploaderName, setUploaderName] = useState(DEMO_STUDENT.name);
  const [uploaderRoll, setUploaderRoll] = useState(DEMO_STUDENT.studentId);
  const [defaultType, setDefaultType] = useState<ResourceType>('Lecture Notes');
  const [dragOver, setDragOver] = useState(false);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [confettiDone, setConfettiDone] = useState(false);

  const subjectFolders = useQuery(
    api.folders.listBySubject,
    selectedSubjectId ? { subjectId: asSubjectId(selectedSubjectId) } : 'skip'
  ) ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;

  // Reset the modal each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    const saved = loadUploader();
    setUploaderName(saved.name);
    setUploaderRoll(saved.roll);
    setSelectedSubjectId(subjectId ?? subjects[0]?.id ?? '');
    setSelectedFolderId(folderId ?? '');
    setItems([]);
    setRunning(false);
    setConfettiDone(false);
    setExpandedUid(null);
    setDefaultType('Lecture Notes');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subjectId]);

  // The live query reports real-time background indexing outcomes for created rows.
  useEffect(() => {
    if (!isOpen || resources.length === 0) return;
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (!item.createdId || item.uploadStatus !== 'uploaded') return item;
        const row: StudyResource | undefined = resources.find((r) => r.id === item.createdId);
        if (!row) return item;
        if (row.ingestStatus !== item.indexingStatus) {
          changed = true;
          return {
            ...item,
            indexingStatus: row.ingestStatus,
            error: row.ingestStatus === 'failed' ? (row.ingestError ?? 'Indexing failed.') : undefined,
          };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [resources, isOpen]);

  const subject = subjects.find((s) => s.id === selectedSubjectId);

  const addFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const accepted: QueueItem[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      if (!isAcceptedFile(file)) {
        rejected.push(`${file.name} — only PDF, PPT and PPTX files can be catalogued`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} — over the 50 MB limit`);
        continue;
      }
      if (file.size === 0) {
        rejected.push(`${file.name} — the file is empty`);
        continue;
      }
      accepted.push({
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        title: cleanTitle(file.name),
        type: defaultType,
        note: '',
        uploadStatus: 'queued',
        indexingStatus: null,
        progress: 0
      });
    }
    setItems((prev) => [...prev, ...accepted]);
    if (rejected.length > 0) showToast(rejected[0] + (rejected.length > 1 ? ` (+${rejected.length - 1} more skipped)` : ''));
  };

  const updateItem = (uid: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  };

  const removeItem = (uid: string) => setItems((prev) => prev.filter((item) => item.uid !== uid));

  /**
   * Decoupled workflow:
   * 1. Upload bytes to Convex storage + write resource record.
   * 2. As soon as upload succeeds, item is 'uploaded' and server runs background indexing!
   * 3. Modal can be closed immediately.
   */
  const processItem = async (item: QueueItem): Promise<void> => {
    const description =
      item.note.trim().length >= 15
        ? item.note.trim()
        : `${item.type} for ${subject?.name ?? 'the course'} — shared by ${uploaderName.trim() || 'a student'}.`;
    const input = {
      file: item.file,
      title: item.title.trim(),
      subjectId: selectedSubjectId,
      folderId: selectedFolderId ? selectedFolderId : undefined,
      type: item.type,
      uploadedBy: uploaderName.trim(),
      rollNumber: uploaderRoll.trim().toUpperCase(),
      description,
      tags: subject ? [subject.courseCode, 'Semester3'] : ['Semester3']
    };
    try {
      updateItem(item.uid, { uploadStatus: 'uploading', progress: 0, error: undefined });
      const createdId = await createResource(input, (pct) => updateItem(item.uid, { progress: pct }));
      // Storage upload & database filing complete! Server scheduled background vector indexing.
      updateItem(item.uid, {
        uploadStatus: 'uploaded',
        indexingStatus: 'pending',
        progress: 100,
        createdId,
      });
    } catch (e) {
      updateItem(item.uid, {
        uploadStatus: 'failed',
        error: e instanceof Error ? e.message : 'Upload failed. Please try again.'
      });
    }
  };

  const startUpload = async () => {
    if (running || !selectedSubjectId) return;
    // Client-side title validation before any upload starts.
    const pending = itemsRef.current.filter((i) => i.uploadStatus === 'queued' || i.uploadStatus === 'failed');
    for (const item of pending) {
      if (item.title.trim().length < 6) {
        updateItem(item.uid, { uploadStatus: 'failed', error: 'Title must be at least 6 characters long.' });
      }
    }
    if (uploaderName.trim().length < 3) {
      showToast('Please provide the uploader name (at least 3 characters).');
      return;
    }
    if (!/^[0-9a-zA-Z]{2,15}$/.test(uploaderRoll.trim())) {
      showToast('Invalid roll number format (e.g. 126BTCM2008 or 67).');
      return;
    }
    try {
      localStorage.setItem(UPLOADER_STORAGE_KEY, JSON.stringify({ name: uploaderName.trim(), roll: uploaderRoll.trim() }));
    } catch {
      // Storage blocked — defaults stay.
    }

    setRunning(true);
    const queue = itemsRef.current.filter((i) => i.uploadStatus === 'queued' || (i.uploadStatus === 'failed' && i.title.trim().length >= 6));
    for (const item of queue) {
      const current = itemsRef.current.find((i) => i.uid === item.uid);
      if (!current || current.uploadStatus === 'uploaded') continue;
      await processItem(item);
    }
    setRunning(false);
  };

  const retryItem = async (uid: string) => {
    const item = itemsRef.current.find((i) => i.uid === uid);
    if (!item || running) return;
    // If the file was already uploaded to Convex, retry background indexing ONLY (never re-upload bytes!)
    if (item.uploadStatus === 'uploaded' && item.createdId) {
      updateItem(uid, { indexingStatus: 'processing', error: undefined });
      try {
        const result = await reindexResource(item.createdId);
        if (result.status === 'ready') {
          updateItem(uid, { indexingStatus: 'ready', error: undefined });
        } else {
          updateItem(uid, { indexingStatus: 'failed', error: result.message });
        }
      } catch (e) {
        updateItem(uid, { indexingStatus: 'failed', error: e instanceof Error ? e.message : 'Re-index failed.' });
      }
      return;
    }
    // Upload failed — retry byte upload
    updateItem(uid, { uploadStatus: 'queued', error: undefined, createdId: undefined });
    await processItem(item);
  };

  const isActivelyUploading = running || items.some((i) => i.uploadStatus === 'uploading');
  const queuedCount = items.filter((i) => i.uploadStatus === 'queued').length;
  const uploadedCount = items.filter((i) => i.uploadStatus === 'uploaded').length;
  const readyCount = items.filter((i) => i.indexingStatus === 'ready').length;
  const failedCount = items.filter((i) => i.uploadStatus === 'failed' || i.indexingStatus === 'failed').length;
  const settled = items.length > 0 && !isActivelyUploading && queuedCount === 0;

  // Author success moment when every file has completed indexing
  useEffect(() => {
    if (!settled || failedCount > 0 || readyCount === 0 || confettiDone || readyCount !== items.length) return;
    setConfettiDone(true);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, failedCount, readyCount, items.length]);

  const canStart = (queuedCount > 0 || items.some((i) => i.uploadStatus === 'failed')) && !!selectedSubjectId && !isActivelyUploading;

  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const parts: string[] = [];
    if (uploadedCount > 0) parts.push(`${uploadedCount} uploaded`);
    if (readyCount > 0) parts.push(`${readyCount} indexed for AI`);
    if (queuedCount > 0) parts.push(`${queuedCount} queued`);
    if (failedCount > 0) parts.push(`${failedCount} failed`);
    return parts.join(' · ');
  }, [items.length, uploadedCount, readyCount, queuedCount, failedCount]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isActivelyUploading) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-upload-title"
        className="ruled w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-overlay animate-fadeIn bg-paper"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-ink sticky top-0 bg-paper z-10">
          <div className="min-w-0">
            <h2 id="bulk-upload-title" className="text-lg font-extrabold text-ink leading-tight">
              Add materials
            </h2>
            <p className="text-xs text-ink-2 mt-0.5">
              PDFs, PPTs and PPTX decks. Uploads save instantly; AI indexing runs seamlessly in the background.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost px-2 shrink-0"
            aria-label="Close"
            disabled={isActivelyUploading}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 text-[13px]">
          {/* Asynchronous indexing banner when files are saved to Convex */}
          {uploadedCount > 0 && (
            <div className="p-3 bg-lime/10 border border-lime text-xs text-ink flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-lime-deep shrink-0" aria-hidden="true" />
                <span className="truncate">
                  <strong>{uploadedCount} file{uploadedCount === 1 ? '' : 's'} saved to storage.</strong> Background AI indexing continues while you study.
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary px-3 py-1 text-xs shrink-0"
              >
                Done / Close
              </button>
            </div>
          )}

          {/* Subject & Folder pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bulk-subject" className="block font-semibold text-ink mb-1">
                Subject
              </label>
              <select
                id="bulk-subject"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedFolderId('');
                }}
                disabled={isActivelyUploading}
                className="field w-full pl-3 pr-8 py-2.5"
              >
                {subjects.length === 0 && <option value="">No subjects available</option>}
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.courseCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bulk-folder" className="block font-semibold text-ink mb-1 flex items-center gap-1.5">
                <FolderIcon className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                <span>Target Folder (Optional)</span>
              </label>
              <select
                id="bulk-folder"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                disabled={isActivelyUploading}
                className="field w-full pl-3 pr-8 py-2.5"
              >
                <option value="">Unorganized (Subject root)</option>
                {subjectFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name} ({f.resourceCount} {f.resourceCount === 1 ? 'file' : 'files'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dropzone */}
          {items.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Choose files to add"
              className={`p-8 sm:p-10 text-center cursor-pointer transition-colors border border-dashed ${
                dragOver ? 'border-ink bg-lime-wash' : 'border-rule hover:border-ink hover:bg-paper-sunk'
              }`}
            >
              <UploadCloud className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">Drop files here, or click to browse</p>
              <p className="font-mono text-[11px] text-ink-3 mt-1">PDF · PPT · PPTX — up to 50 MB each</p>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="sr-only"
            aria-label="Add files"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* File rows */}
          {items.length > 0 && (
            <div className="border border-rule divide-y divide-rule">
              {items.map((item) => (
                <div key={item.uid} className="px-3 py-3">
                  <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_130px_auto_auto] items-center gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.file.name.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <Presentation className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
                        )}
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(item.uid, { title: e.target.value })}
                          disabled={item.uploadStatus === 'uploading' || item.uploadStatus === 'uploaded'}
                          aria-label={`Title for ${item.file.name}`}
                          className="field flex-1 min-w-0 px-2 py-1 text-[13px] font-semibold"
                          placeholder="Material title"
                        />
                      </div>
                      <p className="font-mono text-[10px] text-ink-3 mt-1 truncate">
                        {item.file.name} · {(item.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      {item.error && (
                        <p className="text-alert text-[11px] mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{item.error}</span>
                        </p>
                      )}
                      {item.uploadStatus === 'uploading' && (
                        <div className="h-1 bg-rule mt-1.5" aria-hidden="true">
                          <div className="h-full bg-lime-deep transition-[width] duration-200" style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                    </div>

                    <select
                      value={item.type}
                      onChange={(e) => updateItem(item.uid, { type: e.target.value as ResourceType })}
                      disabled={item.uploadStatus !== 'queued' && item.uploadStatus !== 'failed'}
                      aria-label={`Category for ${item.file.name}`}
                      className="field w-full sm:w-[130px] pl-2.5 pr-8 py-1.5 text-[12px]"
                    >
                      {RESOURCE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <div className="justify-self-end sm:order-none">
                      <StatusCell item={item} />
                    </div>

                    <div className="flex items-center gap-0.5 justify-self-end">
                      <button
                        onClick={() => setExpandedUid(expandedUid === item.uid ? null : item.uid)}
                        className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
                        aria-label={`${expandedUid === item.uid ? 'Hide' : 'Add'} note for ${item.file.name}`}
                        aria-expanded={expandedUid === item.uid}
                        title="Add a note (description)"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedUid === item.uid ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {(item.uploadStatus === 'failed' || item.indexingStatus === 'failed') && (
                        <button
                          onClick={() => void retryItem(item.uid)}
                          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
                          aria-label={`Retry ${item.file.name}`}
                          title={item.uploadStatus === 'uploaded' ? 'Retry AI Indexing (without re-uploading file)' : 'Retry Upload'}
                        >
                          <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        onClick={() => removeItem(item.uid)}
                        disabled={item.uploadStatus === 'uploading'}
                        className="p-1.5 text-ink-3 hover:text-alert hover:bg-paper-sunk transition-colors disabled:opacity-30"
                        aria-label={`Remove ${item.file.name}`}
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {expandedUid === item.uid && (
                    <textarea
                      rows={2}
                      value={item.note}
                      onChange={(e) => updateItem(item.uid, { note: e.target.value })}
                      placeholder="Optional note for peer students (15+ characters). Left empty, a standard summary is filed."
                      aria-label={`Description for ${item.file.name}`}
                      className="field w-full px-2.5 py-2 text-[12px] mt-2 resize-none"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add more + common provenance */}
          {items.length > 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isActivelyUploading}
              className="btn btn-secondary w-full border-dashed"
            >
              <UploadCloud className="w-4 h-4" aria-hidden="true" />
              <span>Add more files</span>
            </button>
          )}

          {/* Uploader identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor="bulk-author" className="block font-semibold text-ink mb-1">
                Uploader name
              </label>
              <input
                id="bulk-author"
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                placeholder="Tanmay Shinde"
                className="field w-full px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="bulk-roll" className="block font-semibold text-ink mb-1">
                Roll / seat no
              </label>
              <input
                id="bulk-roll"
                type="text"
                value={uploaderRoll}
                onChange={(e) => setUploaderRoll(e.target.value)}
                placeholder="126BTCM2008"
                className="field w-full px-3 py-2 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink flex flex-wrap items-center justify-between gap-3 sticky bottom-0 bg-paper">
          <p className="font-mono text-[11px] text-ink-2 tabular" aria-live="polite">
            {summary ?? (subject ? `Filing under ${subject.name}` : 'Select a subject')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn btn-ghost px-4"
              disabled={isActivelyUploading}
            >
              {settled || uploadedCount > 0 ? 'Close' : 'Cancel'}
            </button>
            <button onClick={() => void startUpload()} disabled={!canStart} className="btn btn-primary px-5">
              {isActivelyUploading ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Uploading…</span>
                </>
              ) : (
                <span>
                  Upload {queuedCount + failedCount > 0 ? `${queuedCount + failedCount} ` : ''}{(queuedCount + failedCount) === 1 ? 'file' : 'files'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
