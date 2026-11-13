import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Clock,
  FileText,
  Library,
  Presentation,
  Search,
  X
} from 'lucide-react';
import type { StudyResource } from '../types';

/** Concise labels for material kinds */
const KIND_SHORT: Record<string, string> = {
  'Lecture Notes': 'Notes',
  'Past Exam Papers': 'PYQs',
  'Lab Manual': 'Labs',
  'Cheat Sheet': 'Sheets',
  'Reference Book': 'Books'
};

const KIND_ORDER = ['Lecture Notes', 'Past Exam Papers', 'Lab Manual', 'Cheat Sheet', 'Reference Book'];

interface SubjectTileData {
  id: string;
  name: string;
  courseCode: string;
  materials: number;
  indexed: number;
  kinds: Array<{ label: string; count: number }>;
  bytes: number;
  credits?: number;
  category?: string;
}

export const SubjectsHome: React.FC = () => {
  const {
    subjects,
    resources,
    semester,
    bookmarkIds,
    isLibraryLoading,
    openSubject,
    openDetail,
    schemeCourses
  } = useResources();

  const [query, setQuery] = useState('');
  const [structureOpen, setStructureOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' focuses search input from anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Map scheme courses by ID for quick credit/category lookup
  const schemeMap = useMemo(() => {
    const map = new Map<string, { credits: number; category: string }>();
    for (const c of schemeCourses) {
      map.set(c.id, { credits: c.credits, category: c.category });
    }
    return map;
  }, [schemeCourses]);

  // Aggregate subject card data
  const tiles: SubjectTileData[] = useMemo(
    () =>
      subjects.map((subject) => {
        const own = resources.filter((r) => r.subjectId === subject.id);
        const kinds = KIND_ORDER.map((kind) => ({
          label: KIND_SHORT[kind] ?? kind,
          count: own.filter((r) => r.type === kind).length
        })).filter((k) => k.count > 0);
        const schemeInfo = schemeMap.get(subject.id);
        return {
          id: subject.id,
          name: subject.name,
          courseCode: subject.courseCode,
          materials: own.length,
          indexed: own.filter((r) => r.ingestStatus === 'ready').length,
          kinds,
          bytes: own.reduce((acc, r) => acc + r.fileSizeBytes, 0),
          credits: schemeInfo?.credits,
          category: schemeInfo?.category
        };
      }),
    [subjects, resources, schemeMap]
  );

  const trimmedQuery = query.trim().toLowerCase();

  // Matched subjects
  const filteredSubjects = useMemo(() => {
    if (!trimmedQuery) return tiles;
    return tiles.filter(
      (t) =>
        t.name.toLowerCase().includes(trimmedQuery) ||
        t.courseCode.toLowerCase().includes(trimmedQuery)
    );
  }, [tiles, trimmedQuery]);

  // Matched materials across entire library for search results
  const matchedResources: StudyResource[] = useMemo(() => {
    if (!trimmedQuery) return [];
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(trimmedQuery) ||
        r.description.toLowerCase().includes(trimmedQuery) ||
        r.tags.some((t) => t.toLowerCase().includes(trimmedQuery)) ||
        r.courseCode.toLowerCase().includes(trimmedQuery) ||
        r.uploadedBy.toLowerCase().includes(trimmedQuery)
    );
  }, [resources, trimmedQuery]);

  // "Continue Studying": Most recently opened document from localStorage or first bookmark
  const recentStudy = useMemo(() => {
    try {
      const raw = localStorage.getItem('studysyncplus_recent_doc');
      if (raw) {
        const parsed = JSON.parse(raw) as { id?: string; page?: number };
        if (parsed.id) {
          const found = resources.find((r) => r.id === parsed.id);
          if (found) {
            return {
              resource: found,
              title: found.title,
              courseCode: found.courseCode,
              page: parsed.page && parsed.page > 1 ? parsed.page : 1,
              subjectName: found.subjectName,
              source: 'recent' as const
            };
          }
        }
      }
    } catch {
      // ignore JSON parse errors
    }

    if (bookmarkIds && bookmarkIds.length > 0) {
      const found = resources.find((r) => bookmarkIds.includes(r.id));
      if (found) {
        return {
          resource: found,
          title: found.title,
          courseCode: found.courseCode,
          page: 1,
          subjectName: found.subjectName,
          source: 'bookmark' as const
        };
      }
    }

    return null;
  }, [resources, bookmarkIds]);

  // Minimal Recently Added Materials: 4 latest items across semester
  const recentMaterials = useMemo(() => {
    return [...resources]
      .sort((a, b) => {
        if (a.uploadDate && b.uploadDate) {
          return b.uploadDate.localeCompare(a.uploadDate);
        }
        return 0;
      })
      .slice(0, 4);
  }, [resources]);

  if (isLibraryLoading) {
    return (
      <div className="px-4 sm:px-8 py-20 text-center text-ink-3 text-sm font-mono" role="status">
        <span className="inline-block animate-pulse">Opening academic course file…</span>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 pb-28 md:pb-16 max-w-[1360px] mx-auto animate-fadeIn">
      {/* 1. Academic Header — Concise, clean, unboxed */}
      <header className="pt-6 sm:pt-8 pb-5 border-b border-rule">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-3">
                {semester ? semester.label : 'Semester III'} · Computer Engineering
              </span>
              <span className="text-rule hidden sm:inline">/</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-lime-text font-bold">
                Official Course File
              </span>
            </div>
            <h1 className="text-2xl sm:text-[1.85rem] font-black tracking-tight text-ink leading-tight">
              Subject Workspaces
            </h1>
          </div>
          <p className="font-mono text-xs text-ink-3 tabular self-start sm:self-auto">
            {subjects.length} core courses · {resources.length} verified materials
          </p>
        </div>
      </header>

      {/* 2. Central Search Command Bar */}
      <section className="pt-5 pb-5">
        <div className="relative">
          <Search
            className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
              }
            }}
            placeholder="Search courses, topics (e.g. 'Binary Search Tree', 'Pipeline Hazards'), PYQs, notes…"
            aria-label="Search courses and study materials"
            className="field w-full pl-10 pr-16 py-2.5 text-[13.5px] font-medium bg-paper-sunk hover:bg-paper focus:bg-paper border border-rule transition-colors focus:border-ink"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-ink-3 hover:text-ink focus-visible:outline-none"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd
                className="hidden sm:inline-flex items-center font-mono text-[10px] text-ink-3 bg-paper px-1.5 py-0.5 border border-rule pointer-events-none"
                title="Press '/' to focus search"
              >
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Quick Subject Jump Rail when search is inactive */}
        {!trimmedQuery && subjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5">
            <span className="font-mono text-[10.5px] text-ink-3 uppercase tracking-wider shrink-0 mr-1">
              Jump to:
            </span>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => openSubject(sub.id)}
                className="font-mono text-[11px] px-2 py-0.5 border border-rule bg-paper hover:bg-lime-wash hover:border-ink text-ink-2 hover:text-ink shrink-0 transition-colors"
                title={`Open ${sub.name}`}
              >
                {sub.courseCode}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. Instant Matching Materials (when search query is active) */}
      {trimmedQuery && (
        <section className="mb-8 border border-rule bg-paper animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-rule bg-paper-sunk/60">
            <h2 className="text-xs font-mono uppercase tracking-[0.08em] font-bold text-ink flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
              <span>Matching Study Materials</span>
              <span className="font-mono text-xs text-ink-3 tabular">
                ({matchedResources.length})
              </span>
            </h2>
            <span className="font-mono text-[10.5px] text-ink-3 hidden sm:inline">
              Click to open directly in study view
            </span>
          </div>

          {matchedResources.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-mono text-ink-3">
                No individual materials match “{query}”. Check subject workspaces below or refine search.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-rule max-h-80 overflow-y-auto">
              {matchedResources.map((res) => {
                const isDeck = res.fileKind === 'ppt' || res.fileKind === 'pptx';
                return (
                  <div
                    key={res.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(res)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(res);
                      }
                    }}
                    className="py-2.5 px-4 flex items-center justify-between gap-3 hover:bg-lime-wash/60 cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      {isDeck ? (
                        <Presentation className="w-4 h-4 text-ink-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <FileText className="w-4 h-4 text-ink-3 shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-bold text-[13px] text-ink truncate group-hover:underline">
                        {res.title}
                      </span>
                      <span className="stamp stamp-outline text-[9px] py-0 px-1 font-mono shrink-0">
                        {res.courseCode}
                      </span>
                      <span className="text-[11px] text-ink-3 hidden md:inline truncate">
                        {res.subjectName} · {KIND_SHORT[res.type] ?? res.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-ink-2">
                      <span>{res.fileSize}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 4. Compact "Continue Studying" Bar (shown when relevant and not searching) */}
      {!trimmedQuery && recentStudy && (
        <section className="mb-6 animate-fadeIn">
          <div className="border border-rule bg-paper p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1 self-stretch bg-lime shrink-0 hidden sm:block" aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] font-bold text-ink-3">
                    {recentStudy.source === 'recent' ? 'Continue Studying' : 'Saved Reading'}
                  </span>
                  <span className="stamp stamp-ink font-mono text-[9.5px] py-0 px-1">
                    {recentStudy.courseCode}
                  </span>
                  {recentStudy.page > 1 && (
                    <span className="font-mono text-[10.5px] text-ink-3">
                      Page {recentStudy.page}
                    </span>
                  )}
                </div>
                <h2
                  onClick={() => openDetail(recentStudy.resource, recentStudy.page)}
                  className="text-[13.5px] font-bold text-ink truncate hover:underline cursor-pointer"
                  title={recentStudy.title}
                >
                  {recentStudy.title}
                </h2>
              </div>
            </div>

            <button
              onClick={() => openDetail(recentStudy.resource, recentStudy.page)}
              className="btn btn-secondary px-3.5 h-8 text-xs font-bold border-ink hover:bg-lime hover:text-ink flex items-center justify-center gap-1.5 shrink-0 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Resume Reading</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* 5. Subject Workspaces Grid — Primary Focus */}
      <section className="pt-1 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.08em] font-bold text-ink-3">
            Course Workspaces
            <span className="font-normal text-ink-3 tabular ml-2">
              ({filteredSubjects.length} of {subjects.length})
            </span>
          </h2>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="border border-rule bg-paper-sunk p-10 text-center">
            <Library className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-sm font-bold text-ink mb-1">No Subjects Match “{query}”</h3>
            <p className="text-xs text-ink-2 max-w-[40ch] mx-auto mb-4">
              Try searching by course code (e.g. CMCOR2PC202) or clear your search query.
            </p>
            <button
              onClick={() => setQuery('')}
              className="btn btn-secondary px-3 py-1.5 text-xs font-mono"
            >
              Clear Search Query
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((tile) => (
              <div
                key={tile.id}
                role="button"
                tabIndex={0}
                onClick={() => openSubject(tile.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openSubject(tile.id);
                  }
                }}
                className="group border border-rule p-5 bg-paper hover:border-ink hover:bg-lime-wash/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top: Course Code + Scheme Credits */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="stamp stamp-ink font-mono text-[10.5px]">
                      {tile.courseCode}
                    </span>
                    <div className="font-mono text-[11px] text-ink-3 tabular">
                      {tile.credits ? `${tile.credits} credits` : ''}
                      {tile.category ? ` · ${tile.category}` : ''}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-black text-ink tracking-tight leading-snug group-hover:underline underline-offset-2">
                    {tile.name}
                  </h3>

                  {/* Concise Materials Summary (no noisy chip piles) */}
                  <p className="font-mono text-xs text-ink-2 mt-2.5 tabular">
                    <span className="font-bold text-ink">
                      {tile.materials} {tile.materials === 1 ? 'material' : 'materials'}
                    </span>
                    {tile.kinds.length > 0 && (
                      <span className="text-ink-3">
                        {' '}· {tile.kinds.map((k) => `${k.label} (${k.count})`).join(', ')}
                      </span>
                    )}
                  </p>
                </div>

                {/* Footer: AI Status & Enter Affordance */}
                <div className="pt-3.5 mt-4 border-t border-rule flex items-center justify-between text-xs">
                  <div className="font-mono text-[11px] flex items-center gap-1.5">
                    {tile.indexed > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-lime-text font-semibold">
                        <span className="w-1.5 h-1.5 bg-lime-deep shrink-0" aria-hidden="true" />
                        AI Assistant ready
                      </span>
                    ) : (
                      <span className="text-ink-3">Workspace ready</span>
                    )}
                  </div>

                  <span className="font-mono text-[11px] font-bold text-ink flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink" aria-hidden="true" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Minimal Recently Added Materials Section */}
      {!trimmedQuery && recentMaterials.length > 0 && (
        <section className="mt-4 mb-8">
          <div className="flex items-center justify-between pb-2 border-b border-ink mb-3">
            <h2 className="text-xs font-mono uppercase tracking-[0.08em] font-bold text-ink flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
              <span>Recently Added Materials</span>
            </h2>
            <span className="font-mono text-[10.5px] text-ink-3">
              Direct jump to document
            </span>
          </div>

          <div className="border border-rule divide-y divide-rule bg-paper">
            {recentMaterials.map((res) => {
              const isDeck = res.fileKind === 'ppt' || res.fileKind === 'pptx';
              return (
                <div
                  key={res.id}
                  onClick={() => openDetail(res)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail(res);
                    }
                  }}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-lime-wash/40 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isDeck ? (
                      <Presentation className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
                    )}
                    <span className="stamp stamp-outline font-mono text-[9px] py-0 px-1 shrink-0">
                      {res.courseCode}
                    </span>
                    <span className="text-[13px] font-semibold text-ink truncate group-hover:underline">
                      {res.title}
                    </span>
                    <span className="font-mono text-[10.5px] text-ink-3 hidden sm:inline">
                      · {KIND_SHORT[res.type] ?? res.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px] text-ink-3">
                    <span>{res.fileSize}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. Collapsible Official Curriculum Scheme (Quiet, at page bottom) */}
      {schemeCourses.length > 0 && (
        <section className="mt-8 border-t border-rule pt-5">
          <button
            onClick={() => setStructureOpen((v) => !v)}
            aria-expanded={structureOpen}
            className="w-full flex items-center justify-between gap-3 text-left group"
          >
            <div>
              <span className="text-sm font-black text-ink tracking-tight">
                Curriculum Structure &amp; Scheme
              </span>
              <span className="font-mono text-[11px] text-ink-3 font-medium ml-2 tabular">
                {schemeCourses.length} courses · SAKEC Syllabus
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-ink-3 group-hover:text-ink transition-transform ${
                structureOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {structureOpen && (
            <div className="mt-3 border border-rule divide-y divide-rule animate-fadeIn bg-paper">
              <div className="px-4 py-2 bg-paper-sunk flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.08em] text-ink-3 font-semibold">
                <span>Course &amp; Title</span>
                <span>Category · Credits</span>
              </div>
              {schemeCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => course.inLibrary && !course.isArchived && openSubject(course.id)}
                  role={course.inLibrary && !course.isArchived ? 'button' : undefined}
                  tabIndex={course.inLibrary && !course.isArchived ? 0 : undefined}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && course.inLibrary && !course.isArchived) {
                      e.preventDefault();
                      openSubject(course.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    course.inLibrary && !course.isArchived
                      ? 'hover:bg-lime-wash/60 cursor-pointer'
                      : 'opacity-50 cursor-default'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] text-ink font-bold shrink-0">
                      {course.courseCode}
                    </span>
                    <span className="text-[13px] font-semibold text-ink truncate">
                      {course.courseName}
                    </span>
                    {course.isArchived && (
                      <span className="stamp stamp-outline text-[9px] py-0 px-1 shrink-0">
                        Archived
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-ink-3 tabular">
                    <span className="hidden sm:inline">{course.category}</span>
                    <span className="text-lime-text font-black">{course.credits} cr</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
