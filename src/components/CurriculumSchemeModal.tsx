import React from 'react';
import { OFFICIAL_SEMESTER_3_SCHEME } from '../data/initialResources';
import { Layers } from 'lucide-react';
import { useResources } from '../context/ResourceContext';

export const CurriculumSchemeModal: React.FC = () => {
  const { setSelectedSubject, setActiveTab, showToast } = useResources();

  const handleFilterByCourse = (courseName: string) => {
    // Map official name to available subject category if matched
    if (
      courseName.includes('Web Technology') ||
      courseName.includes('Data Structures') ||
      courseName.includes('Operating System') ||
      courseName.includes('Discrete Structures') ||
      courseName.includes('Microprocessor') ||
      courseName.includes('Embedded') ||
      courseName.includes('OOP with Java') ||
      courseName.includes('Career Navigation')
    ) {
      const match = courseName.includes('Web Technology')
        ? 'Web Technology II'
        : courseName.includes('Data Structures')
        ? 'Data Structures'
        : courseName.includes('Operating System')
        ? 'Operating System'
        : courseName.includes('Discrete Structures')
        ? 'Discrete Structures'
        : courseName.includes('Microprocessor')
        ? 'Microprocessor'
        : courseName.includes('Embedded')
        ? 'Foundation of Embedded System'
        : courseName.includes('OOP with Java')
        ? 'OOP with Java'
        : 'Engineering Career Navigation';

      setSelectedSubject(match as any);
      setActiveTab('library');
      showToast(`Library filtered for: ${match}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <section className="border border-ink bg-paper p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-ink">
            Department Course Structure &amp; Credit Matrix
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-[58ch]">
            Direct alignment with the SAKEC Semester 3 teaching &amp; learning scheme —{' '}
            <span className="font-mono text-[11px] text-ink-3">Level 4.5 · UG Certificate</span>
          </p>
        </div>

        <div className="ruled-sunk px-4 py-3 shrink-0">
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Total Credits</p>
          <p className="text-sm font-extrabold text-ink tabular">22 + 2* Credits</p>
        </div>
      </section>

      {/* Official table */}
      <section className="ruled overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-ink">
          <h2 className="font-bold text-ink text-sm sm:text-base flex items-center gap-2">
            <Layers className="w-4 h-4" aria-hidden="true" />
            Semester III Course Breakdown &amp; Hour Distribution
          </h2>
          <span className="text-[11px] font-mono text-ink-3">Click any course row to filter the library</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink border-collapse">
            <thead>
              <tr className="bg-sunk text-[10px] font-mono font-semibold text-ink-2 uppercase tracking-[0.06em] border-b border-ink">
                <th className="py-3 px-3">S.N.</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Abbr.</th>
                <th className="py-3 px-3">Course Code</th>
                <th className="py-3 px-3">Course Name</th>
                <th className="py-3 px-3 text-center">CL</th>
                <th className="py-3 px-3 text-center">LL</th>
                <th className="py-3 px-3 text-center">SL/PBL</th>
                <th className="py-3 px-3 text-center">Total NH</th>
                <th className="py-3 px-3 text-center text-lime-text">Credits</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {OFFICIAL_SEMESTER_3_SCHEME.map((item) => (
                <tr
                  key={item.srNo}
                  className="transition-colors hover:bg-lime-wash group cursor-pointer"
                  onClick={() => handleFilterByCourse(item.courseName)}
                >
                  <td className="py-3 px-3 font-mono text-ink-3 tabular">{item.srNo}</td>
                  <td className="py-3 px-3 font-medium text-ink-2">
                    <span className="px-1.5 py-0.5 border border-rule text-[10px] font-mono text-ink-2 bg-paper">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-ink">{item.abbreviation}</td>
                  <td className="py-3 px-3 font-mono font-semibold text-ink-2">{item.courseCode}</td>
                  <td className="py-3 px-3 font-bold text-ink group-hover:underline underline-offset-2 decoration-2">
                    {item.courseName}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-ink-2 tabular">{item.cl || '—'}</td>
                  <td className="py-3 px-3 text-center font-mono text-ink-2 tabular">{item.ll || '—'}</td>
                  <td className="py-3 px-3 text-center font-mono text-ink-2 tabular">{item.slPbl || '—'}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-ink tabular">{item.nh}</td>
                  <td className="py-3 px-3 text-center font-bold text-lime-text tabular text-sm">
                    {item.credits}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFilterByCourse(item.courseName);
                      }}
                      className="btn btn-secondary px-2.5 py-1.5 text-[11px] min-h-0"
                      aria-label={`View notes for ${item.courseName}`}
                    >
                      View Notes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-sunk font-bold text-ink text-xs border-t-2 border-ink">
                <td colSpan={5} className="py-3.5 px-3 font-mono uppercase tracking-[0.06em] text-[10px]">
                  Total Scheme Hours &amp; Credits (Semester III)
                </td>
                <td className="py-3.5 px-3 text-center font-mono tabular">150</td>
                <td className="py-3.5 px-3 text-center font-mono tabular">360+60*</td>
                <td className="py-3.5 px-3 text-center font-mono tabular">150</td>
                <td className="py-3.5 px-3 text-center font-mono tabular">660+60*</td>
                <td className="py-3.5 px-3 text-center font-mono text-lime-text tabular text-sm">22+2*</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-rule flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-ink-3 font-mono">
            CL: Classroom · LL: Lab · SL/PBL: Self/Project-Based · NH: Notional Hours
          </span>
          <span className="text-ink-2 font-medium">Mapped for Tanmay Shinde (67) &amp; Aditya Shah (68)</span>
        </div>
      </section>
    </div>
  );
};
