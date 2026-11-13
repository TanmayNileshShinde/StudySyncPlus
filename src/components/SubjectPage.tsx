import React, { useMemo, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { downloadResourcesAsZip } from '../lib/zipDownload';
import { SYLLABUS_MODULES } from './SyllabusVivaModal';
import type { StudyResource, MoreSheetKind } from '../types';
import {
  ArrowLeft,
  Download,
  FileText,
  Presentation,
  Bookmark,
  RotateCcw,
  Sparkles,
  PlusCircle,
  ChevronDown,
  CheckCircle2,
  Layers,
  Code,
  LoaderCircle
} from 'lucide-react';

/** Official course whose syllabus→viva mapping is embedded in the subject page. */
const VIVA_COURSE_CODE = 'CMLOR2VS201';

const KIND_GROUPS: Array<{ type: string; short: string }> = [
  { type: 'Lecture Notes', short: 'Notes' },
  { type: 'Past Exam Papers', short: 'Past papers' },
  { type: 'Lab Manual', short: 'Lab manuals' },
  { type: 'Cheat Sheet', short: 'Cheat sheets' },
  { type: 'Reference Book', short: 'Reference books' }
];

/** Ingestion state as a small honest mark. */
const IngestMark: React.FC<{ resource: StudyResource }> = ({ resource }) => {
  if (!resource.hasFile) return null;
  if (resource.ingestStatus === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-lime-text" title={`Indexed ${resource.chunkCount ?? 0} vector chunks`}>
        <span className="w-1.5 h-1.5 bg-lime-deep inline-block" aria-hidden="true" />
        Indexed
      </span>
    );
  }
  if (resource.ingestStatus === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-alert" title={resource.ingestError ?? 'Indexing failed'}>
        <span className="w-1.5 h-1.5 bg-alert inline-block" aria-hidden="true" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3" title="Building the vector index">
      <LoaderCircle className="w-3 h-3 animate-spin" aria-hidden="true" />
      Indexing
    </span>
  );
};

const ResourceRow: React.FC<{
  resource: StudyResource;
  onAsk: (resource: StudyResource) => void;
}> = ({ resource, onAsk }) => {
  const { openDetail, toggleBookmark, isBookmarked, downloadResource, reindexResource, showToast } = useResources();
  const bookmarked = isBookmarked(resource.id);

  const handleRetry = async () => {
    try {
      showToast('Rebuilding the index…');
      const result = await reindexResource(resource.id);
      showToast(result.message);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Re-index failed. Please try again.');
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${resource.title}`}
      onClick={() => openDetail(resource)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail(resource);
        }
      }}
      className="group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 px-3 sm:px-4 py-3 hover:bg-lime-wash/60 transition-colors cursor-pointer"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {resource.fileKind === 'pptx' || resource.fileKind === 'ppt' ? (
            <Presentation className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
          )}
          <span className="text-[13px] font-semibold text-ink truncate">{resource.title}</span>
        </div>
        <p className="font-mono text-[10px] text-ink-3 mt-0.5 truncate">
          {resource.fileSize} · {resource.uploadedBy} · {resource.uploadDate}
        </p>
      </div>

      <div className="hidden sm:block">
        <IngestMark resource={resource} />
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            void downloadResource(resource);
          }}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={`Download ${resource.title}`}
          title="Download"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void toggleBookmark(resource.id);
          }}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={bookmarked ? `Remove ${resource.title} from saved` : `Save ${resource.title}`}
          aria-pressed={bookmarked}
          title={bookmarked ? 'Remove from saved' : 'Save for revision'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-lime-deep text-lime-deep' : ''}`} aria-hidden="true" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAsk(resource);
          }}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={`Ask the assistant about ${resource.title}`}
          title="Ask about this document"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
        </button>
        {resource.ingestStatus === 'failed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleRetry();
            }}
            className="p-1.5 text-alert hover:bg-paper-sunk transition-colors"
            aria-label={`Retry indexing ${resource.title}`}
            title="Retry indexing"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

/** Embedded syllabus→viva inspector for the tracked course. */
const VivaSection: React.FC = () => {
  const [activeModule, setActiveModule] = useState(SYLLABUS_MODULES[0].moduleNumber);
  const [open, setOpen] = useState(false);
  const selected = SYLLABUS_MODULES.find((m) => m.moduleNumber === activeModule) ?? SYLLABUS_MODULES[0];

  return (
    <section className="mt-10 border-t border-ink pt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left group"
      >
        <span className="text-lg font-extrabold text-ink tracking-tight">
          Syllabus &amp; viva map
          <span className="font-mono text-[11px] text-ink-3 font-medium ml-2">CO1–CO6 · 4 modules</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-3 group-hover:text-ink transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-5 space-y-5 animate-fadeIn">
          <nav className="tab-rail no-scrollbar" aria-label="Syllabus modules">
            {SYLLABUS_MODULES.map((mod) => (
              <button
                key={mod.moduleNumber}
                onClick={() => setActiveModule(mod.moduleNumber)}
                aria-pressed={activeModule === mod.moduleNumber}
                className={`tab-rail-item flex flex-col items-start gap-1 ${
                  activeModule === mod.moduleNumber ? 'is-active' : ''
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-80">
                  Module {mod.moduleNumber} · {mod.mappedCO}
                </span>
                <span className="font-bold text-xs sm:text-sm">{mod.name}</span>
              </button>
            ))}
          </nav>

          <section className="ruled p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-ink">
              <div>
                <p className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
                  Module {selected.moduleNumber} · {selected.mappedCO} · {selected.hours} Lecture Hours
                </p>
                <h3 className="text-xl font-black text-ink tracking-tight">{selected.name}</h3>
              </div>
              <span className="stamp stamp-verified animate-stamp hidden sm:inline-flex">Covered</span>
            </div>

            <ul className="space-y-2">
              {selected.outcomes.map((topic, i) => (
                <li key={i} className="flex items-start gap-2.5 p-3 ruled-sunk text-xs sm:text-sm text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-text shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>

            <div className="ruled-sunk p-4">
              <h4 className="text-[11px] font-mono font-semibold text-ink uppercase tracking-[0.08em] mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                Project Implementation Details
              </h4>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">{selected.implementationInApp}</p>
            </div>

            <div className="bg-ink text-paper font-mono text-xs p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Code className="w-4 h-4 text-lime shrink-0" aria-hidden="true" />
                <span className="text-ink-3">Source Code:</span>
                <span className="font-bold break-all">{selected.codeReference}</span>
              </div>
              <span className="text-lime font-bold uppercase text-[10px] tracking-[0.08em] shrink-0">Verified &amp; Active</span>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

interface SubjectPageProps {
  subjectId: string;
  onOpenSheet: (kind: MoreSheetKind) => void;
}

/** The subject workspace: everything about one course, progressively disclosed. */
export const SubjectPage: React.FC<SubjectPageProps> = ({ subjectId, onOpenSheet }) => {
  const { subjects, resources, schemeCourses, openHome, openAssistant, openUploadModal, subjectSearch, setSubjectSearch, collectDownloadArtifact, showToast } =
    useResources();

  const subject = subjects.find((s) => s.id === subjectId);
  const own = useMemo(() => resources.filter((r) => r.subjectId === subjectId), [resources, subjectId]);
  const scheme = schemeCourses.find((c) => c.id === subjectId);

  const [zipState, setZipState] = useState<{ busy: boolean; done: number; total: number }>({ busy: false, done: 0, total: 0 });

  const filtered = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return own;
    return own.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.uploadedBy.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [own, subjectSearch]);

  if (!subject) {
    return (
      <div className="px-4 sm:px-8 py-16 text-center">
        <p className="text-sm text-ink-2 mb-4">That subject is no longer on the shelf.</p>
        <button onClick={openHome} className="btn btn-secondary">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to subjects</span>
        </button>
      </div>
    );
  }

  const indexedCount = own.filter((r) => r.ingestStatus === 'ready').length;

  const handleZip = async () => {
    if (zipState.busy || own.length === 0) return;
    setZipState({ busy: true, done: 0, total: own.length });
    try {
      await downloadResourcesAsZip(subject.name, subject.courseCode, own, collectDownloadArtifact, (done, total) =>
        setZipState({ busy: true, done, total })
      );
      showToast(`Course file ZIP downloaded (${own.length} items).`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not build the ZIP. Please try again.');
    } finally {
      setZipState({ busy: false, done: 0, total: 0 });
    }
  };

  const askSubject = () => openAssistant({ mode: 'subject', subjectId });

  const groups = KIND_GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((r) => r.type === g.type)
  })).filter((g) => g.items.length > 0);
  const unmatched = filtered.filter((r) => !KIND_GROUPS.some((g) => g.type === r.type));

  return (
    <div className="px-4 sm:px-8 pb-28 md:pb-16 animate-fadeIn">
      {/* Mobile back link */}
      <button
        onClick={openHome}
        className="md:hidden flex items-center gap-2 pt-4 pb-2 text-[13px] font-semibold text-ink-2"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>All subjects</span>
      </button>

      {/* Subject header */}
      <header className="pt-6 sm:pt-10 pb-6 border-b border-ink">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="stamp stamp-ink font-mono">{subject.courseCode}</span>
          {scheme && <span className="stamp stamp-outline">{scheme.credits} credits</span>}
          {scheme && <span className="stamp stamp-outline hidden sm:inline-flex">{scheme.category}</span>}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-[2rem] sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-ink">
              {subject.name}
            </h1>
            <p className="font-mono text-[12px] text-ink-2 tabular mt-3">
              {own.length} {own.length === 1 ? 'material' : 'materials'}
              {own.length > 0 && <> · {indexedCount} indexed for AI study</>}
              {scheme && <> · CL {scheme.cl} / TL {scheme.tl} / LL {scheme.ll} · {scheme.nh}h</>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button onClick={() => openUploadModal(subjectId)} className="btn btn-primary">
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Add materials</span>
            </button>
            <button
              onClick={() => void handleZip()}
              disabled={zipState.busy || own.length === 0}
              className="btn btn-secondary"
              title="Download every material in this subject as one ZIP"
            >
              {zipState.busy ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="tabular">
                    Packing {zipState.done}/{zipState.total}…
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download all</span>
                </>
              )}
            </button>
            <button onClick={askSubject} className="btn btn-secondary" title="Ask about this subject's documents">
              <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
              <span>Ask this subject</span>
            </button>
          </div>
        </div>
      </header>

      {/* Materials */}
      <section className="pt-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-ink tracking-tight">Materials</h2>
          <label className="relative w-full sm:w-72">
            <input
              type="search"
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              placeholder="Search this subject…"
              aria-label="Search materials in this subject"
              className="field w-full px-3 py-2 text-[13px]"
            />
          </label>
        </div>

        {own.length === 0 ? (
          <div className="ruled-sunk p-10 text-center">
            <FileText className="w-7 h-7 text-ink-3 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-ink-2 max-w-[44ch] mx-auto mb-4">
              Nothing filed under {subject.name} yet. Add the first PDF or deck — it gets indexed for the
              assistant automatically.
            </p>
            <button onClick={() => openUploadModal(subjectId)} className="btn btn-primary">
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Add materials</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="ruled-sunk p-8 text-center text-sm text-ink-2">
            No material matches “{subjectSearch}”.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.type} className="ruled">
                <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-ink bg-sunk">
                  <h3 className="text-[13px] font-extrabold text-ink">{group.short}</h3>
                  <span className="font-mono text-[10px] text-ink-3 tabular">{group.items.length}</span>
                </div>
                <div className="divide-y divide-rule">
                  {group.items.map((resource) => (
                    <ResourceRow key={resource.id} resource={resource} onAsk={(r) => openAssistant({ mode: 'resource', resourceId: r.id })} />
                  ))}
                </div>
              </div>
            ))}
            {unmatched.length > 0 && (
              <div className="ruled">
                <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-ink bg-sunk">
                  <h3 className="text-[13px] font-extrabold text-ink">Other</h3>
                  <span className="font-mono text-[10px] text-ink-3 tabular">{unmatched.length}</span>
                </div>
                <div className="divide-y divide-rule">
                  {unmatched.map((resource) => (
                    <ResourceRow key={resource.id} resource={resource} onAsk={(r) => openAssistant({ mode: 'resource', resourceId: r.id })} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Syllabus & viva — embedded for the tracked course */}
      {subject.courseCode === VIVA_COURSE_CODE && <VivaSection />}

      {/* Escape hatch to the official sheet for evaluators */}
      {subject.courseCode !== VIVA_COURSE_CODE && (
        <p className="mt-10 border-t border-rule pt-4 font-mono text-[11px] text-ink-3">
          Course structure lives in{' '}
          <button onClick={() => onOpenSheet('scheme')} className="underline underline-offset-2 hover:text-ink font-semibold">
            Scheme &amp; credits
          </button>
          .
        </p>
      )}
    </div>
  );
};
