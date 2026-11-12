import React, { Component, useMemo, useState } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ResourceProvider, useResources } from './context/ResourceContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ResourceCard } from './components/ResourceCard';
import { UploadModal } from './components/UploadModal';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { JsSandboxModal } from './components/JsSandboxModal';
import { SyllabusVivaModal } from './components/SyllabusVivaModal';
import { CurriculumSchemeModal } from './components/CurriculumSchemeModal';
import type { StudyResource, ResourceType } from './types';
import { Search, X, FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!CONVEX_URL) {
  console.error('VITE_CONVEX_URL is not set — the library cannot reach the backend.');
}
const convexClient = new ConvexReactClient(CONVEX_URL ?? 'https://missing.convex.cloud');

type SortKey = 'featured' | 'downloads' | 'rating' | 'newest' | 'title';

const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed bottom-6 right-6 z-50 animate-toast bg-ink text-paper text-xs sm:text-sm font-semibold pl-4 pr-5 py-3.5 flex items-center gap-3 shadow-overlay max-w-[calc(100vw-3rem)]"
  >
    <span className="w-1 self-stretch bg-lime shrink-0" aria-hidden="true" />
    <CheckCircle2 className="w-4 h-4 text-lime shrink-0" aria-hidden="true" />
    <span>{message}</span>
  </div>
);

/** Last-resort boundary so a Convex hiccup shows a ruled panel, not a blank page. */
class LibraryErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col justify-between bg-paper text-ink">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1 pt-24">
            <div className="ruled p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-ink-3 mx-auto" aria-hidden="true" />
              <h2 className="text-base font-bold text-ink">The course file could not be opened</h2>
              <p className="text-xs text-ink-2 max-w-md mx-auto">
                StudySyncPlus could not reach its backend. Check your connection and reload the page.
              </p>
              <button onClick={() => window.location.reload()} className="btn btn-secondary mt-2">
                Reload
              </button>
            </div>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainContent: React.FC = () => {
  const {
    activeTab,
    semester,
    subjects,
    filteredResources,
    isLibraryLoading,
    searchQuery,
    setSearchQuery,
    selectedSubject,
    setSelectedSubject,
    selectedType,
    setSelectedType,
    resources,
    toastMessage
  } = useResources();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<StudyResource | null>(null);
  const [editingResource, setEditingResource] = useState<StudyResource | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('featured');

  const resultCount = filteredResources.length;
  const semesterLabel = semester?.label ?? 'Semester III';
  const schemeLabel = semester?.schemeLabel ?? '22+2* credits · 2022 scheme';

  const subjectRail = useMemo(() => ['All', ...subjects.map((s) => s.name)], [subjects]);

  const sortedResources = useMemo(() => {
    const list = [...filteredResources];
    switch (sortBy) {
      case 'downloads':
        list.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
        break;
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }
    return list;
  }, [filteredResources, sortBy]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-paper text-ink">
      {toastMessage && <Toast message={toastMessage} />}

      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1 pt-10 sm:pt-14">
        {/* TAB 1: RESOURCE LIBRARY */}
        {activeTab === 'library' && (
          <div>
            {/* Editorial hero: headline, one line of support, one ruled facts row */}
            <section aria-label="Library introduction">
              <h1 className="font-display text-4xl sm:text-6xl font-black text-ink leading-[1.04]">
                The {semesterLabel}{' '}
                <span className="bg-lime text-ink px-2 box-decoration-clone">course file.</span>
              </h1>

              <p className="text-ink-2 text-sm sm:text-base mt-5 leading-relaxed max-w-[58ch]">
                Verified lecture notes, past papers, and lab manuals for every SAKEC course in{' '}
                {semesterLabel.toLowerCase()} — each stamped with its official code.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-y-2.5 text-xs">
                <span className="font-semibold text-ink sm:pr-6">{schemeLabel}</span>
                <span className="text-ink-2 sm:border-l sm:border-rule sm:pl-6 sm:pr-6">SAKEC · Computer Engineering</span>
                <span className="text-ink-2 sm:border-l sm:border-rule sm:pl-6 sm:pr-6">
                  <span className="font-mono font-bold text-ink tabular">{resources.length}</span>{' '}
                  files catalogued
                </span>
                <span className="sm:border-l sm:border-rule sm:pl-6">
                  <span className="stamp stamp-verified animate-stamp">Verified</span>
                </span>
              </div>
            </section>

            {/* One coherent discovery band: subject index rail + search/filter/sort toolbar */}
            <section aria-label="Search and filter the library" className="mt-12 sm:mt-14">
              <div className="ruled">
                {/* Subject index rail — highlighter on the index, horizontally scrollable */}
                <div className="flex overflow-x-auto no-scrollbar">
                  {subjectRail.map((subject) => {
                    const isSelected = selectedSubject === subject;
                    return (
                      <button
                        key={subject}
                        onClick={() => setSelectedSubject(subject)}
                        aria-pressed={isSelected}
                        className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'bg-lime text-ink'
                            : 'text-ink-2 hover:text-ink hover:bg-sunk'
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>

                {/* Toolbar: search, type, sort, fixed constraints, live count */}
                <div className="border-t border-rule px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
                    <Search
                      className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      placeholder="Search topic, course code, or uploader…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search resources"
                      className="field w-full pl-10 pr-10 py-2.5 text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as ResourceType | 'All')}
                    aria-label="Filter by resource type"
                    className="field px-3 py-2.5 text-xs font-medium"
                  >
                    <option value="All">All Resource Types</option>
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Past Exam Papers">Past Exam Papers (PYQs)</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Cheat Sheet">Cheat Sheet</option>
                    <option value="Reference Book">Reference Book</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    aria-label="Sort resources"
                    className="field px-3 py-2.5 text-xs font-medium"
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="downloads">Most downloaded</option>
                    <option value="rating">Highest rated</option>
                    <option value="newest">Newest first</option>
                    <option value="title">Title A–Z</option>
                  </select>

                  <span className="stamp stamp-outline hidden md:inline-flex">
                    {semester ? `Sem ${semester.number} · PDF only` : 'PDF only'}
                  </span>

                  <p className="ml-auto text-xs text-ink-3 tabular" key={resultCount}>
                    <span className="font-mono font-bold text-ink animate-flash inline-block px-1">
                      {resultCount}
                    </span>{' '}
                    of {resources.length} study items
                  </p>
                </div>
              </div>
            </section>

            {/* Resources grid */}
            <section aria-label="Study resources" className="mt-8">
              {isLibraryLoading ? (
                <div className="ruled p-12 text-center space-y-2">
                  <p className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em]">
                    Opening the course file
                  </p>
                  <p className="text-xs text-ink-2">Cataloguing the {semesterLabel.toLowerCase()} library…</p>
                </div>
              ) : resultCount === 0 ? (
                <div className="ruled p-12 text-center space-y-3">
                  <FolderOpen className="w-10 h-10 text-ink-3 mx-auto" aria-hidden="true" />
                  <h3 className="text-base font-bold text-ink">No resources match the current search and filters</h3>
                  <p className="text-xs text-ink-2 max-w-md mx-auto">
                    Try a different course code, or clear the filters to see the full file — or
                    upload the notes yourself.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSubject('All');
                      setSelectedType('All');
                    }}
                    className="btn btn-secondary mt-2"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                  {sortedResources.map((res) => (
                    <ResourceCard
                      key={res.id}
                      resource={res}
                      onSelect={(r) => setSelectedResource(r)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: OFFICIAL SEMESTER 3 CURRICULUM SCHEME */}
        {activeTab === 'curriculum-scheme' && <CurriculumSchemeModal />}

        {/* TAB 3: VISUAL ANALYTICS (Chart.js) */}
        {activeTab === 'analytics' && <AnalyticsCharts />}

        {/* TAB 4: ASYNC & JS LAB (Fetch API, Promises, Storage, Error Handling) */}
        {activeTab === 'async-lab' && <JsSandboxModal />}

        {/* TAB 5: SYLLABUS & VIVA INSPECTOR (CO1-CO6 Mapping) */}
        {activeTab === 'syllabus-viva' && <SyllabusVivaModal />}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setEditingResource(null);
        }}
        editing={editingResource}
      />

      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        onSelectResource={(r) => setSelectedResource(r)}
      />

      <ResourceDetailModal
        resource={selectedResource}
        onClose={() => setSelectedResource(null)}
        onEdit={(r) => {
          setSelectedResource(null);
          setEditingResource(r);
          setIsUploadOpen(true);
        }}
      />

      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ConvexProvider client={convexClient}>
      <LibraryErrorBoundary>
        <ResourceProvider>
          <MainContent />
        </ResourceProvider>
      </LibraryErrorBoundary>
    </ConvexProvider>
  );
};

export default App;
