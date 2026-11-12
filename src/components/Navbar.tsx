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

  return (
    <header className="sticky top-0 z-40 bg-[#eef2f7]/90 backdrop-blur-md border-b border-white/60 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Brand & Team Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-clay-colored">
              <BookOpen className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-800">StudySync</span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                  Sem-3 Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Course Project by <strong className="text-slate-700">Tanmay Shinde (67)</strong> & <strong className="text-slate-700">Aditya Shah (68)</strong>
              </p>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenBookmarks}
              className="p-2.5 clay-button text-slate-700 rounded-xl flex items-center gap-1 text-xs"
              title="Saved Resources"
            >
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span>{userProfile.savedResourceIds.length}</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="clay-button-primary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Single Page Application SPA Switching) */}
        <nav className="flex items-center justify-start overflow-x-auto py-1 space-x-1 sm:space-x-2 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'clay-pill-active'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <button
            onClick={onOpenBookmarks}
            className="clay-button px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 hover:text-amber-600"
            title="View saved bookmarks"
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Saved ({userProfile.savedResourceIds.length})</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="clay-button-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Upload Resource</span>
          </button>

          <button
            onClick={resetToDefaults}
            className="p-2 clay-button rounded-xl text-slate-500 hover:text-slate-800"
            title="Reset to initial syllabus demo data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
