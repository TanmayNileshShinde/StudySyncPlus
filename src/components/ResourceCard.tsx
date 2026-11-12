import React from 'react';
import type { StudyResource } from '../types';
import { useResources } from '../context/ResourceContext';
import { Download, Bookmark, Star, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResourceCardProps {
  resource: StudyResource;
  onSelect: (resource: StudyResource) => void;
}

const CONFETTI_COLORS = ['#111111', '#a3e635', '#d6d3d1'];

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onSelect }) => {
  const { toggleBookmark, isBookmarked, downloadResource, deleteResource } = useResources();
  const bookmarked = isBookmarked(resource.id);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    void downloadResource(resource);
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.8 },
      colors: CONFETTI_COLORS
    });
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleBookmark(resource.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${resource.title}"?`)) {
      void deleteResource(resource.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(resource);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${resource.title}`}
      onClick={() => onSelect(resource)}
      onKeyDown={handleKeyDown}
      className="ruled p-6 flex flex-col text-left cursor-pointer group transition-colors duration-200 hover:border-ink focus-visible:outline-2"
    >
      {/* Identity row: official course code + actions */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] truncate">
          {resource.courseCode || 'CORE'}
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleBookmark}
            className={`p-1.5 transition-colors ${
              bookmarked ? 'text-lime-deep bg-lime-wash' : 'text-ink-3 hover:text-ink hover:bg-sunk'
            }`}
            aria-pressed={bookmarked}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark resource'}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark resource'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-lime-deep' : ''}`} aria-hidden="true" />
          </button>

          {resource.isUserUploaded && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-ink-3 hover:text-alert hover:bg-sunk transition-colors"
              aria-label={`Delete ${resource.title}`}
              title="Delete uploaded resource"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Substance: title, subject · type, description */}
      <h3 className="mt-3.5 font-bold text-[17px] leading-snug text-ink line-clamp-2 group-hover:underline underline-offset-2 decoration-2">
        {resource.title}
      </h3>

      <p className="mt-1.5 text-xs">
        <span className="font-semibold text-ink">{resource.subjectName}</span>
        <span className="text-ink-3"> · {resource.type}</span>
      </p>

      <p className="mt-2.5 text-[13px] text-ink-2 leading-relaxed line-clamp-3">{resource.description}</p>

      <div className="flex-1" aria-hidden="true" />

      {/* Provenance + primary action, separated by a hairline */}
      <div className="mt-5 pt-4 border-t border-rule flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-2 min-w-0">
          <span className="truncate">{resource.uploadedBy}</span>
          <span className="text-ink-3" aria-hidden="true">·</span>
          <span className="font-mono tabular shrink-0">{resource.fileSize}</span>
          <span className="text-ink-3" aria-hidden="true">·</span>
          <span className="flex items-center gap-1 tabular shrink-0">
            <Star className="w-3 h-3 fill-lime text-lime-deep" aria-hidden="true" />
            {resource.rating.toFixed(1)}
          </span>
        </div>

        <button
          onClick={handleDownload}
          className="btn btn-secondary px-3 shrink-0"
          aria-label={`Download ${resource.title} (${resource.fileSize})`}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Download</span>
          <span className="font-mono text-[10px] tabular text-ink-3">{resource.downloadCount}</span>
        </button>
      </div>
    </article>
  );
};
