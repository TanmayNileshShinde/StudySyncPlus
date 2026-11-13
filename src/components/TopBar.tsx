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
  ArrowLeft
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
      className={`absolute z-50 min-w-[240px] bg-paper border border-ink shadow-overlay animate-stamp ${className ?? ''}`}
      role="menu"
    >
      {children}
    </div>
  );
};

interface TopBarProps {
  onOpenBookmarks: () => void;
  onOpenSheet: (kind: MoreSheetKind) => void;
}

/** Global top bar: identity + primary actions. Subject switching lives in the rail. */
export const TopBar: React.FC<TopBarProps> = ({ onOpenBookmarks, onOpenSheet }) => {
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
    <header className="sticky top-0 z-40 bg-paper border-b border-ink">
      <div className="max-w-[1400px] mx-auto pl-4 pr-2 sm:pl-6 sm:pr-3 h-14 flex items-center justify-between gap-3">
        {/* Left: Identity or Back Button when in Study Mode */}
        {view.kind === 'study' ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-ink bg-paper hover:bg-lime text-ink text-xs font-mono font-semibold transition-colors shrink-0"
              title="Return to course catalog"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back</span>
            </button>
            {activeStudyDoc && (
              <div className="hidden sm:flex items-center gap-2 min-w-0">
                <span className="stamp stamp-ink font-mono shrink-0">{activeStudyDoc.courseCode}</span>
                <span className="font-bold text-xs truncate text-ink max-w-[240px] lg:max-w-md">
                  {activeStudyDoc.title}
                </span>
                <span className="stamp stamp-outline font-mono shrink-0">{activeStudyDoc.fileFormat}</span>
              </div>
            )}
          </div>
        ) : (
          <button onClick={openHome} className="flex items-center gap-3 min-w-0 text-left group" aria-label="Go to subjects home">
            <span className="w-9 h-9 bg-ink flex items-center justify-center shrink-0" aria-hidden="true">
              <span className="w-[18px] h-1.5 bg-lime block" />
            </span>
            <span className="min-w-0">
              <span className="font-extrabold text-[17px] tracking-tight text-ink leading-none whitespace-nowrap">
                StudySyncPlus
              </span>
              <span className="text-[10.5px] text-ink-3 font-medium truncate block mt-0.5 font-mono">
                {semester ? semester.label.toUpperCase() : 'SAKEC'} · COURSE FILE
              </span>
            </span>
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {view.kind !== 'study' && (
            <>
              <button onClick={askAi} className="btn btn-secondary" title="Ask the Study Assistant">
                <Sparkles className="w-4 h-4 text-lime-deep" aria-hidden="true" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>

              <button onClick={addMaterials} className="btn btn-primary" title="Add materials to a subject">
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Add materials</span>
                <span className="sm:hidden">Add</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenBookmarks}
            className="btn btn-ghost px-2 hidden sm:inline-flex"
            title="Saved for revision"
            aria-label={`Saved resources: ${bookmarkCount}`}
          >
            <span className="relative">
              <Bookmark className="w-4 h-4" aria-hidden="true" />
              {bookmarkCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-ink text-paper font-mono text-[9px] leading-[15px] text-center tabular"
                  aria-hidden="true"
                >
                  {bookmarkCount}
                </span>
              )}
            </span>
            <span className="hidden lg:inline text-[13px]">Saved</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="btn btn-ghost px-2"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-label="More features"
            >
              <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            <MorePopover open={moreOpen} onClose={() => setMoreOpen(false)} className="right-0 top-[calc(100%+6px)]">
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
}

/** Mobile-only bottom navigation: the four primary destinations + overflow. */
export const BottomNav: React.FC<BottomNavProps> = ({ onOpenBookmarks, onOpenSheet }) => {
  const { view, openHome, openAssistant, openUploadModal, bookmarkCount } = useResources();
  const [moreOpen, setMoreOpen] = useState(false);

  const askAi = () =>
    openAssistant(view.kind === 'subject' ? { mode: 'subject', subjectId: view.subjectId } : { mode: 'semester' });

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-semibold font-mono uppercase tracking-[0.06em] transition-colors ${
      active ? 'text-ink' : 'text-ink-3'
    }`;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-paper border-t border-ink h-16 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="relative h-16 flex items-stretch">
        <button onClick={openHome} className={itemClass(view.kind === 'home')} aria-current={view.kind === 'home' ? 'page' : undefined}>
          <Library className={`w-5 h-5 ${view.kind === 'home' ? 'text-ink' : ''}`} aria-hidden="true" />
          <span>Home</span>
        </button>

        <button onClick={askAi} className={itemClass(view.kind === 'study')} aria-current={view.kind === 'study' ? 'page' : undefined}>
          <Sparkles className={`w-5 h-5 ${view.kind === 'study' ? 'text-lime-deep' : ''}`} aria-hidden="true" />
          <span>Ask AI</span>
        </button>

        <button
          onClick={() => openUploadModal(view.kind === 'subject' ? view.subjectId : undefined)}
          className="flex items-center justify-center px-2"
          aria-label="Add materials"
        >
          <span className="w-11 h-11 -mt-5 bg-lime text-ink border border-ink flex items-center justify-center shadow-overlay">
            <PlusCircle className="w-5 h-5" aria-hidden="true" />
          </span>
        </button>

        <button onClick={onOpenBookmarks} className={itemClass(view.kind === 'saved')} aria-current={view.kind === 'saved' ? 'page' : undefined} aria-label={`Saved resources: ${bookmarkCount}`}>
          <span className="relative">
            <Bookmark className="w-5 h-5" aria-hidden="true" />
            {bookmarkCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-ink text-paper font-mono text-[9px] leading-[15px] text-center tabular" aria-hidden="true">
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
