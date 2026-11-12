import React from 'react';
import { useResources } from '../context/ResourceContext';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
import type { StudyResource } from '../types';
import { X, Bookmark, Trash2, Download } from 'lucide-react';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResource: (resource: StudyResource) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  onSelectResource
}) => {
  const { resources, bookmarkIds, toggleBookmark, downloadResource } = useResources();
  const panelRef = useOverlayBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const bookmarkSet = new Set(bookmarkIds);
  const savedResources = resources.filter((r) => bookmarkSet.has(r.id));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookmarks-title"
        className="w-full max-w-md bg-paper h-full border-l border-ink shadow-overlay p-6 flex flex-col justify-between overflow-y-auto animate-fadeIn"
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-ink">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 bg-ink flex items-center justify-center shrink-0" aria-hidden="true">
                <Bookmark className="w-4 h-4 text-lime" />
              </div>
              <div className="min-w-0">
                <h2 id="bookmarks-title" className="font-bold text-ink text-base leading-tight">
                  Saved Study Materials
                </h2>
                <p className="text-[11px] text-ink-2 tabular">
                  {savedResources.length} saved for exam revision
                </p>
              </div>
            </div>

            <button onClick={onClose} className="btn btn-ghost px-2 shrink-0" aria-label="Close saved resources">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* List */}
          <div className="mt-4 space-y-2">
            {savedResources.length === 0 ? (
              <div className="ruled-sunk p-8 text-center text-xs text-ink-2 mt-4">
                <Bookmark className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
                <p className="max-w-[36ch] mx-auto">
                  Nothing saved yet. Use the bookmark icon on any resource card to keep it here for
                  revision.
                </p>
              </div>
            ) : (
              savedResources.map((res) => (
                <div
                  key={res.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${res.title}`}
                  onClick={() => {
                    onSelectResource(res);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectResource(res);
                      onClose();
                    }
                  }}
                  className="ruled p-3.5 cursor-pointer transition-colors hover:border-ink"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="stamp stamp-outline">
                        Sem {res.semester} · {res.type}
                      </span>
                      <h3 className="font-bold text-xs text-ink line-clamp-1 mt-1.5">{res.title}</h3>
                      <p className="text-[10px] text-ink-3 mt-0.5">{res.subjectName}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadResource(res);
                        }}
                        className="p-1.5 text-ink-2 hover:text-ink hover:bg-sunk transition-colors"
                        aria-label={`Download ${res.title}`}
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleBookmark(res.id);
                        }}
                        className="p-1.5 text-ink-3 hover:text-alert hover:bg-sunk transition-colors"
                        aria-label={`Remove ${res.title} from saved`}
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-rule text-center">
          <p className="text-[11px] text-ink-3">
            Synced through the <code className="font-mono text-ink">Convex</code> backend — saved across
            sessions in this browser.
          </p>
        </div>
      </div>
    </div>
  );
};
