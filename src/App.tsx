import React, { Component, useState, useMemo, useCallback } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ResourceProvider } from './context/ResourceProvider';
import { useResources } from './context/ResourceContext';
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
import { Footer } from './components/Footer';
import type { MoreSheetKind } from './types';

const CurriculumSchemeModal = React.lazy(() =>
  import('./components/CurriculumSchemeModal').then((m) => ({ default: m.CurriculumSchemeModal }))
);
const SyllabusVivaModal = React.lazy(() =>
  import('./components/SyllabusVivaModal').then((m) => ({ default: m.SyllabusVivaModal }))
);
const AnalyticsCharts = React.lazy(() =>
  import('./components/AnalyticsCharts').then((m) => ({ default: m.AnalyticsCharts }))
);
const JsSandboxModal = React.lazy(() =>
  import('./components/JsSandboxModal').then((m) => ({ default: m.JsSandboxModal }))
);
const TimetableModal = React.lazy(() =>
  import('./components/TimetableModal').then((m) => ({ default: m.TimetableModal }))
);

const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string) ||
  'https://wry-crane-347.convex.cloud';

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
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [timetableTab, setTimetableTab] = useState<'timetable' | 'exams'>('timetable');
  const sheet = sheetOverride ?? sheetFromPath;

  const handleOpenTimetable = useCallback((tab: 'timetable' | 'exams' = 'timetable') => {
    setTimetableTab(tab);
    setIsTimetableOpen(true);
  }, []);

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

  const handleOpenSubjectFromSheet = useCallback(
    (subjectId: string) => {
      setSheetOverride(null);
      openSubject(subjectId);
    },
    [openSubject]
  );

  const handleOpenBookmarks = useCallback(() => {
    navigate('/saved');
  }, [navigate]);

  return (
    <div
      className={`bg-notebook text-ink flex flex-col font-sans ${
        view.kind === 'study' ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      <TopBar
        onOpenBookmarks={handleOpenBookmarks}
        onOpenSheet={handleOpenSheet}
        onOpenTimetable={() => handleOpenTimetable('timetable')}
      />

      <div className={`flex flex-1 min-h-0 ${view.kind === 'study' ? 'overflow-hidden' : ''}`}>
        {view.kind === 'subject' && (
          <SubjectRail activeSubjectId={view.subjectId} onOpenSheet={handleOpenSheet} />
        )}

        <main className={`flex-1 min-w-0 flex flex-col ${view.kind === 'study' ? 'h-full overflow-hidden' : ''}`}>
          {view.kind === 'home' && (
            <>
              <SubjectsHome
                onOpenTimetable={handleOpenTimetable}
                onOpenSheet={handleOpenSheet}
              />
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
        <BottomNav
          onOpenBookmarks={handleOpenBookmarks}
          onOpenSheet={handleOpenSheet}
          onOpenTimetable={() => handleOpenTimetable('timetable')}
        />
      )}

      {/* Overlays */}
      <BulkUploadModal isOpen={uploadSubjectId !== null} onClose={closeUploadModal} subjectId={uploadSubjectId} folderId={uploadFolderId} />
      <ResourceEditModal />
      <React.Suspense fallback={null}>
        <TimetableModal isOpen={isTimetableOpen} onClose={() => setIsTimetableOpen(false)} initialTab={timetableTab} />
      </React.Suspense>

      {sheet && (
        <MoreSheet title={SHEET_META[sheet].title} subtitle={SHEET_META[sheet].subtitle} onClose={handleCloseSheet}>
          <React.Suspense fallback={<div className="p-8 text-center font-mono text-xs text-ink-3">Loading…</div>}>
            {sheet === 'scheme' && <CurriculumSchemeModal onOpenSubject={handleOpenSubjectFromSheet} />}
            {sheet === 'syllabus' && <SyllabusVivaModal />}
            {sheet === 'analytics' && <AnalyticsCharts />}
            {sheet === 'async-lab' && <JsSandboxModal />}
          </React.Suspense>
        </MoreSheet>
      )}

      <Toast message={toastMessage} />
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('StudySyncPlus ErrorBoundary caught render error:', error, errorInfo);
  }

  handleResetHome = () => {
    this.setState({ hasError: false, error: null });
    const base = import.meta.env.BASE_URL || '/';
    window.location.href = base;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-sans">
          <div className="bg-white border-2 border-gray-900 rounded-2xl p-8 max-w-lg text-center shadow-lg">
            <span className="inline-block px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-mono text-xs font-bold uppercase tracking-wider mb-3">
              Course File System Notice
            </span>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Something went wrong while rendering the shelf
            </h2>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              {this.state.error?.message || 'A temporary render or query error occurred. Returning to the main course catalog or reloading usually restores it.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Reload StudySyncPlus
              </button>
              <button 
                onClick={this.handleResetHome} 
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Return to Course Home
              </button>
            </div>
            {this.state.error?.stack && (
              <details className="mt-5 text-left border-t border-gray-100 pt-3">
                <summary className="text-[10px] text-gray-400 cursor-pointer font-mono hover:text-gray-600">
                  Diagnostics / Stack Trace
                </summary>
                <pre className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-[9px] text-gray-700 font-mono overflow-x-auto max-h-36 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convexClient = new ConvexReactClient(CONVEX_URL);

export default function App() {
  return (
    <ErrorBoundary>
      <ConvexProvider client={convexClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ResourceProvider>
            <Shell />
          </ResourceProvider>
        </BrowserRouter>
      </ConvexProvider>
    </ErrorBoundary>
  );
}
