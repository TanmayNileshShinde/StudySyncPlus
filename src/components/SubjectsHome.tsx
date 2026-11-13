import React, { useMemo, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { ArrowUpRight, Search, ChevronDown, Library } from 'lucide-react';

/** Short labels for the material kinds shown inside subject tiles. */
const KIND_SHORT: Record<string, string> = {
  'Lecture Notes': 'Notes',
  'Past Exam Papers': 'Papers',
  'Lab Manual': 'Lab',
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
}

export const SubjectsHome: React.FC = () => {
  const { subjects, resources, semester, isLibraryLoading, openSubject, schemeCourses } = useResources();
  const [query, setQuery] = useState('');
  const [structureOpen, setStructureOpen] = useState(false);

  const tiles: SubjectTileData[] = useMemo(
    () =>
      subjects.map((subject) => {
        const own = resources.filter((r) => r.subjectId === subject.id);
        const kinds = KIND_ORDER.map((kind) => ({
          label: KIND_SHORT[kind] ?? kind,
          count: own.filter((r) => r.type === kind).length
        })).filter((k) => k.count > 0);
        return {
          id: subject.id,
          name: subject.name,
          courseCode: subject.courseCode,
          materials: own.length,
          indexed: own.filter((r) => r.ingestStatus === 'ready').length,
          kinds,
          bytes: own.reduce((acc, r) => acc + r.fileSizeBytes, 0)
        };
      }),
    [subjects, resources]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tiles;
    return tiles.filter((t) => t.name.toLowerCase().includes(q) || t.courseCode.toLowerCase().includes(q));
  }, [tiles, query]);

  const totalMaterials = resources.length;
  const totalIndexed = resources.filter((r) => r.ingestStatus === 'ready').length;
  const totalBytes = resources.reduce((acc, r) => acc + r.fileSizeBytes, 0);
  const totalSize = totalBytes > 1024 * 1024 * 1024
    ? `${(totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : `${Math.max(1, Math.round(totalBytes / 1024 / 1024))} MB`;

  if (isLibraryLoading) {
    return (
      <div className="px-4 sm:px-8 py-16 text-center text-ink-3 text-sm font-mono" role="status">
        Opening your course file…
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 pb-28 md:pb-16">
      {/* Hero — headline, one sentence, ruled facts */}
      <section className="pt-10 sm:pt-14 pb-8 border-b border-ink">
        <h1 className="text-[2.1rem] sm:text-[3rem] font-black tracking-[-0.03em] leading-[1.04] text-ink max-w-[20ch]">
          Your semester, subject by subject.
        </h1>
        <p className="text-sm sm:text-[15px] text-ink-2 mt-3 max-w-[62ch] leading-relaxed">
          {semester ? semester.label : 'Semester III'} at SAKEC — every course with its notes, papers, decks and
          lab manuals in one place. Open a subject, or ask the assistant a question.
        </p>

        <dl className="mt-6 flex flex-wrap items-stretch gap-x-0 gap-y-2 border border-rule divide-x divide-rule max-w-xl">
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Subjects</dt>
            <dd className="text-lg font-extrabold text-ink tabular leading-tight">{subjects.length}</dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Materials</dt>
            <dd className="text-lg font-extrabold text-ink tabular leading-tight">{totalMaterials}</dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Indexed</dt>
            <dd className="text-lg font-extrabold text-ink tabular leading-tight">
              {totalIndexed}
              <span className="text-ink-3 text-sm font-semibold">/{totalMaterials}</span>
            </dd>
          </div>
          <div className="px-4 py-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Library size</dt>
            <dd className="text-lg font-extrabold text-ink tabular leading-tight">{totalSize}</dd>
          </div>
        </dl>
      </section>

      {/* Subject grid */}
      <section className="pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-extrabold text-ink tracking-tight">Subjects</h2>
          <label className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a subject or course code…"
              aria-label="Find a subject"
              className="field w-full pl-9 pr-3 py-2 text-[13px]"
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="ruled-sunk p-10 text-center">
            <Library className="w-7 h-7 text-ink-3 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-ink-2 max-w-[42ch] mx-auto">
              {tiles.length === 0
                ? 'No subjects in the shelf yet. Add your first course from the scheme.'
                : 'No subject matches that search. Try the course code (e.g. CMCOR2PC202).'}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-x-5 sm:gap-y-6">
            {filtered.map((tile) => (
              <li key={tile.id}>
                <button
                  onClick={() => openSubject(tile.id)}
                  className="group w-full h-full text-left ruled p-5 transition-colors hover:border-ink bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="stamp stamp-ink font-mono">{tile.courseCode}</span>
                    <ArrowUpRight
                      className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-xl font-extrabold text-ink tracking-tight leading-snug mt-3">{tile.name}</h3>
                  <p className="font-mono text-[11px] text-ink-2 tabular mt-2">
                    {tile.materials} {tile.materials === 1 ? 'material' : 'materials'}
                    {tile.indexed > 0 && <span className="text-lime-text"> · {tile.indexed} indexed</span>}
                  </p>
                  {tile.kinds.length > 0 ? (
                    <p className="font-mono text-[10.5px] text-ink-3 mt-1 truncate">
                      {tile.kinds.map((k) => `${k.label} ${k.count}`).join(' · ')}
                    </p>
                  ) : (
                    <p className="font-mono text-[10.5px] text-ink-3 mt-1">Empty — add the first material</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Course structure — official scheme, collapsed by default */}
      {schemeCourses.length > 0 && (
        <section className="mt-10 border-t border-ink pt-6">
          <button
            onClick={() => setStructureOpen((v) => !v)}
            aria-expanded={structureOpen}
            className="w-full flex items-center justify-between gap-3 text-left group"
          >
            <span className="text-lg font-extrabold text-ink tracking-tight">
              Course structure
              <span className="font-mono text-[11px] text-ink-3 font-medium ml-2 tabular">
                {schemeCourses.length} official courses
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-ink-3 group-hover:text-ink transition-transform ${structureOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {structureOpen && (
            <ul className="mt-4 border border-rule divide-y divide-rule animate-fadeIn">
              {schemeCourses.map((course) => (
                <li key={course.id}>
                  <button
                    onClick={() => course.inLibrary && !course.isArchived && openSubject(course.id)}
                    disabled={!course.inLibrary || course.isArchived}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      course.inLibrary && !course.isArchived ? 'hover:bg-lime-wash' : 'opacity-50 cursor-default'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-ink-2 font-semibold shrink-0">{course.courseCode}</span>
                      <span className="text-[13px] font-semibold text-ink truncate">{course.courseName}</span>
                      {course.isArchived && <span className="stamp stamp-outline shrink-0">Archived</span>}
                    </span>
                    <span className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-ink-3 tabular">
                      <span className="hidden sm:inline">{course.category}</span>
                      <span className="text-lime-text font-bold">{course.credits} cr</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
