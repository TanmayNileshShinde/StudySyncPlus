import React from 'react';
import { StudyResource } from '../types';
import { useResources } from '../context/ResourceContext';
import { apiService } from '../services/apiService';
import { Download, Bookmark, Star, FileText, User, Trash2, Calendar, HardDrive } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResourceCardProps {
  resource: StudyResource;
  onSelect: (resource: StudyResource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onSelect }) => {
  const { toggleBookmark, isBookmarked, incrementDownload, deleteResource, showToast } = useResources();
  const bookmarked = isBookmarked(resource.id);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    apiService.generateAndDownloadResource(resource);
    incrementDownload(resource.id);
    showToast(`Downloading "${resource.title.slice(0, 25)}..."`);

    // Little celebration for study downloads
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.8 }
    });
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(resource.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${resource.title}"?`)) {
      deleteResource(resource.id);
    }
  };

  const getFormatBadgeColor = (format: StudyResource['fileFormat']) => {
    switch (format) {
      case 'PDF':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'ZIP':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DOCX':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  return (
    <div
      onClick={() => onSelect(resource)}
      className="clay-box p-5 sm:p-6 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
    >
      {/* Top Meta Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/80">
            Sem {resource.semester} • {resource.type}
          </span>
          
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getFormatBadgeColor(resource.fileFormat)}`}>
              {resource.fileFormat}
            </span>

            <button
              onClick={handleBookmark}
              className={`p-1.5 rounded-lg transition-colors ${
                bookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark resource'}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-500' : ''}`} />
            </button>

            {resource.isUserUploaded && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Delete uploaded resource"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Resource Title */}
        <h3 className="font-bold text-base sm:text-lg text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {resource.title}
        </h3>

        {/* Subject */}
        <p className="text-xs font-medium text-indigo-500 mt-1">
          {resource.subject}
        </p>

        {/* Description snippet */}
        <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
          {resource.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {resource.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
            >
              #{tag}
            </span>
          ))}
          {resource.tags.length > 3 && (
            <span className="text-[10px] text-slate-400 font-medium px-1">
              +{resource.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer Info & Download Action */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-3">
        {/* Author & Size Details */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-500" />
            <span className="truncate max-w-[120px]">{resource.uploadedBy}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {resource.fileSize}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {resource.rating}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDownload}
          className="w-full clay-button py-2 px-3 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 hover:text-indigo-600 group/btn"
        >
          <Download className="w-3.5 h-3.5 text-indigo-500 group-hover/btn:translate-y-0.5 transition-transform" />
          <span>Download Resource</span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono">
            {resource.downloadCount}
          </span>
        </button>
      </div>
    </div>
  );
};
