import React, { useMemo, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import type { StudyResource } from '../types';
import confetti from 'canvas-confetti';
import {
  Bookmark,
  ArrowLeft,
  Search,
  Download,
  Trash2,
  BookOpen,
  Star
} from 'lucide-react';

export const SavedView: React.FC = () => {
  const {
    resources,
    bookmarkIds,
    toggleBookmark,
    downloadResource,
    openStudyWorkspace,
    openHome
  } = useResources();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  const bookmarkSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);

  const savedResources = useMemo(() => {
    return resources.filter((r) => bookmarkSet.has(r.id));
  }, [resources, bookmarkSet]);

  // Unique subjects among saved resources
  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of savedResources) {
      if (!map.has(r.subjectId)) {
        map.set(r.subjectId, r.subjectName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [savedResources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    let list = savedResources;
    if (selectedSubject !== 'ALL') {
      list = list.filter((r) => r.subjectId === selectedSubject);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q) ||
          r.courseCode.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [savedResources, selectedSubject, searchQuery]);

  const handleDownload = (resource: StudyResource) => {
    void downloadResource(resource);
    confetti({
      particleCount: 20,
      spread: 45,
      origin: { y: 0.8 },
      colors: ['#a3e635', '#111111', '#e7e5e4']
    });
  };

  const handleRemove = async (resource: StudyResource) => {
    await toggleBookmark(resource.id);
  };

  return (
    <div className="flex-1 flex flex-col bg-paper min-h-0">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-rule bg-paper-sunk px-4 sm:px-8 py-5">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={openHome}
              className="btn btn-secondary px-2.5 py-1.5 text-xs font-mono font-semibold"
              title="Return to course catalog"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All Subjects</span>
            </button>
            <div className="h-4 w-px bg-rule hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 bg-ink flex items-center justify-center shrink-0">
                <Bookmark className="w-3.5 h-3.5 text-lime" aria-hidden="true" />
              </span>
              <div>
                <h1 className="font-bold text-base text-ink leading-tight">Saved Study Materials</h1>
                <p className="text-[11px] text-ink-3 font-mono">
                  {savedResources.length} items bookmarked for exam revision
                </p>
              </div>
            </div>
          </div>

          {/* Quick search */}
          {savedResources.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved materials..."
                className="input pl-8 py-1.5 text-xs w-full bg-paper"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-3 hover:text-ink font-mono"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6">
        {/* Subject filter tabs */}
        {savedResources.length > 0 && availableSubjects.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-rule no-scrollbar">
            <button
              onClick={() => setSelectedSubject('ALL')}
              className={`px-3 py-1 text-xs font-mono font-semibold transition-colors shrink-0 ${
                selectedSubject === 'ALL'
                  ? 'bg-ink text-paper'
                  : 'bg-paper-sunk text-ink-2 hover:text-ink border border-rule'
              }`}
            >
              All Courses ({savedResources.length})
            </button>
            {availableSubjects.map((sub) => {
              const count = savedResources.filter((r) => r.subjectId === sub.id).length;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub.id)}
                  className={`px-3 py-1 text-xs font-mono font-semibold transition-colors shrink-0 ${
                    selectedSubject === sub.id
                      ? 'bg-ink text-paper'
                      : 'bg-paper-sunk text-ink-2 hover:text-ink border border-rule'
                  }`}
                >
                  {sub.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Resources Grid or Empty State */}
        {savedResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto my-12 border border-rule bg-paper shadow-xs">
            <div className="w-12 h-12 bg-paper-sunk border border-rule flex items-center justify-center mb-4">
              <Bookmark className="w-5 h-5 text-ink-3" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-ink mb-1.5">No study materials saved yet</h2>
            <p className="text-xs text-ink-2 mb-6 leading-relaxed">
              Bookmark lecture notes, past exam papers, and lab manuals while exploring your subjects to keep high-priority revision resources organized here.
            </p>
            <button onClick={openHome} className="btn btn-primary">
              <ArrowLeft className="w-4 h-4" />
              <span>Browse Course Subjects</span>
            </button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ink-2 mb-3">No saved materials matched your search query.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedSubject('ALL'); }} className="btn btn-ghost text-xs">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="group border border-rule bg-paper hover:border-ink transition-colors flex flex-col justify-between shadow-xs"
                >
                  <div className="p-4 sm:p-5">
                    {/* Top row: stamps & remove */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="stamp stamp-ink font-mono text-[10px]">{resource.courseCode}</span>
                        <span className="stamp stamp-outline font-mono text-[10px]">{resource.type}</span>
                        <span className="font-mono text-[10px] text-ink-3 uppercase">{resource.fileFormat}</span>
                      </div>
                      <button
                        onClick={() => void handleRemove(resource)}
                        className="text-ink-3 hover:text-alert p-1 transition-colors"
                        title="Remove from saved materials"
                        aria-label={`Remove ${resource.title} from saved`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => openStudyWorkspace(resource.id)}
                      className="font-bold text-sm text-ink hover:text-lime-deep cursor-pointer leading-snug mb-2 transition-colors line-clamp-2"
                      title={resource.title}
                    >
                      {resource.title}
                    </h3>

                    {/* Description preview */}
                    <p className="text-xs text-ink-2 line-clamp-2 leading-relaxed mb-4">
                      {resource.description || 'Academic syllabus study material.'}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-ink-3">
                      <span>{resource.fileSize}</span>
                      <span>·</span>
                      <span>By {resource.uploadedBy}</span>
                      {resource.rating > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-ink-2">
                            <Star className="w-3 h-3 fill-lime text-lime-deep" />
                            <span>{resource.rating.toFixed(1)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-rule bg-paper-sunk px-4 py-2.5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openStudyWorkspace(resource.id)}
                      className="btn btn-secondary text-xs py-1 px-3 flex-1 justify-center"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Study Workspace</span>
                    </button>
                    <button
                      onClick={() => handleDownload(resource)}
                      className="btn btn-ghost text-xs p-1.5"
                      title="Download resource file"
                      aria-label="Download"
                    >
                      <Download className="w-3.5 h-3.5 text-ink-2 hover:text-ink" />
                    </button>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
