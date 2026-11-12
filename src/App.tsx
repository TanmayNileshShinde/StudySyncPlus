import React, { useState } from 'react';
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
import { StudyResource, SubjectCategory, ResourceType, Semester } from './types';
import {
  Search,
  Filter,
  Sparkles,
  BookOpen,
  FolderOpen,
  ArrowRight,
  GraduationCap,
  X
} from 'lucide-react';

const SUBJECT_LIST: (SubjectCategory | 'All')[] = [
  'All',
  'Web Technology II',
  'Operating System',
  'Data Structures',
  'Discrete Structures',
  'Microprocessor',
  'Foundation of Embedded System',
  'OOP with Java',
  'Engineering Career Navigation'
];

const MainContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    filteredResources,
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

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 clay-box px-5 py-3.5 bg-slate-900 text-white text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
      />

      {/* Primary View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1 pt-6 sm:pt-8">
        
        {/* TAB 1: RESOURCE LIBRARY */}
        {activeTab === 'library' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero Banner with Claymorphism */}
            <div className="clay-box p-6 sm:p-10 bg-gradient-to-br from-white via-indigo-50/20 to-white relative overflow-hidden">
              <div className="relative z-10 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Shah & Anchor Kutchhi Engineering College • Semester III Hub</span>
                  </span>

                  <button
                    onClick={() => setActiveTab('curriculum-scheme')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Official 22-Credit Scheme</span>
                  </button>
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-black text-slate-800 tracking-tight leading-tight">
                  Share notes, master exams,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
                    learn together.
                  </span>
                </h1>
                
                <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
                  StudySyncPlus is tailored for SAKEC Computer Engineering students. Access verified lecture notes, solved past papers, and lab manuals mapped directly to your Semester III course codes.
                </p>

                {/* Search Bar (AJAX dynamic filter) */}
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:max-w-lg">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by topic, course code (e.g. CMLOR2VS201, WebTech, Tanmay)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-10 py-3.5 clay-input text-xs sm:text-sm text-slate-800"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="w-full sm:w-auto clay-button-primary px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Upload Notes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Decorative Subtle Badges in Banner */}
              <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none hidden lg:block">
                <BookOpen className="w-72 h-72 text-indigo-700" />
              </div>
            </div>

            {/* Filter Section */}
            <div className="space-y-4">
              {/* Subject Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
                {SUBJECT_LIST.map((subject) => {
                  const isSelected = selectedSubject === subject;
                  return (
                    <button
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isSelected
                          ? 'clay-pill-active'
                          : 'clay-button text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>

              {/* Secondary Filters Bar */}
              <div className="clay-box p-4 bg-white/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-slate-700">Filter By:</span>
                  </div>

                  {/* Semester Badge (Fixed strictly to Sem 3) */}
                  <div className="clay-badge px-3 py-1 bg-white text-indigo-700 font-bold rounded-lg border border-indigo-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Semester 3 Only</span>
                  </div>

                  {/* Format Badge (Fixed strictly to PDF) */}
                  <div className="clay-badge px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200">
                    PDF Only
                  </div>

                  {/* Resource Type Dropdown */}
                  <select
                    value={selectedType}
                    onChange={(e) =>
                      setSelectedType(e.target.value as ResourceType | 'All')
                    }
                    className="clay-input px-3 py-1.5 text-slate-700 text-xs font-medium"
                  >
                    <option value="All">All Resource Types</option>
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Past Exam Papers">Past Exam Papers (PYQs)</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Cheat Sheet">Cheat Sheet</option>
                    <option value="Reference Book">Reference Book</option>
                  </select>
                </div>

                <div className="text-slate-500 font-medium">
                  Showing <strong>{filteredResources.length}</strong> of {resources.length} study items
                </div>
              </div>
            </div>

            {/* Resources Grid */}
            {filteredResources.length === 0 ? (
              <div className="clay-box p-12 bg-white text-center space-y-3">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-700">No matching study resources found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try clearing your search query or subject filters, or be the first student to upload notes for this course!
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubject('All');
                    setSelectedType('All');
                  }}
                  className="clay-button px-4 py-2 text-xs font-bold text-indigo-600 rounded-xl mt-2"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredResources.map((res) => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    onSelect={(r) => setSelectedResource(r)}
                  />
                ))}
              </div>
            )}
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

      {/* Modals & Overlays */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      
      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        onSelectResource={(r) => setSelectedResource(r)}
      />

      <ResourceDetailModal
        resource={selectedResource}
        onClose={() => setSelectedResource(null)}
      />

      {/* Application Footer */}
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ResourceProvider>
      <MainContent />
    </ResourceProvider>
  );
};

export default App;
