import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { StudyResource } from '../types';
import { useResources } from '../context/ResourceContext';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
import { getOwnerKey } from '../lib/owner';
import { asResourceId } from '../lib/convexIds';
import {
  X,
  Download,
  Bookmark,
  Star,
  Share2,
  Pencil,
  Trash2,
  FileText,
  Presentation,
  Sparkles,
  RotateCcw,
  LoaderCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CONFETTI_COLORS = ['#111111', '#a3e635', '#d6d3d1'];

const RatingWidget: React.FC<{ resourceId: string }> = ({ resourceId }) => {
  const { rateResource } = useResources();
  const ownerKey = getOwnerKey();
  const myRating = useQuery(api.ratings.getMine, { ownerKey, resourceId: asResourceId(resourceId) });
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? myRating ?? 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center" role="group" aria-label="Rate this resource">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => void rateResource(resourceId, value)}
            onMouseEnter={() => setHoverValue(value)}
            onMouseLeave={() => setHoverValue(null)}
            className="p-0.5 text-lime-deep hover:text-ink transition-colors"
            aria-label={`Rate ${value} out of 5`}
            aria-pressed={myRating === value}
          >
            <Star
              className={`w-4 h-4 ${value <= displayValue ? 'fill-lime text-lime-deep' : 'text-ink-3'}`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <span className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">
        {myRating ? `Your rating ${myRating}/5` : 'Add your peer review'}
      </span>
    </div>
  );
};

/** Ingestion state as a stamp with optional recovery action. */
const IngestStamp: React.FC<{ resource: StudyResource; onRetry: () => void; retrying: boolean }> = ({
  resource,
  onRetry,
  retrying
}) => {
  if (!resource.hasFile) return null;
  if (resource.ingestStatus === 'ready') {
    return (
      <span className="stamp stamp-verified animate-stamp" title={`Indexed ${resource.chunkCount ?? 0} vector chunks`}>
        Indexed
      </span>
    );
  }
  if (resource.ingestStatus === 'failed') {
    return (
      <button
        onClick={onRetry}
        disabled={retrying}
        className="stamp inline-flex items-center gap-1 bg-paper text-alert border border-alert hover:bg-alert hover:text-paper transition-colors disabled:opacity-50"
        title={resource.ingestError ?? 'Indexing failed'}
      >
        {retrying ? <LoaderCircle className="w-3 h-3 animate-spin" aria-hidden="true" /> : <RotateCcw className="w-3 h-3" aria-hidden="true" />}
        {retrying ? 'Retrying…' : 'Index failed — retry'}
      </button>
    );
  }
  return (
    <span className="stamp stamp-outline inline-flex items-center gap-1" title="Building the vector index">
      <LoaderCircle className="w-3 h-3 animate-spin" aria-hidden="true" />
      Indexing
    </span>
  );
};

interface ResourceDetailModalProps {
  resource: StudyResource | null;
  onClose: () => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({ resource, onClose }) => {
  const {
    toggleBookmark,
    isBookmarked,
    downloadResource,
    openEdit,
    openAssistant,
    closeDetail,
    deleteResource,
    reindexResource,
    showToast
  } = useResources();
  const panelRef = useOverlayBehavior(!!resource, onClose);
  const ownerKey = getOwnerKey();
  const [retrying, setRetrying] = useState(false);

  // Hooks run unconditionally; queries skip while the modal is closed.
  const fileData = useQuery(
    api.resources.fileUrl,
    resource && resource.hasFile ? { id: asResourceId(resource.id) } : 'skip'
  );

  if (!resource) return null;

  const bookmarked = isBookmarked(resource.id);
  const isOwner = resource.isUserUploaded && resource.ownerKey === ownerKey;
  const isDeck = resource.fileKind === 'ppt' || resource.fileKind === 'pptx';

  const handleDownload = () => {
    void downloadResource(resource);
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: CONFETTI_COLORS
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Direct study resource link copied to clipboard!');
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const result = await reindexResource(resource.id);
      showToast(result.message);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Re-index failed. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${resource.title}"? This also removes its saved bookmarks and vector index.`)) {
      void deleteResource(resource.id).then(() => closeDetail());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className="ruled w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-overlay animate-fadeIn bg-paper"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-ink">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="stamp stamp-ink font-mono">{resource.courseCode}</span>
              <span className="stamp stamp-outline">{resource.type}</span>
              <span className="stamp stamp-outline font-mono">{resource.fileFormat}</span>
              <IngestStamp resource={resource} onRetry={() => void handleRetry()} retrying={retrying} />
            </div>
            <h2 id="detail-modal-title" className="text-xl sm:text-2xl font-black text-ink leading-tight tracking-tight">
              {resource.title}
            </h2>
            <p className="text-xs font-semibold text-ink-2 mt-1">{resource.subjectName}</p>
          </div>

          <button onClick={onClose} className="btn btn-ghost px-2 shrink-0" aria-label="Close details">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-5 text-xs sm:text-sm">
          <div>
            <h3 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2">
              Description &amp; key concepts
            </h3>
            <p className="text-ink-2 leading-relaxed ruled-sunk p-4">{resource.description}</p>
          </div>

          {/* Provenance grid */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 border border-rule divide-x divide-y divide-rule sm:divide-y-0">
            <div className="p-3">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Author</dt>
              <dd className="font-bold text-ink truncate mt-0.5">{resource.uploadedBy}</dd>
              <dd className="text-[10px] font-mono text-ink-2">{resource.rollNumber}</dd>
            </div>
            <div className="p-3">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">File size</dt>
              <dd className="font-bold text-ink font-mono mt-0.5">{resource.fileSize}</dd>
              <dd className="text-[10px] text-ink-3">{resource.fileFormat}</dd>
            </div>
            <div className="p-3">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Downloads</dt>
              <dd className="font-bold text-ink font-mono tabular mt-0.5">{resource.downloadCount}</dd>
              <dd className="text-[10px] text-lime-text font-semibold">{resource.hasFile ? 'Stored file' : 'Summary sheet'}</dd>
            </div>
            <div className="p-3">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Rating</dt>
              <dd className="flex items-center gap-1 font-bold text-ink tabular mt-0.5">
                <Star className="w-3.5 h-3.5 fill-lime text-lime-deep" aria-hidden="true" />
                <span>{resource.rating.toFixed(1)} / 5</span>
              </dd>
              <dd className="text-[10px] text-ink-3 tabular">{resource.ratingCount} reviews</dd>
            </div>
          </dl>

          {/* Inline preview for stored PDFs; honest fallback for decks */}
          {resource.hasFile && (
            <div>
              <h3 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2">
                Document preview
              </h3>
              <div className="ruled-sunk p-2">
                {isDeck ? (
                  <div className="p-6 text-center">
                    <Presentation className="w-7 h-7 text-ink-3 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-[13px] text-ink-2 max-w-[40ch] mx-auto">
                      Slides preview in their own app. The assistant can still answer from every slide —
                      or download the deck below.
                    </p>
                  </div>
                ) : fileData ? (
                  <object
                    data={fileData.url}
                    type="application/pdf"
                    className="w-full h-64 sm:h-80 bg-paper"
                    aria-label={`Preview of ${resource.title}`}
                  >
                    <p className="p-4 text-ink-2">
                      Inline preview is not supported in this browser.{' '}
                      <a href={fileData.url} target="_blank" rel="noreferrer" className="underline text-ink">
                        Open the PDF
                      </a>
                      .
                    </p>
                  </object>
                ) : (
                  <div className="h-24 flex items-center justify-center gap-2 text-ink-3 text-xs">
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em]">Preparing preview…</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div>
              <h3 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 border border-rule text-ink-2 font-mono font-medium text-[11px] bg-paper"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Peer rating */}
          <div className="pt-1">
            <RatingWidget resourceId={resource.id} />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-rule flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void toggleBookmark(resource.id)}
              aria-pressed={bookmarked}
              className={`btn ${bookmarked ? 'btn-secondary bg-lime-wash border-lime-deep text-lime-text' : 'btn-secondary'}`}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-lime-deep' : ''}`} aria-hidden="true" />
              <span>{bookmarked ? 'Saved' : 'Save'}</span>
            </button>

            <button onClick={handleCopyLink} className="btn btn-secondary">
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>Share</span>
            </button>

            {isOwner && (
              <>
                <button onClick={() => { closeDetail(); openEdit(resource); }} className="btn btn-secondary">
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="btn btn-ghost px-2 text-ink-3 hover:text-alert"
                  aria-label={`Delete ${resource.title}`}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                closeDetail();
                openAssistant({ mode: 'resource', resourceId: resource.id });
              }}
              className="btn btn-secondary border-ink hover:bg-lime-wash flex items-center gap-1.5"
              title="Ask the Study Assistant about this document"
            >
              <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
              <span>Ask AI</span>
            </button>

            <button onClick={handleDownload} className="btn btn-primary px-6">
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download ({resource.fileSize})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
