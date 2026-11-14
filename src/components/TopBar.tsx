import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import type { MoreSheetKind } from '../types';
import {
  Sparkles,
  PlusCircle,
  Bookmark,
  MoreHorizontal,
  BarChart3,
  Terminal,
  TableProperties,
  Award,
  RefreshCw,
  Library,
  ArrowLeft,
  Calendar
} from 'lucide-react';

const MORE_SHEET_ITEMS: Array<{
  kind: MoreSheetKind;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    kind: 'scheme',
    label: 'Scheme & credits',
    description: 'Official course structure and hour matrix',
    icon: <TableProperties className="w-4 h-4" aria-hidden="true" />
  },
  {
    kind: 'syllabus',
    label: 'Syllabus & viva map',
    description: 'Course outcomes mapped to the project code',
    icon: <Award className="w-4 h-4" aria-hidden="true" />
  },
  {
    kind: 'analytics',
    label: 'Usage analytics',
    description: 'Downloads, ratings and engagement',
    icon: <BarChart3 className="w-4 h-4" aria-hidden="true" />
  },
  {
    kind: 'async-lab',
    label: 'Async & JS lab',
    description: 'Live promise-chaining experiments',
    icon: <Terminal className="w-4 h-4" aria-hidden="true" />
  }
];

/** Shared overflow menu body — used by the top bar and the mobile bottom bar. */
export const MoreMenuItems: React.FC<{ onOpenSheet: (kind: MoreSheetKind) => void; onDone: () => void }> = ({
  onOpenSheet,
  onDone
}) => {
  const { resetToDefaults } = useResources();

  const handleReset = () => {
    onDone();
    if (window.confirm('Reset the library to the official Semester 3 dataset? Student-uploaded files will be removed.')) {
      void resetToDefaults();
    }
  };

  return (
    <div className="py-1.5" role="menu" aria-label="More features">
      {MORE_SHEET_ITEMS.map((item) => (
        <button
          key={item.kind}
          role="menuitem"
          onClick={() => {
            onOpenSheet(item.kind);
            onDone();
          }}
          className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-paper-sunk transition-colors group"
        >
          <span className="text-ink-2 group-hover:text-ink mt-0.5 shrink-0">{item.icon}</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink leading-tight">{item.label}</span>
            <span className="block text-[11px] text-ink-3 leading-snug">{item.description}</span>
          </span>
        </button>
      ))}
      <div className="mt-1.5 border-t border-rule pt-1.5">
        <button
          role="menuitem"
          onClick={handleReset}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-paper-sunk transition-colors group"
        >
          <RefreshCw className="w-4 h-4 text-ink-3 group-hover:text-alert shrink-0" aria-hidden="true" />
          <span className="block text-[13px] font-semibold text-ink-2 group-hover:text-ink leading-tight">
            Reset demo data
          </span>
        </button>
      </div>
    </div>
  );
};

/** Anchored overflow popover shared by top bar + bottom bar. */
export const MorePopover: React.FC<{
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ open, onClose, className, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className={`absolute z-50 min-w-[240px] bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_#0f172a] animate-stamp overflow-hidden ${className ?? ''}`}
      role="menu"
    >
      {children}
    </div>
  );
};

interface TopBarProps {
  onOpenBookmarks: () => void;
  onOpenSheet: (kind: MoreSheetKind) => void;
  onOpenTimetable?: () => void;
}

/** Global top bar: identity + primary actions. Subject switching lives in the rail. */
export const TopBar: React.FC<TopBarProps> = ({ onOpenBookmarks, onOpenSheet, onOpenTimetable }) => {
  const { view, openHome, openSubject, openAssistant, openUploadModal, bookmarkCount, semester, resources } = useResources();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeStudyDoc = useMemo(() => {
    if (view.kind !== 'study') return null;
    return resources.find((r) => r.id === view.documentId) ?? null;
  }, [view, resources]);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else if (activeStudyDoc?.subjectId) {
      openSubject(activeStudyDoc.subjectId);
    } else {
      openHome();
    }
  };

  const askAi = () => {
    openAssistant(view.kind === 'subject' ? { mode: 'subject', subjectId: view.subjectId } : { mode: 'semester' });
  };

  const addMaterials = () => {
    openUploadModal(view.kind === 'subject' ? view.subjectId : undefined);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b-2 border-slate-900 shadow-xs">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Identity or Back Button when in Study Mode */}
        {view.kind === 'study' ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleBack}
              className="btn-neo bg-white hover:bg-slate-100 text-slate-900 px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
              title="Return to course catalog"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back</span>
            </button>
            {activeStudyDoc && (
              <div className="hidden sm:flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold shrink-0">
                  {activeStudyDoc.courseCode}
                </span>
                <span className="font-bold text-xs truncate text-slate-900 max-w-[240px] lg:max-w-md">
                  {activeStudyDoc.title}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-yellow-400 text-slate-900 font-mono text-[11px] font-bold border border-slate-900 shrink-0">
                  {activeStudyDoc.fileFormat}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={openHome} className="flex items-center gap-3 min-w-0 text-left group" aria-label="Go to subjects home">
              <span className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-slate-900 flex items-center justify-center font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] shrink-0 group-hover:scale-105 transition-transform" aria-hidden="true">
                <span className="font-mono text-lg font-black tracking-tighter">S+</span>
              </span>
              <span className="min-w-0">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 leading-none whitespace-nowrap block">
                  StudySyncPlus
                </span>
                <span className="text-[11px] text-slate-500 font-bold truncate block mt-0.5 font-mono">
                  {semester ? semester.label.toUpperCase() : 'SEMESTER III'} · SAKEC
                </span>
              </span>
            </button>

            {/* SYCM3 Live Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border-2 border-slate-900 font-mono text-xs font-extrabold text-slate-900 shadow-[2px_2px_0px_#0f172a]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span>SYCM3</span>
              <span className="text-[10px] text-slate-500 font-semibold">• SAKEC Live</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {view.kind !== 'study' && (
            <>
              {onOpenTimetable && (
                <button
                  onClick={onOpenTimetable}
                  className="btn-neo bg-yellow-400 hover:bg-yellow-300 text-slate-900 px-3 py-1.5 text-xs flex items-center gap-1.5 font-black"
                  title="Open Weekly Timetable"
                >
                  <Calendar className="w-4 h-4 text-slate-900 stroke-[2.5]" aria-hidden="true" />
                  <span className="hidden sm:inline">Timetable</span>
                </button>
              )}

              <button
                onClick={askAi}
                className="btn-neo bg-white hover:bg-slate-50 text-slate-900 px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold"
                title="Ask the Study Assistant"
              >
                <Sparkles className="w-4 h-4 text-amber-500 stroke-[2.5]" aria-hidden="true" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>

              <button
                onClick={addMaterials}
                className="btn-neo bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold"
                title="Add materials to a subject"
              >
                <PlusCircle className="w-4 h-4 text-yellow-400 stroke-[2.5]" aria-hidden="true" />
                <span className="hidden sm:inline">Add materials</span>
                <span className="sm:hidden">Add</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenBookmarks}
            className="btn-neo bg-white hover:bg-slate-50 text-slate-900 px-2.5 py-1.5 text-xs hidden sm:inline-flex items-center gap-1.5 font-bold"
            title="Saved for revision"
            aria-label={`Saved resources: ${bookmarkCount}`}
          >
            <span className="relative">
              <Bookmark className="w-4 h-4 text-slate-900 stroke-[2.5]" aria-hidden="true" />
              {bookmarkCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-yellow-400 text-slate-900 border border-slate-900 font-mono text-[9px] font-black leading-[13px] text-center rounded-full"
                  aria-hidden="true"
                >
                  {bookmarkCount}
                </span>
              )}
            </span>
            <span className="hidden lg:inline text-xs">Saved</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="btn-neo bg-white hover:bg-slate-50 text-slate-900 p-2 text-xs"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-label="More features"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-900 stroke-[2.5]" aria-hidden="true" />
            </button>
            <MorePopover open={moreOpen} onClose={() => setMoreOpen(false)} className="right-0 top-[calc(100%+8px)]">
              <MoreMenuItems onOpenSheet={onOpenSheet} onDone={() => setMoreOpen(false)} />
            </MorePopover>
          </div>
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  onOpenBookmarks: () => void;
  onOpenSheet: (kind: MoreSheetKind) => void;
  onOpenTimetable?: () => void;
}

/** Mobile-only bottom navigation: the four primary destinations + overflow. */
export const BottomNav: React.FC<BottomNavProps> = ({ onOpenBookmarks, onOpenSheet, onOpenTimetable }) => {
  const { view, openHome, openAssistant, openUploadModal, bookmarkCount } = useResources();
  const [moreOpen, setMoreOpen] = useState(false);

  const askAi = () =>
    openAssistant(view.kind === 'subject' ? { mode: 'subject', subjectId: view.subjectId } : { mode: 'semester' });

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-bold font-mono uppercase tracking-[0.06em] transition-colors ${
      active ? 'text-slate-900' : 'text-slate-500'
    }`;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t-2 border-slate-900 h-16 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_6px_rgba(15,23,42,0.06)]"
      aria-label="Primary"
    >
      <div className="relative h-16 flex items-stretch">
        <button onClick={openHome} className={itemClass(view.kind === 'home')} aria-current={view.kind === 'home' ? 'page' : undefined}>
          <Library className={`w-5 h-5 ${view.kind === 'home' ? 'text-slate-900 stroke-[2.5]' : ''}`} aria-hidden="true" />
          <span>Home</span>
        </button>

        {onOpenTimetable ? (
          <button onClick={onOpenTimetable} className={itemClass(false)} aria-label="Weekly Timetable">
            <Calendar className="w-5 h-5 text-slate-700" aria-hidden="true" />
            <span>Schedule</span>
          </button>
        ) : (
          <button onClick={askAi} className={itemClass(view.kind === 'study')} aria-current={view.kind === 'study' ? 'page' : undefined}>
            <Sparkles className={`w-5 h-5 ${view.kind === 'study' ? 'text-amber-500 stroke-[2.5]' : ''}`} aria-hidden="true" />
            <span>Ask AI</span>
          </button>
        )}

        <button
          onClick={() => openUploadModal(view.kind === 'subject' ? view.subjectId : undefined)}
          className="flex items-center justify-center px-2"
          aria-label="Add materials"
        >
          <span className="w-12 h-12 -mt-5 bg-yellow-400 text-slate-900 border-2 border-slate-900 rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
          </span>
        </button>

        <button onClick={onOpenBookmarks} className={itemClass(view.kind === 'saved')} aria-current={view.kind === 'saved' ? 'page' : undefined} aria-label={`Saved resources: ${bookmarkCount}`}>
          <span className="relative">
            <Bookmark className="w-5 h-5" aria-hidden="true" />
            {bookmarkCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-yellow-400 text-slate-900 border border-slate-900 font-mono text-[9px] font-black leading-[13px] text-center rounded-full" aria-hidden="true">
                {bookmarkCount}
              </span>
            )}
          </span>
          <span>Saved</span>
        </button>

        <div className="relative flex-1">
          <button onClick={() => setMoreOpen((v) => !v)} className={itemClass(false)} aria-expanded={moreOpen} aria-haspopup="menu">
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            <span>More</span>
          </button>
          <MorePopover open={moreOpen} onClose={() => setMoreOpen(false)} className="right-1 bottom-[calc(100%+8px)]">
            <MoreMenuItems onOpenSheet={onOpenSheet} onDone={() => setMoreOpen(false)} />
          </MorePopover>
        </div>
      </div>
    </nav>
  );
};
