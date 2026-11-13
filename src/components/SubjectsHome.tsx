import React, { useMemo, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import {
  ArrowUpRight,
  Search,
  ChevronDown,
  Library,
  Sparkles,
  FileText,
  Presentation,
  PlusCircle,
  X
} from 'lucide-react';
import type { StudyResource } from '../types';

/** Short labels for the material kinds shown inside subject tiles */
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
    isLibraryLoading,
    openSubject,
    openAssistant,
    openDetail,
    openUploadModal,
    schemeCourses
  } = useResources();

  const [query, setQuery] = useState('');
  const [structureOpen, setStructureOpen] = useState(false);

  // Map scheme courses by ID for quick lookup
  const schemeMap = useMemo(() => {
    const map = new Map<string, { credits: number; category: string }>();
    for (const c of schemeCourses) {
      map.set(c.id, { credits: c.credits, category: c.category });
    }
    return map;
  }, [schemeCourses]);

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
      (t) => t.name.toLowerCase().includes(trimmedQuery) || t.courseCode.toLowerCase().includes(trimmedQuery)
    );
  }, [tiles, trimmedQuery]);

  // Matched materials across the entire library
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

  const totalMaterials = resources.length;
  const totalIndexed = resources.filter((r) => r.ingestStatus === 'ready').length;
  const totalBytes = resources.reduce((acc, r) => acc + r.fileSizeBytes, 0);
  const totalSize =
    totalBytes > 1024 * 1024 * 1024
      ? `${(totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB`
      : `${Math.max(1, Math.round(totalBytes / 1024 / 1024))} MB`;

  if (isLibraryLoading) {
    return (
      <div className="px-4 sm:px-8 py-20 text-center text-ink-3 text-sm font-mono" role="status">
        <span className="inline-block animate-pulse">Opening academic course file…</span>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 pb-28 md:pb-16 max-w-[1400px] mx-auto animate-fadeIn">
      {/* Editorial Academic Hero */}
      <section className="pt-8 sm:pt-12 pb-7 border-b border-ink">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="stamp stamp-ink font-mono text-[10.5px]">Academic Workspace</span>
              <span className="stamp stamp-outline text-[10.5px]">
                {semester ? semester.label : 'Semester III'}
              </span>
              <span className="stamp stamp-verified bg-lime text-ink text-[10.5px] hidden sm:inline-flex">
                Official SAKEC File
              </span>
            </div>
            <h1 className="text-[2.2rem] sm:text-[3.25rem] font-black tracking-[-0.03em] leading-[1.02] text-ink">
              Your semester, organized around subjects.
            </h1>
            <p className="text-sm sm:text-[15px] text-ink-2 mt-3 leading-relaxed">
              Find notes, past papers, lab manuals and lecture decks organized by course. Ask questions across your
              materials with verified page citations, or contribute resources.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => openAssistant({ mode: 'semester' })}
              className="btn btn-secondary px-4 h-10 border-ink hover:bg-lime-wash flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
              <span>Ask Study Assistant</span>
            </button>
            <button
              onClick={() => openUploadModal()}
              className="btn btn-primary px-4 h-10 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Contribute Materials</span>
            </button>
          </div>
        </div>

        {/* Facts strip */}
        <dl className="mt-7 flex flex-wrap items-stretch gap-x-0 gap-y-2 border border-rule divide-x divide-rule max-w-2xl bg-paper">
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Subjects</dt>
            <dd className="text-xl font-black text-ink tabular leading-tight mt-0.5">{subjects.length}</dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Materials</dt>
            <dd className="text-xl font-black text-ink tabular leading-tight mt-0.5">{totalMaterials}</dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">AI Indexed</dt>
            <dd className="text-xl font-black text-ink tabular leading-tight mt-0.5">
              {totalIndexed}
              <span className="text-ink-3 text-sm font-semibold">/{totalMaterials}</span>
            </dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Library Size</dt>
            <dd className="text-xl font-black text-ink tabular leading-tight mt-0.5">{totalSize}</dd>
          </div>
        </dl>
      </section>

      {/* Omnisearch Bar */}
      <section className="pt-7 pb-4">
        <div className="relative">
          <Search
            className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything: courses, topics (e.g. 'Binary Search Tree'), PYQs, notes, tags…"
            aria-label="Search courses and study materials"
            className="field w-full pl-10 pr-10 py-3 text-[13.5px] font-medium bg-paper-sunk hover:bg-paper focus:bg-paper"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* Matching Materials Strip (When search query is active) */}
      {trimmedQuery && matchedResources.length > 0 && (
        <section className="mb-8 ruled p-5 bg-paper">
          <div className="flex items-center justify-between pb-3 border-b border-ink mb-3">
            <h2 className="text-sm font-black text-ink uppercase tracking-[0.06em] flex items-center gap-2">
              <FileText className="w-4 h-4 text-lime-deep" aria-hidden="true" />
              <span>Matching Study Materials</span>
              <span className="font-mono text-xs text-ink-3 tabular">({matchedResources.length})</span>
            </h2>
            <span className="font-mono text-[10.5px] text-ink-3">Click any material to open study view</span>
          </div>

          <div className="divide-y divide-rule max-h-72 overflow-y-auto">
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
                  className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-lime-wash/60 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    {isDeck ? (
                      <Presentation className="w-4 h-4 text-ink-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <FileText className="w-4 h-4 text-ink-3 shrink-0" aria-hidden="true" />
                    )}
                    <span className="font-bold text-[13px] text-ink truncate">{res.title}</span>
                    <span className="stamp stamp-outline text-[9px] py-0 px-1 font-mono shrink-0">
                      {res.courseCode}
                    </span>
                    <span className="text-[11px] text-ink-3 hidden sm:inline truncate">
                      {res.subjectName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-ink-2">
                    <span>{res.fileSize}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-ink-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Subject Workspaces Grid */}
      <section className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-black text-ink tracking-tight">
            Subject Workspaces
            <span className="font-mono text-xs text-ink-3 ml-2 tabular font-normal">
              {filteredSubjects.length} of {subjects.length} active
            </span>
          </h2>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="ruled-sunk p-10 text-center">
            <Library className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-sm font-bold text-ink mb-1">No Subjects Match “{query}”</h3>
            <p className="text-xs text-ink-2 max-w-[40ch] mx-auto">
              Try searching by course code (e.g. CMCOR2PC202) or clear your search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSubjects.map((tile) => (
              <div
                key={tile.id}
                className="ruled p-5 bg-paper flex flex-col justify-between hover:border-ink transition-colors group relative"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="stamp stamp-ink font-mono text-[10.5px]">{tile.courseCode}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
                      {tile.credits && (
                        <span className="font-bold text-ink bg-paper-sunk px-1.5 py-0.5 border border-rule">
                          {tile.credits} cr
                        </span>
                      )}
                      {tile.category && (
                        <span className="hidden sm:inline-block uppercase text-[10px] tracking-[0.06em]">
                          {tile.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject Title */}
                  <h3
                    onClick={() => openSubject(tile.id)}
                    className="text-lg sm:text-xl font-black text-ink tracking-tight leading-snug cursor-pointer group-hover:underline underline-offset-2"
                  >
                    {tile.name}
                  </h3>

                  {/* Material count & indexed pill */}
                  <p className="font-mono text-[11.5px] text-ink-2 tabular mt-2 flex items-center gap-2">
                    <span className="font-bold text-ink">
                      {tile.materials} {tile.materials === 1 ? 'material' : 'materials'}
                    </span>
                    {tile.indexed > 0 && (
                      <span className="text-lime-text font-bold">· {tile.indexed} indexed for AI</span>
                    )}
                  </p>

                  {/* Category breakdown */}
                  {tile.kinds.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {tile.kinds.map((k, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-[10px] px-1.5 py-0.5 border border-rule bg-paper-sunk text-ink-2"
                        >
                          {k.label} <strong className="text-ink">{k.count}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] text-ink-3 mt-3">Empty shelf — add first material</p>
                  )}
                </div>

                {/* Primary Card Actions */}
                <div className="pt-5 mt-4 border-t border-rule flex items-center justify-between gap-2">
                  <button
                    onClick={() => openAssistant({ mode: 'subject', subjectId: tile.id })}
                    className="btn btn-ghost px-2 text-xs flex items-center gap-1 text-ink-2 hover:text-ink"
                    title={`Ask Study Assistant about ${tile.name}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
                    <span>Ask AI</span>
                  </button>

                  <button
                    onClick={() => openSubject(tile.id)}
                    className="btn btn-secondary px-3.5 text-xs font-bold flex items-center gap-1.5 group-hover:bg-ink group-hover:text-paper group-hover:border-ink transition-colors"
                  >
                    <span>Open Workspace</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Collapsible Official Department Scheme */}
      {schemeCourses.length > 0 && (
        <section className="mt-12 border-t border-ink pt-6">
          <button
            onClick={() => setStructureOpen((v) => !v)}
            aria-expanded={structureOpen}
            className="w-full flex items-center justify-between gap-3 text-left group"
          >
            <div>
              <span className="text-base sm:text-lg font-black text-ink tracking-tight">
                Academic Curriculum Structure
              </span>
              <span className="font-mono text-[11px] text-ink-3 font-medium ml-2 tabular">
                {schemeCourses.length} official courses · SAKEC Syllabus
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
            <div className="mt-4 border border-rule divide-y divide-rule animate-fadeIn bg-paper">
              <div className="px-4 py-2 bg-paper-sunk flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.08em] text-ink-3 font-semibold">
                <span>Course &amp; Title</span>
                <span>Category · Credits</span>
              </div>
              {schemeCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => course.inLibrary && !course.isArchived && openSubject(course.id)}
                  role={course.inLibrary && !course.isArchived ? 'button' : undefined}
                  tabIndex={course.inLibrary && !course.isArchived ? 0 : undefined}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    course.inLibrary && !course.isArchived
                      ? 'hover:bg-lime-wash/60 cursor-pointer'
                      : 'opacity-50 cursor-default'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] text-ink font-bold shrink-0">{course.courseCode}</span>
                    <span className="text-[13px] font-semibold text-ink truncate">{course.courseName}</span>
                    {course.isArchived && <span className="stamp stamp-outline shrink-0">Archived</span>}
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