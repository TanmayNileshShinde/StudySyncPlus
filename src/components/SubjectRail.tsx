import React from 'react';
import { useResources } from '../context/ResourceContext';
import type { MoreSheetKind } from '../types';
import { ArrowLeft, PlusCircle } from 'lucide-react';

interface SubjectRailProps {
  activeSubjectId: string;
  onOpenSheet: (kind: MoreSheetKind) => void;
}

/**
 * Desktop-only left rail for switching between subjects while inside a
 * subject workspace (the hybrid shell decision: global actions in the top
 * bar, subject switching in the rail).
 */
export const SubjectRail: React.FC<SubjectRailProps> = ({ activeSubjectId, onOpenSheet }) => {
  const { subjects, openHome, openSubject, resources } = useResources();

  const countFor = (subjectId: string) => resources.filter((r) => r.subjectId === subjectId).length;

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r-2 border-slate-900 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar shadow-xs">
      <button
        onClick={openHome}
        className="flex items-center gap-2 px-4 py-3.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-yellow-50 transition-colors border-b-2 border-slate-900 text-left shrink-0 font-mono"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
        <span>← ALL SUBJECTS</span>
      </button>

      <nav className="flex-1 py-3 px-2 space-y-1" aria-label="Subjects">
        {subjects.map((subject) => {
          const isActive = subject.id === activeSubjectId;
          return (
            <button
              key={subject.id}
              onClick={() => openSubject(subject.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all border-2 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[3px_3px_0px_#facc15]'
                  : 'bg-white text-slate-800 border-transparent hover:border-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className={`block font-mono text-[10px] uppercase font-black tracking-wider ${isActive ? 'text-yellow-400' : 'text-slate-500'}`}>
                {subject.courseCode}
              </span>
              <span className="block text-[13px] font-bold leading-snug mt-0.5 truncate">
                {subject.name}
              </span>
              <span className={`block font-mono text-[10px] mt-1 tabular font-semibold ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                {countFor(subject.id)} materials
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t-2 border-slate-900">
        <button
          onClick={() => onOpenSheet('scheme')}
          className="btn-neo w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 border-2 border-slate-900 px-3 py-2 text-xs font-black rounded-xl shadow-[2px_2px_0px_#0f172a] flex items-center justify-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
          <span>Curriculum Scheme</span>
        </button>
      </div>
    </aside>
  );
};
