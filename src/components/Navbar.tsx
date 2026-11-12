import React from 'react';
import { useResources } from '../context/ResourceContext';
import { BookOpen, BarChart3, Terminal, Award, PlusCircle, RefreshCw, Bookmark, TableProperties } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenBookmarks: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload, onOpenBookmarks }) => {
  const { activeTab, setActiveTab, userProfile, resetToDefaults } = useResources();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'library', label: 'Resource Library', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'curriculum-scheme', label: 'Sem 3 Scheme', icon: <TableProperties className="w-4 h-4" /> },
    { id: 'analytics', label: 'Visual Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'async-lab', label: 'Async & JS Lab', icon: <Terminal className="w-4 h-4" /> },
    { id: 'syllabus-viva', label: 'Syllabus & Viva', icon: <Award className="w-4 h-4" /> }
  ];

  const savedCount = userProfile.savedResourceIds.length;

  return (
    <header className="sticky top-0 z-40 bg-paper border-b border-rule">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top row: brand + actions */}
        <div className="flex items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* File mark: ink square, lime index bar */}
            <div className="w-10 h-10 bg-ink flex items-center justify-center shrink-0" aria-hidden="true">
              <div className="w-5 h-1.5 bg-lime" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-ink leading-none whitespace-nowrap">
                StudySyncPlus
              </span>
              <p className="text-[11px] text-ink-3 font-medium truncate mt-0.5">
                SAKEC · Semester III Course File
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenBookmarks}
              className="btn btn-ghost hidden md:inline-flex"
              title="View saved bookmarks"
              aria-label={`Saved resources: ${savedCount}`}
            >
              <Bookmark className="w-4 h-4" aria-hidden="true" />
              <span>Saved</span>
              <span className="font-mono text-[11px] tabular px-1.5 py-0.5 bg-sunk border border-rule">{savedCount}</span>
            </button>

            <button
              onClick={onOpenBookmarks}
              className="btn btn-secondary md:hidden"
              title="View saved bookmarks"
              aria-label={`Saved resources: ${savedCount}`}
            >
              <Bookmark className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono text-[11px] tabular">{savedCount}</span>
            </button>

            <button onClick={onOpenUpload} className="btn btn-primary">
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Upload Resource</span>
              <span className="sm:hidden">Upload</span>
            </button>

            <button
              onClick={resetToDefaults}
              className="btn btn-ghost px-2"
              title="Reset to initial syllabus demo data"
              aria-label="Reset to initial syllabus demo data"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tab rail */}
        <nav className="tab-rail no-scrollbar mt-3" aria-label="Sections">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`tab-rail-item ${isActive ? 'is-active' : ''}`}
              >
                <span className="inline-flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
