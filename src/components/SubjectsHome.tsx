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
  X,
  Calendar,
  Award,
  TableProperties,
  Sparkles,
  Folder,
  UserCheck
} from 'lucide-react';
import type { StudyResource, MoreSheetKind } from '../types';

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

interface SubjectsHomeProps {
  onOpenTimetable?: () => void;
  onOpenSheet?: (kind: MoreSheetKind) => void;
}

export const SubjectsHome: React.FC<SubjectsHomeProps> = ({ onOpenTimetable, onOpenSheet }) => {
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }, []);

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
      <div className="px-4 sm:px-8 py-20 text-center text-slate-500 text-sm font-mono" role="status">
        <span className="inline-block animate-pulse font-bold">Opening academic course file…</span>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 pb-28 md:pb-16 max-w-[1360px] mx-auto animate-fadeIn">
      {/* 1. ClassPost Neo-Brutalist Greeting Banner */}
      <section className="pt-6 sm:pt-8 pb-5">
        <div className="card-neo bg-white p-5 sm:p-7 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a]">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-yellow-400 border-2 border-slate-900 font-mono text-xs font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                SYCM1 · SAKEC
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-900 font-mono text-xs font-bold text-slate-700">
                70 Students
              </span>
              <span className="text-xs font-mono text-slate-500 font-semibold">
                Autonomous Curriculum
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              {greeting} 👋
            </h1>
            <p className="text-sm text-slate-600 font-medium mt-1">
              {formattedDate} • SAKEC Department of Computer Engineering
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 bg-yellow-50 p-3.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-900 shrink-0 stroke-[2.5]" />
              <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-slate-900">
                Class Representatives
              </span>
            </div>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
              Tanmay Shinde <span className="font-mono font-bold text-slate-500">(Roll 67)</span> &amp; Aditya Shah <span className="font-mono font-bold text-slate-500">(Roll 68)</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. ClassPost 4 Quick Action Cards */}
      <section className="pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Timetable */}
          <div
            onClick={onOpenTimetable}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenTimetable?.();
              }
            }}
            className="card-neo bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0f172a] transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5 text-slate-900 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-base text-slate-900 tracking-tight">
                Weekly Timetable
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Live daily lectures, lab batches and classroom slots
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900 font-mono">
              <span className="text-yellow-600 font-black">● LIVE TODAY</span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View ➔
              </span>
            </div>
          </div>

          {/* Card 2: Exam Timetable */}
          <div
            onClick={() => onOpenSheet?.('scheme')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenSheet?.('scheme');
              }
            }}
            className="card-neo bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0f172a] transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5 text-slate-900 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-base text-slate-900 tracking-tight">
                Exam Timetable &amp; MSE
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Mid-Semester Exams, Internal Assessments &amp; Dates
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900 font-mono">
              <span className="text-blue-700 font-black">MSE SCHEDULE</span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Check ➔
              </span>
            </div>
          </div>

          {/* Card 3: Academic Scheme */}
          <div
            onClick={() => onOpenSheet?.('scheme')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenSheet?.('scheme');
              }
            }}
            className="card-neo bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0f172a] transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <TableProperties className="w-5 h-5 text-slate-900 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-base text-slate-900 tracking-tight">
                Academic Scheme
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Official course structure, credit matrix &amp; lecture hours
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900 font-mono">
              <span className="text-purple-700 font-black">22 CREDITS</span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Scheme ➔
              </span>
            </div>
          </div>

          {/* Card 4: Syllabus & Viva */}
          <div
            onClick={() => onOpenSheet?.('syllabus')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenSheet?.('syllabus');
              }
            }}
            className="card-neo bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0f172a] transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-green-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5 text-slate-900 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-base text-slate-900 tracking-tight">
                Syllabus &amp; Viva Map
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Autonomous NEP syllabus, course outcomes &amp; viva questions
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900 font-mono">
              <span className="text-green-700 font-black">CO1 – CO6</span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Viva ➔
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Central Search Command Bar */}
      <section className="pt-1 pb-6">
        <div className="relative">
          <Search
            className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]"
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
            placeholder="Search courses, topics (e.g. 'Binary Search Tree', 'Fetch API', '8086 Microprocessor'), PYQs, notes…"
            aria-label="Search courses and study materials"
            className="w-full pl-12 pr-16 py-3.5 text-sm font-semibold bg-white border-2 border-slate-900 rounded-2xl shadow-[3px_3px_0px_#0f172a] focus:shadow-[5px_5px_0px_#0f172a] outline-none transition-all placeholder:text-slate-400 text-slate-900"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-slate-500 hover:text-slate-900"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <kbd
                className="hidden sm:inline-flex items-center font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-900 pointer-events-none"
                title="Press '/' to focus search"
              >
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Quick Subject Jump Rail when search is inactive */}
        {!trimmedQuery && subjects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 pb-1">
            <span className="font-mono text-xs text-slate-500 uppercase font-black tracking-wider shrink-0 mr-1">
              Courses:
            </span>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => openSubject(sub.id)}
                className="btn-neo bg-white hover:bg-yellow-400 text-slate-900 border-2 border-slate-900 px-2.5 py-1 text-xs font-mono font-bold rounded-xl shadow-[2px_2px_0px_#0f172a] shrink-0 transition-all"
                title={`Open ${sub.name}`}
              >
                {sub.courseCode}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 4. Instant Matching Materials (when search query is active) */}
      {trimmedQuery && (
        <section className="mb-8 card-neo bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-slate-900 bg-yellow-100">
            <h2 className="text-xs font-mono uppercase tracking-[0.08em] font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-900 stroke-[2.5]" aria-hidden="true" />
              <span>Matching Study Materials</span>
              <span className="font-mono text-xs text-slate-600 font-bold tabular">
                ({matchedResources.length})
              </span>
            </h2>
            <span className="font-mono text-[11px] text-slate-600 hidden sm:inline font-bold">
              Click to open directly in study view
            </span>
          </div>

          {matchedResources.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-mono text-slate-500 font-bold">
                No individual materials match “{query}”. Check course workspaces below or refine search.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
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
                    className="py-3 px-5 flex items-center justify-between gap-3 hover:bg-yellow-50 cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      {isDeck ? (
                        <Presentation className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-bold text-[13px] text-slate-900 truncate group-hover:underline">
                        {res.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold shrink-0">
                        {res.courseCode}
                      </span>
                      <span className="text-[11px] text-slate-500 hidden md:inline truncate font-medium">
                        {res.subjectName} · {KIND_SHORT[res.type] ?? res.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-600 font-bold">
                      <span>{res.fileSize}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-900 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 5. "Continue Studying" Bar */}
      {!trimmedQuery && recentStudy && (
        <section className="mb-6 animate-fadeIn">
          <div className="card-neo bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-slate-900 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] font-extrabold text-slate-500">
                    {recentStudy.source === 'recent' ? 'Continue Studying' : 'Saved Reading'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                    {recentStudy.courseCode}
                  </span>
                  {recentStudy.page > 1 && (
                    <span className="font-mono text-xs text-slate-500 font-bold">
                      Page {recentStudy.page}
                    </span>
                  )}
                </div>
                <h2
                  onClick={() => openDetail(recentStudy.resource, recentStudy.page)}
                  className="text-sm font-extrabold text-slate-900 truncate hover:underline cursor-pointer"
                  title={recentStudy.title}
                >
                  {recentStudy.title}
                </h2>
              </div>
            </div>

            <button
              onClick={() => openDetail(recentStudy.resource, recentStudy.page)}
              className="btn-neo bg-yellow-400 hover:bg-yellow-300 text-slate-900 border-2 border-slate-900 px-4 py-2 text-xs font-black rounded-xl shadow-[2px_2px_0px_#0f172a] flex items-center justify-center gap-1.5 shrink-0 transition-all"
            >
              <span>Resume Reading</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* 6. Subject Workspaces Grid — Primary Focus */}
      <section className="pt-1 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-[0.08em] font-black text-slate-700">
            Course Workspaces
            <span className="font-bold text-slate-500 tabular ml-2">
              ({filteredSubjects.length} of {subjects.length})
            </span>
          </h2>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="card-neo bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-10 text-center">
            <Library className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Subjects Match “{query}”</h3>
            <p className="text-xs text-slate-600 max-w-[40ch] mx-auto mb-4 font-medium">
              Try searching by course code (e.g. CMCOR2PC202) or clear your search query.
            </p>
            <button
              onClick={() => setQuery('')}
              className="btn-neo bg-yellow-400 text-slate-900 px-4 py-1.5 text-xs font-mono font-bold"
            >
              Clear Search Query
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="card-neo bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0f172a] transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Folder Icon + Course Code + Scheme Credits */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-yellow-400 border border-slate-900 flex items-center justify-center font-black text-slate-900 shadow-[1px_1px_0px_#0f172a]">
                        <Folder className="w-4 h-4 fill-slate-900/10" />
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                        {tile.courseCode}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-600 font-bold tabular">
                      {tile.credits ? `${tile.credits} cr` : ''}
                      {tile.category ? ` · ${tile.category}` : ''}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-amber-600 transition-colors">
                    {tile.name}
                  </h3>

                  {/* Concise Materials Summary */}
                  <p className="font-mono text-xs text-slate-600 mt-2.5 tabular font-medium">
                    <span className="font-extrabold text-slate-900">
                      {tile.materials} {tile.materials === 1 ? 'material' : 'materials'}
                    </span>
                    {tile.kinds.length > 0 && (
                      <span className="text-slate-500">
                        {' '}· {tile.kinds.map((k) => `${k.label} (${k.count})`).join(', ')}
                      </span>
                    )}
                  </p>
                </div>

                {/* Footer: AI Status & Enter Affordance */}
                <div className="pt-3.5 mt-4 border-t-2 border-slate-100 flex items-center justify-between text-xs">
                  <div className="font-mono text-[11px] flex items-center gap-1.5 font-bold">
                    {tile.indexed > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700 font-bold">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" aria-hidden="true" />
                        AI Assistant
                      </span>
                    ) : (
                      <span className="text-slate-400">Class Folder</span>
                    )}
                  </div>

                  <span className="btn-neo bg-slate-900 group-hover:bg-yellow-400 text-white group-hover:text-slate-900 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-colors border border-slate-900">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. Minimal Recently Added Materials Section */}
      {!trimmedQuery && recentMaterials.length > 0 && (
        <section className="mt-4 mb-8">
          <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900 mb-3">
            <h2 className="text-xs font-mono uppercase tracking-[0.08em] font-black text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-700 stroke-[2.5]" aria-hidden="true" />
              <span>Recently Added Materials</span>
            </h2>
            <span className="font-mono text-[10.5px] text-slate-500 font-bold">
              Direct jump to document
            </span>
          </div>

          <div className="card-neo bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] divide-y divide-slate-200 overflow-hidden">
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
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-yellow-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isDeck ? (
                      <Presentation className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                    )}
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono text-[10px] font-bold shrink-0">
                      {res.courseCode}
                    </span>
                    <span className="text-[13px] font-bold text-slate-900 truncate group-hover:underline">
                      {res.title}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 hidden sm:inline font-medium">
                      · {KIND_SHORT[res.type] ?? res.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px] text-slate-600 font-bold">
                    <span>{res.fileSize}</span>
                    <ArrowUpRight className="w-4 h-4 text-slate-900 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. Collapsible Official Curriculum Scheme (Neo Card) */}
      {schemeCourses.length > 0 && (
        <section className="mt-8 border-t-2 border-slate-900 pt-5">
          <button
            onClick={() => setStructureOpen((v) => !v)}
            aria-expanded={structureOpen}
            className="w-full flex items-center justify-between gap-3 text-left group p-3 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div>
              <span className="text-sm font-black text-slate-900 tracking-tight">
                Curriculum Structure &amp; Scheme
              </span>
              <span className="font-mono text-xs text-slate-500 font-bold ml-2 tabular">
                {schemeCourses.length} courses · SAKEC Autonomous Syllabus
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-900 stroke-[2.5] transition-transform ${
                structureOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {structureOpen && (
            <div className="mt-3 card-neo bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] divide-y divide-slate-200 overflow-hidden animate-fadeIn">
              <div className="px-5 py-2.5 bg-yellow-100 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.08em] text-slate-900 font-black border-b border-slate-900">
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
                  className={`w-full flex items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                    course.inLibrary && !course.isArchived
                      ? 'hover:bg-yellow-50 cursor-pointer'
                      : 'opacity-50 cursor-default'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold shrink-0">
                      {course.courseCode}
                    </span>
                    <span className="text-[13px] font-bold text-slate-900 truncate">
                      {course.courseName}
                    </span>
                    {course.isArchived && (
                      <span className="px-1.5 py-0.2 rounded border border-slate-400 font-mono text-[9px] font-bold text-slate-600 shrink-0">
                        Archived
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 shrink-0 font-mono text-xs text-slate-600 tabular font-bold">
                    <span className="hidden sm:inline text-slate-500">{course.category}</span>
                    <span className="text-yellow-600 font-black">{course.credits} cr</span>
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
