import React, { useMemo, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { downloadResourcesAsZip } from '../lib/zipDownload';
import { SYLLABUS_MODULES } from '../data/syllabusData';
import type { StudyResource, MoreSheetKind, ResourceType } from '../types';
import {
  ArrowLeft,
  Download,
  FileText,
  Presentation,
  Bookmark,
  RotateCcw,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  Layers,
  Code,
  LoaderCircle,
  Star
} from 'lucide-react';

const CATEGORY_TABS: Array<{ label: string; type: ResourceType | 'ALL'; short: string }> = [
  { label: 'All', type: 'ALL', short: 'All' },
  { label: 'Lecture Notes', type: 'Lecture Notes', short: 'Notes' },
  { label: 'Past Papers / PYQs', type: 'Past Exam Papers', short: 'PYQs' },
  { label: 'Lab Manuals', type: 'Lab Manual', short: 'Labs' },
  { label: 'Cheat Sheets', type: 'Cheat Sheet', short: 'Sheets' },
  { label: 'Reference Books', type: 'Reference Book', short: 'Books' }
];

/** Ingestion state as a clear, honest badge */
const IngestMark: React.FC<{ resource: StudyResource }> = ({ resource }) => {
  if (!resource.hasFile) return null;
  if (resource.ingestStatus === 'ready') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-lime-text bg-lime/15 px-1.5 py-0.5 border border-lime/30"
        title={`Indexed ${resource.chunkCount ?? 0} vector chunks ready for AI queries`}
      >
        <span className="w-1.5 h-1.5 bg-lime-deep inline-block" aria-hidden="true" />
        Indexed
      </span>
    );
  }
  if (resource.ingestStatus === 'failed') {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-alert bg-alert/10 px-1.5 py-0.5 border border-alert/30"
        title={resource.ingestError ?? 'Vector indexing failed'}
      >
        <span className="w-1.5 h-1.5 bg-alert inline-block" aria-hidden="true" />
        Failed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 bg-paper-sunk px-1.5 py-0.5 border border-rule"
      title="Extracting pages & building vector embeddings"
    >
      <LoaderCircle className="w-3 h-3 animate-spin text-lime-deep" aria-hidden="true" />
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
      showToast('Rebuilding vector index…');
      const result = await reindexResource(resource.id);
      showToast(result.message);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Re-index failed. Please try again.');
    }
  };

  const isDeck = resource.fileKind === 'pptx' || resource.fileKind === 'ppt';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open study view for ${resource.title}`}
      onClick={() => openDetail(resource)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail(resource);
        }
      }}
      className="group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1.5 px-3.5 sm:px-5 py-3 hover:bg-lime-wash/60 transition-colors cursor-pointer border-b border-rule last:border-b-0 bg-paper"
    >
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
          {isDeck ? (
            <Presentation className="w-4 h-4 text-ink-3 shrink-0 group-hover:text-ink" aria-hidden="true" />
          ) : (
            <FileText className="w-4 h-4 text-ink-3 shrink-0 group-hover:text-ink" aria-hidden="true" />
          )}
          <span className="text-[13.5px] font-bold text-ink truncate group-hover:text-ink-2">
            {resource.title}
          </span>
          <span className="stamp stamp-outline text-[9px] py-0 px-1 font-mono shrink-0 hidden md:inline-flex">
            {resource.type}
          </span>
        </div>
        <p className="font-mono text-[10.5px] text-ink-3 mt-1 truncate flex items-center gap-2">
          <span>{resource.fileSize}</span>
          <span>·</span>
          <span>{resource.uploadedBy} ({resource.rollNumber})</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-lime text-lime-deep" aria-hidden="true" />
            {resource.rating > 0 ? resource.rating.toFixed(1) : 'Unrated'}
          </span>
          <span className="hidden sm:inline">· {resource.uploadDate}</span>
        </p>
      </div>

      <div className="hidden sm:block shrink-0">
        <IngestMark resource={resource} />
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => void downloadResource(resource)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={`Download ${resource.title}`}
          title="Download file"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          onClick={() => void toggleBookmark(resource.id)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={bookmarked ? `Remove ${resource.title} from saved` : `Save ${resource.title}`}
          aria-pressed={bookmarked}
          title={bookmarked ? 'Saved for exam revision' : 'Save for revision'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-lime-deep text-lime-deep' : ''}`} aria-hidden="true" />
        </button>

        <button
          onClick={() => onAsk(resource)}
          className="p-1.5 text-ink-3 hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label={`Ask Study Assistant about ${resource.title}`}
          title="Ask AI about this document"
        >
          <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
        </button>

        {resource.ingestStatus === 'failed' && (
          <button
            onClick={() => void handleRetry()}
            className="p-1.5 text-alert hover:bg-paper-sunk transition-colors"
            aria-label={`Retry vector indexing for ${resource.title}`}
            title="Retry vector indexing"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

interface SubjectPageProps {
  subjectId: string;
  onOpenSheet: (kind: MoreSheetKind) => void;
}

export const SubjectPage: React.FC<SubjectPageProps> = ({ subjectId, onOpenSheet }) => {
  const {
    subjects,
    resources,
    schemeCourses,
    isLibraryLoading,
    openHome,
    openAssistant,
    openUploadModal,
    subjectSearch,
    setSubjectSearch,
    collectDownloadArtifact,
    showToast
  } = useResources();

  const [activeTab, setActiveTab] = useState<'materials' | 'syllabus' | 'scheme'>('materials');
  const [selectedCategory, setSelectedCategory] = useState<ResourceType | 'ALL'>('ALL');
  const [activeModuleNumber, setActiveModuleNumber] = useState(SYLLABUS_MODULES[0].moduleNumber);
  const [zipState, setZipState] = useState<{ busy: boolean; done: number; total: number }>({
    busy: false,
    done: 0,
    total: 0
  });

  const subject = subjects.find((s) => s.id === subjectId);
  const own = useMemo(() => resources.filter((r) => r.subjectId === subjectId), [resources, subjectId]);
  const scheme = schemeCourses.find((c) => c.id === subjectId);

  const filtered = useMemo(() => {
    let result = own;
    if (selectedCategory !== 'ALL') {
      result = result.filter((r) => r.type === selectedCategory);
    }
    const q = subjectSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.uploadedBy.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [own, selectedCategory, subjectSearch]);

  // Compute counts for tabs
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: own.length };
    for (const r of own) {
      counts[r.type] = (counts[r.type] || 0) + 1;
    }
    return counts;
  }, [own]);

  const activeModule = SYLLABUS_MODULES.find((m) => m.moduleNumber === activeModuleNumber) ?? SYLLABUS_MODULES[0];

  if (isLibraryLoading) {
    return (
      <div className="flex-1 flex flex-col p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-paper-sunk w-64 border border-rule" />
        <div className="h-4 bg-paper-sunk w-96 border border-rule" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-paper-sunk border border-rule" />
          ))}
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] bg-paper">
        <div className="border border-ink bg-paper p-8 max-w-md w-full shadow-xs">
          <span className="stamp stamp-alert font-mono mb-3 inline-block">Subject Not Found</span>
          <h2 className="text-base font-bold text-ink mb-1.5">Course not in active curriculum</h2>
          <p className="text-xs text-ink-2 mb-6 leading-relaxed">
            The subject identifier <code className="bg-paper-sunk px-1.5 py-0.5 font-mono text-[11px] text-ink">{subjectId}</code> does not match any course in the current semester scheme. It may have been archived or removed.
          </p>
          <button onClick={openHome} className="btn btn-secondary w-full justify-center">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Return to All Subjects</span>
          </button>
        </div>
      </div>
    );
  }

  const indexedCount = own.filter((r) => r.ingestStatus === 'ready').length;

  const handleZip = async () => {
    if (zipState.busy || own.length === 0) return;
    setZipState({ busy: true, done: 0, total: own.length });
    try {
      await downloadResourcesAsZip(
        subject.name,
        subject.courseCode,
        own,
        collectDownloadArtifact,
        (done, total) => setZipState({ busy: true, done, total })
      );
      showToast(`Subject course file downloaded (${own.length} items).`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not generate ZIP archive. Please retry.');
    } finally {
      setZipState({ busy: false, done: 0, total: 0 });
    }
  };

  const askSubject = () => openAssistant({ mode: 'subject', subjectId });

  return (
    <div className="px-4 sm:px-8 pb-28 md:pb-16 animate-fadeIn">
      {/* Mobile Back Link */}
      <button
        onClick={openHome}
        className="md:hidden flex items-center gap-1.5 pt-4 pb-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>All Subjects</span>
      </button>

      {/* Subject Header */}
      <header className="pt-5 sm:pt-8 pb-6 border-b border-ink">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span className="stamp stamp-ink font-mono text-[11px]">{subject.courseCode}</span>
          {scheme && <span className="stamp stamp-outline text-[11px] font-bold">{scheme.credits} Credits</span>}
          {scheme && <span className="stamp stamp-outline text-[11px] hidden sm:inline-flex">{scheme.category}</span>}
          <span className="stamp stamp-verified bg-lime text-ink text-[10px] hidden sm:inline-flex">Official Course File</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-[2.1rem] sm:text-[2.85rem] font-black tracking-[-0.03em] leading-[1.04] text-ink">
              {subject.name}
            </h1>
            <p className="font-mono text-[12px] text-ink-2 tabular mt-2.5 flex items-center gap-2 flex-wrap">
              <span>{own.length} {own.length === 1 ? 'material' : 'materials'}</span>
              <span>·</span>
              <span className="text-lime-text font-bold">{indexedCount} indexed for AI</span>
              {scheme && (
                <>
                  <span>·</span>
                  <span>CL {scheme.cl} / TL {scheme.tl} / LL {scheme.ll} · {scheme.nh}h total</span>
                </>
              )}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button onClick={() => openUploadModal(subjectId)} className="btn btn-primary px-4">
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Add Materials</span>
            </button>

            <button
              onClick={() => void handleZip()}
              disabled={zipState.busy || own.length === 0}
              className="btn btn-secondary px-3.5"
              title="Download all subject files in a clean ZIP"
            >
              {zipState.busy ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="tabular">Packing {zipState.done}/{zipState.total}…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Download All (ZIP)</span>
                </>
              )}
            </button>

            <button onClick={askSubject} className="btn btn-secondary px-3.5" title="Ask Study Assistant about this subject">
              <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
              <span>Ask Subject AI</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-6 flex items-center gap-1 border-b border-rule pt-2">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] border-b-2 transition-colors ${
              activeTab === 'materials'
                ? 'border-ink text-ink bg-paper'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Study Materials ({own.length})
          </button>
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] border-b-2 transition-colors ${
              activeTab === 'syllabus'
                ? 'border-ink text-ink bg-paper'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Syllabus &amp; Viva Map
          </button>
          {scheme && (
            <button
              onClick={() => setActiveTab('scheme')}
              className={`px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.06em] border-b-2 transition-colors ${
                activeTab === 'scheme'
                  ? 'border-ink text-ink bg-paper'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              Course Scheme
            </button>
          )}
        </div>
      </header>

      {/* Main Tab Content */}
      {activeTab === 'materials' && (
        <section className="pt-6">
          {/* Category Filter Pills & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {CATEGORY_TABS.map((tab) => {
                const count = tabCounts[tab.type] || 0;
                if (tab.type !== 'ALL' && count === 0) return null;
                const active = selectedCategory === tab.type;
                return (
                  <button
                    key={tab.type}
                    onClick={() => setSelectedCategory(tab.type)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-none transition-colors shrink-0 flex items-center gap-1.5 ${
                      active
                        ? 'bg-ink text-paper shadow-[inset_0_-2px_0_var(--lime)]'
                        : 'bg-paper text-ink-2 border border-rule hover:border-ink hover:text-ink'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`font-mono text-[10px] tabular ${active ? 'text-lime' : 'text-ink-3'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="relative w-full md:w-72 shrink-0">
              <input
                type="search"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search notes, tags, uploader…"
                aria-label="Filter materials in this subject"
                className="field w-full px-3 py-1.5 text-[12.5px]"
              />
            </label>
          </div>

          {/* Document Rows */}
          {own.length === 0 ? (
            <div className="ruled-sunk p-10 text-center">
              <FileText className="w-8 h-8 text-ink-3 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-sm font-bold text-ink mb-1">No Materials Filed Yet</h3>
              <p className="text-xs text-ink-2 max-w-[46ch] mx-auto mb-4">
                Be the first to contribute lecture notes, PYQs, or slides for {subject.name}. Files are
                indexed for the AI Study Assistant automatically.
              </p>
              <button onClick={() => openUploadModal(subjectId)} className="btn btn-primary">
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>Upload Materials</span>
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ruled-sunk p-8 text-center text-xs text-ink-2">
              <p>No materials found matching “{subjectSearch}” in this category.</p>
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSubjectSearch('');
                }}
                className="mt-2 text-ink font-semibold underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="ruled divide-y divide-rule overflow-hidden">
              {filtered.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  onAsk={(r) => openAssistant({ mode: 'resource', resourceId: r.id })}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Syllabus & Viva Guide Tab */}
      {activeTab === 'syllabus' && (
        <section className="pt-6 space-y-6">
          <div className="ruled p-5 bg-paper">
            <h2 className="text-base font-extrabold text-ink mb-1">
              Curriculum Modules &amp; Viva Voce Guide
            </h2>
            <p className="text-xs text-ink-2 max-w-2xl leading-relaxed">
              Official module outcomes mapped to SAKEC Semester III syllabus. Evaluators examine student understanding
              across these modules during internal and oral viva examinations.
            </p>
          </div>

          <nav className="tab-rail no-scrollbar" aria-label="Syllabus modules">
            {SYLLABUS_MODULES.map((mod) => (
              <button
                key={mod.moduleNumber}
                onClick={() => setActiveModuleNumber(mod.moduleNumber)}
                aria-pressed={activeModuleNumber === mod.moduleNumber}
                className={`tab-rail-item flex flex-col items-start gap-1 ${
                  activeModuleNumber === mod.moduleNumber ? 'is-active' : ''
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-80">
                  Module {mod.moduleNumber} · {mod.mappedCO}
                </span>
                <span className="font-bold text-xs sm:text-sm">{mod.name}</span>
              </button>
            ))}
          </nav>

          <div className="ruled p-5 sm:p-6 space-y-5 bg-paper">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-ink">
              <div>
                <p className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
                  Module {activeModule.moduleNumber} · {activeModule.mappedCO} · {activeModule.hours} Lecture Hours
                </p>
                <h3 className="text-xl font-black text-ink tracking-tight">{activeModule.name}</h3>
              </div>
              <span className="stamp stamp-verified animate-stamp hidden sm:inline-flex">Covered In App</span>
            </div>

            <div>
              <h4 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-deep" aria-hidden="true" />
                Key Topics &amp; Course Outcomes
              </h4>
              <ul className="space-y-2">
                {activeModule.outcomes.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2.5 p-3 ruled-sunk text-xs sm:text-sm text-ink-2">
                    <span className="w-1.5 h-1.5 bg-lime-deep mt-2 shrink-0" aria-hidden="true" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ruled-sunk p-4">
              <h4 className="text-[11px] font-mono font-semibold text-ink uppercase tracking-[0.08em] mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                Engineering Project Implementation
              </h4>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">{activeModule.implementationInApp}</p>
            </div>

            <div className="bg-ink text-paper font-mono text-xs p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Code className="w-4 h-4 text-lime shrink-0" aria-hidden="true" />
                <span className="text-ink-3">Code Reference:</span>
                <span className="font-bold break-all">{activeModule.codeReference}</span>
              </div>
              <span className="text-lime font-bold uppercase text-[10px] tracking-[0.08em] shrink-0">
                Verified &amp; Active
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Course Scheme Tab */}
      {activeTab === 'scheme' && scheme && (
        <section className="pt-6 space-y-5">
          <div className="ruled p-5 bg-paper">
            <h2 className="text-base font-extrabold text-ink mb-1">
              Curriculum Scheme Matrix: {subject.name}
            </h2>
            <p className="text-xs text-ink-2 max-w-2xl leading-relaxed">
              Official university credit distribution and assigned contact hours for {subject.courseCode}.
            </p>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 border border-rule divide-x divide-y divide-rule sm:divide-y-0 bg-paper">
            <div className="p-4">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Credits</dt>
              <dd className="text-2xl font-black text-ink mt-1 font-mono">{scheme.credits} cr</dd>
              <dd className="text-[11px] text-lime-text font-semibold mt-0.5">{scheme.category}</dd>
            </div>
            <div className="p-4">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Classroom Lectures (CL)</dt>
              <dd className="text-2xl font-black text-ink mt-1 font-mono">{scheme.cl} hrs/wk</dd>
              <dd className="text-[11px] text-ink-3 mt-0.5">Theory teaching</dd>
            </div>
            <div className="p-4">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Lab Work (LL)</dt>
              <dd className="text-2xl font-black text-ink mt-1 font-mono">{scheme.ll} hrs/wk</dd>
              <dd className="text-[11px] text-ink-3 mt-0.5">Practical sessions</dd>
            </div>
            <div className="p-4">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Nominal Hours (NH)</dt>
              <dd className="text-2xl font-black text-ink mt-1 font-mono">{scheme.nh} hrs</dd>
              <dd className="text-[11px] text-ink-3 mt-0.5">Semester workload</dd>
            </div>
          </dl>

          <p className="text-xs text-ink-3 font-mono">
            Full department course matrix can also be reviewed in{' '}
            <button onClick={() => onOpenSheet('scheme')} className="text-ink underline font-bold">
              Scheme &amp; Credits Drawer
            </button>
            .
          </p>
        </section>
      )}
    </div>
  );
};