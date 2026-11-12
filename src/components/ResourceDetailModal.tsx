import React from 'react';
import { StudyResource } from '../types';
import { useResources } from '../context/ResourceContext';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
import { apiService } from '../services/apiService';
import { X, Download, Bookmark, Star, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResourceDetailModalProps {
  resource: StudyResource | null;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#111111', '#a3e635', '#d6d3d1'];

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({ resource, onClose }) => {
  const { toggleBookmark, isBookmarked, incrementDownload, showToast } = useResources();
  const panelRef = useOverlayBehavior(!!resource, onClose);

  if (!resource) return null;

  const bookmarked = isBookmarked(resource.id);

  const handleDownload = () => {
    apiService.generateAndDownloadResource(resource);
    incrementDownload(resource.id);
    showToast(`Downloading verified academic package: "${resource.title}"`);
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
        className="ruled w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-overlay animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-ink">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="stamp stamp-ink">Sem {resource.semester}</span>
              <span className="stamp stamp-outline font-mono">{resource.courseCode}</span>
              <span className="stamp stamp-outline">{resource.type}</span>
              <span className="stamp stamp-outline">{resource.fileFormat}</span>
            </div>
            <h2 id="detail-modal-title" className="text-xl sm:text-2xl font-display font-black text-ink leading-tight">
              {resource.title}
            </h2>
            <p className="text-xs font-semibold text-ink-2 mt-1">{resource.subject}</p>
          </div>

          <button onClick={onClose} className="btn btn-ghost px-2 shrink-0" aria-label="Close details">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-5 text-xs sm:text-sm">
          <div>
            <h3 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2">
              Description &amp; Key Concepts
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
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">File Size</dt>
              <dd className="font-bold text-ink font-mono mt-0.5">{resource.fileSize}</dd>
              <dd className="text-[10px] text-ink-3">{resource.fileFormat}</dd>
            </div>
            <div className="p-3">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Downloads</dt>
              <dd className="font-bold text-ink font-mono tabular mt-0.5">{resource.downloadCount}</dd>
              <dd className="text-[10px] text-lime-text font-semibold">Verified</dd>
            </div>
            <div className="p-3">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Rating</dt>
              <dd className="flex items-center gap-1 font-bold text-ink tabular mt-0.5">
                <Star className="w-3.5 h-3.5 fill-lime text-lime-deep" aria-hidden="true" />
                <span>{resource.rating.toFixed(1)} / 5</span>
              </dd>
              <dd className="text-[10px] text-ink-3">Peer Reviewed</dd>
            </div>
          </dl>

          {/* Tags */}
          <div>
            <h3 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2">
              Curriculum Tags
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
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-rule flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleBookmark(resource.id)}
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
          </div>

          <button onClick={handleDownload} className="btn btn-primary px-6">
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Download ({resource.fileSize})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
