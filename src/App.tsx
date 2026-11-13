import React, { Component, useState, useMemo, useCallback } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ResourceProvider, useResources } from './context/ResourceContext';
import { TopBar, BottomNav } from './components/TopBar';
import { SubjectRail } from './components/SubjectRail';
import { SubjectsHome } from './components/SubjectsHome';
import { SubjectPage } from './components/SubjectPage';
import { StudyWorkspace } from './components/StudyWorkspace/StudyWorkspace';
import { SavedView } from './components/SavedView';
import { NotFoundView } from './components/NotFoundView';
import { BulkUploadModal } from './components/BulkUploadModal';
import { ResourceEditModal } from './components/ResourceEditModal';
import { MoreSheet } from './components/MoreSheet';
import { CurriculumSchemeModal } from './components/CurriculumSchemeModal';
import { SyllabusVivaModal } from './components/SyllabusVivaModal';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { JsSandboxModal } from './components/JsSandboxModal';
import { Footer } from './components/Footer';
import type { MoreSheetKind } from './types';

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
  const {
    view,
    toastMessage,
    uploadSubjectId,
    uploadFolderId,
    closeUploadModal,
    openSubject
  } = useResources();

  const location = useLocation();
  const navigate = useNavigate();

  // URL-backed secondary sheets: /syllabus, /scheme, /analytics, /async-lab
  const sheetFromPath = useMemo<MoreSheetKind | null>(() => {
    const p = location.pathname.replace(/\/+$/, '');
    if (p === '/syllabus') return 'syllabus';
    if (p === '/scheme') return 'scheme';
    if (p === '/analytics') return 'analytics';
    if (p === '/async-lab') return 'async-lab';
    return null;
  }, [location.pathname]);

  const [sheetOverride, setSheetOverride] = useState<MoreSheetKind | null>(null);
  const sheet = sheetOverride ?? sheetFromPath;

  const handleOpenSheet = useCallback(
    (kind: MoreSheetKind) => {
      navigate(`/${kind}`);
    },
    [navigate]
  );

  const handleCloseSheet = useCallback(() => {
    setSheetOverride(null);
    if (sheetFromPath) {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  }, [navigate, sheetFromPath]);

  const handleOpenBookmarks = useCallback(() => {
    navigate('/saved');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <TopBar onOpenBookmarks={handleOpenBookmarks} onOpenSheet={handleOpenSheet} />

      <div className="flex flex-1 min-h-0">
        {view.kind === 'subject' && (
          <SubjectRail activeSubjectId={view.subjectId} onOpenSheet={handleOpenSheet} />
        )}

        <main className="flex-1 min-w-0 flex flex-col">
          {view.kind === 'home' && (
            <>
              <SubjectsHome />
              <Footer />
            </>
          )}
          {view.kind === 'subject' && (
            <SubjectPage subjectId={view.subjectId} onOpenSheet={handleOpenSheet} />
          )}
          {view.kind === 'study' && (
            <StudyWorkspace documentId={view.documentId} initialPage={view.page} />
          )}
          {view.kind === 'saved' && (
            <SavedView />
          )}
          {view.kind === 'not-found' && (
            <NotFoundView />
          )}
        </main>
      </div>

      {view.kind !== 'study' && (
        <BottomNav onOpenBookmarks={handleOpenBookmarks} onOpenSheet={handleOpenSheet} />
      )}

      {/* Overlays */}
      <BulkUploadModal isOpen={uploadSubjectId !== null} onClose={closeUploadModal} subjectId={uploadSubjectId} folderId={uploadFolderId} />
      <ResourceEditModal />

      {sheet && (
        <MoreSheet title={SHEET_META[sheet].title} subtitle={SHEET_META[sheet].subtitle} onClose={handleCloseSheet}>
          {sheet === 'scheme' && <CurriculumSchemeModal onOpenSubject={(id) => { handleCloseSheet(); openSubject(id); }} />}
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
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ResourceProvider>
            <Shell />
          </ResourceProvider>
        </BrowserRouter>
      </ConvexProvider>
    </ErrorBoundary>
  );
}
