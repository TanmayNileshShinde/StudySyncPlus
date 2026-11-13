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
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-rule bg-paper sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto no-scrollbar">
      <button
        onClick={openHome}
        className="flex items-center gap-2 px-4 py-3 text-[13px] font-semibold text-ink-2 hover:text-ink hover:bg-paper-sunk transition-colors border-b border-rule text-left shrink-0"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>All subjects</span>
      </button>

      <nav className="flex-1 py-2" aria-label="Subjects">
        {subjects.map((subject) => {
          const isActive = subject.id === activeSubjectId;
          return (
            <button
              key={subject.id}
              onClick={() => openSubject(subject.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full text-left px-4 py-2.5 transition-colors ${
                isActive
                  ? 'bg-ink text-paper shadow-[inset_0_-2px_0_var(--lime)]'
                  : 'text-ink hover:bg-paper-sunk'
              }`}
            >
              <span className={`block font-mono text-[10px] tracking-[0.08em] ${isActive ? 'text-lime' : 'text-ink-3'}`}>
                {subject.courseCode}
              </span>
              <span className={`block text-[13px] font-semibold leading-snug mt-0.5`}>
                {subject.name}
              </span>
              <span className={`block font-mono text-[10px] mt-1 tabular ${isActive ? 'text-paper/60' : 'text-ink-3'}`}>
                {countFor(subject.id)} materials
              </span>
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => onOpenSheet('scheme')}
        className="flex items-center gap-2 mx-3 mb-3 px-3 py-2 text-[12px] font-semibold text-ink-2 hover:text-ink border border-rule hover:border-ink transition-colors shrink-0"
      >
        <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Manage courses</span>
      </button>
    </aside>
  );
};
