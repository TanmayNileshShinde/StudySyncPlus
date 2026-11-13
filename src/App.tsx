import React, { Component, useState } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ResourceProvider, useResources } from './context/ResourceContext';
import { TopBar, BottomNav } from './components/TopBar';
import { SubjectRail } from './components/SubjectRail';
import { SubjectsHome } from './components/SubjectsHome';
import { SubjectPage } from './components/SubjectPage';
import { AssistantPanel } from './components/AssistantPanel';
import { BulkUploadModal } from './components/BulkUploadModal';
import { ResourceEditModal } from './components/ResourceEditModal';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { MoreSheet } from './components/MoreSheet';
import { CurriculumSchemeModal } from './components/CurriculumSchemeModal';
import { SyllabusVivaModal } from './components/SyllabusVivaModal';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { JsSandboxModal } from './components/JsSandboxModal';
import { Footer } from './components/Footer';
import type { MoreSheetKind, StudyResource } from './types';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

const SHEET_META: Record<MoreSheetKind, { title: string; subtitle: string }> = {
  scheme: {
    title: 'Scheme & credits',
    subtitle: 'The official department course structure for the semester'
  },
  syllabus: {
    title: 'Syllabus & viva map',
    subtitle: 'Course outcomes and modules mapped to the product code'
  },
  analytics: {
    title: 'Usage analytics',
    subtitle: 'How the shelf is being used across subjects'
  },
  'async-lab': {
    title: 'Async & JS lab',
    subtitle: 'Live promise-chaining and error-handling experiments'
  }
};

/** Toast pill — the single global notice. */
const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-[60] animate-toast"
    >
      <div className="bg-ink text-paper pl-3 pr-5 py-2.5 flex items-center gap-2.5 shadow-overlay max-w-[92vw]">
        <span className="w-1.5 self-stretch bg-lime shrink-0" aria-hidden="true" />
        <span className="text-[13px] font-medium leading-snug">{message}</span>
      </div>
    </div>
  );
};

/** The subject-centric shell: top bar + (rail | main) + bottom bar + overlays. */
function Shell() {
  const { view, toastMessage, uploadSubjectId, closeUploadModal, detailResource, closeDetail, openSubject } =
    useResources();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [sheet, setSheet] = useState<MoreSheetKind | null>(null);

  const openSheetResource = (resource: StudyResource) => {
    setSheet(null);
    closeDetail();
    openSubject(resource.subjectId);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <TopBar onOpenBookmarks={() => setBookmarksOpen(true)} onOpenSheet={setSheet} />

      <div className="flex">
        {view.kind === 'subject' && (
          <SubjectRail activeSubjectId={view.subjectId} onOpenSheet={setSheet} />
        )}

        <main className="flex-1 min-w-0">
          {view.kind === 'home' && (
            <>
              <SubjectsHome />
              <Footer />
            </>
          )}
          {view.kind === 'subject' && <SubjectPage subjectId={view.subjectId} onOpenSheet={setSheet} />}
          {view.kind === 'assistant' && <AssistantPanel />}
        </main>
      </div>

      <BottomNav onOpenBookmarks={() => setBookmarksOpen(true)} onOpenSheet={setSheet} />

      {/* Overlays */}
      <BulkUploadModal isOpen={uploadSubjectId !== null} onClose={closeUploadModal} subjectId={uploadSubjectId} />
      <ResourceEditModal />
      <ResourceDetailModal resource={detailResource} onClose={closeDetail} />
      <BookmarksDrawer
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        onSelectResource={openSheetResource}
      />

      {sheet && (
        <MoreSheet title={SHEET_META[sheet].title} subtitle={SHEET_META[sheet].subtitle} onClose={() => setSheet(null)}>
          {sheet === 'scheme' && <CurriculumSchemeModal onOpenSubject={(id) => { setSheet(null); openSubject(id); }} />}
          {sheet === 'syllabus' && <SyllabusVivaModal />}
          {sheet === 'analytics' && <AnalyticsCharts />}
          {sheet === 'async-lab' && <JsSandboxModal />}
        </MoreSheet>
      )}

      <Toast message={toastMessage} />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6">
          <div className="ruled p-8 max-w-md text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-alert mb-2">Course file error</p>
            <p className="text-sm text-ink-2 mb-4">
              Something went wrong while rendering the shelf. Reloading usually restores it.
            </p>
            <button onClick={() => window.location.reload()} className="btn btn-secondary">
              Reload StudySyncPlus
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ConvexProvider client={new ConvexReactClient(CONVEX_URL)}>
        <ResourceProvider>
          <Shell />
        </ResourceProvider>
      </ConvexProvider>
    </ErrorBoundary>
  );
}
