import React from 'react';
import { StudyResource } from '../types';
import { useResources } from '../context/ResourceContext';
import { apiService } from '../services/apiService';
import {
  X,
  Download,
  Bookmark,
  Star,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResourceDetailModalProps {
  resource: StudyResource | null;
  onClose: () => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({ resource, onClose }) => {
  const { toggleBookmark, isBookmarked, incrementDownload, showToast } = useResources();

  if (!resource) return null;

  const bookmarked = isBookmarked(resource.id);

  const handleDownload = () => {
    apiService.generateAndDownloadResource(resource);
    incrementDownload(resource.id);
    showToast(`Downloading verified academic package: "${resource.title}"`);
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 }
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Direct study resource link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="clay-box w-full max-w-xl bg-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                Semester {resource.semester}
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                {resource.courseCode}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-pink-50 text-pink-700">
                {resource.type}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                {resource.fileFormat}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-snug">
              {resource.title}
            </h2>
            <p className="text-xs font-medium text-indigo-600 mt-1">{resource.subject}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-5 text-xs sm:text-sm">
          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Description & Key Concepts
            </h4>
            <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {resource.description}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Author</p>
              <p className="font-bold text-slate-800 truncate mt-0.5">{resource.uploadedBy}</p>
              <p className="text-[10px] text-indigo-600 font-mono">{resource.rollNumber}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold">File Size</p>
              <p className="font-bold text-slate-800 mt-0.5">{resource.fileSize}</p>
              <p className="text-[10px] text-slate-400">{resource.fileFormat}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Downloads</p>
              <p className="font-bold text-slate-800 mt-0.5">{resource.downloadCount}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Verified</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Rating</p>
              <div className="flex items-center gap-1 font-bold text-slate-800 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{resource.rating} / 5</span>
              </div>
              <p className="text-[10px] text-slate-400">Peer Reviewed</p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Curriculum Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-indigo-50/80 text-indigo-700 font-semibold rounded-lg text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleBookmark(resource.id)}
              className={`p-2.5 rounded-xl clay-button flex items-center gap-1.5 text-xs font-semibold ${
                bookmarked ? 'text-amber-600 bg-amber-50' : 'text-slate-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-500' : ''}`} />
              <span>{bookmarked ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2.5 rounded-xl clay-button text-slate-600 hover:text-slate-800 flex items-center gap-1.5 text-xs font-semibold"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="clay-button-primary px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Resource ({resource.fileSize})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
