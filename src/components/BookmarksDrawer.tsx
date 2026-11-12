import React from 'react';
import { useResources } from '../context/ResourceContext';
import { StudyResource } from '../types';
import { X, Bookmark, Trash2, Download, ExternalLink } from 'lucide-react';
import { apiService } from '../services/apiService';

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
  const { resources, userProfile, toggleBookmark, incrementDownload, showToast } = useResources();

  if (!isOpen) return null;

  const savedResources = resources.filter((r) => userProfile.savedResourceIds.includes(r.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bookmark className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Saved Study Materials</h3>
                <p className="text-[11px] text-slate-500">
                  {savedResources.length} saved for exam revision
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List of bookmarks */}
          <div className="mt-4 space-y-3">
            {savedResources.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-6">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No resources saved yet. Click the bookmark icon on any card to save it here!
              </div>
            ) : (
              savedResources.map((res) => (
                <div
                  key={res.id}
                  className="clay-box p-3.5 bg-slate-50/50 hover:bg-white cursor-pointer transition-all border border-slate-100"
                  onClick={() => {
                    onSelectResource(res);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">
                        Sem {res.semester} • {res.type}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-1 mt-0.5">
                        {res.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">{res.subject}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          apiService.generateAndDownloadResource(res);
                          incrementDownload(res.id);
                          showToast(`Downloading ${res.title}`);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(res.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Persistent storage maintained in your browser's <code className="font-mono text-indigo-600">localStorage</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
