import React from 'react';
import { OFFICIAL_SEMESTER_3_SCHEME } from '../data/initialResources';
import { GraduationCap, BookOpen, Layers, Award, Sparkles, CheckCircle2 } from 'lucide-react';
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
      showToast(`Filtered StudySyncPlus library for: ${match}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="clay-box p-6 sm:p-8 bg-gradient-to-r from-white via-indigo-50/20 to-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-lg">
                Official Curriculum Scheme
              </span>
              <span className="text-xs text-slate-500 font-medium">
                SEMESTER - III [Level 4.5, UG Certificate]
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              Department Course Structure & Credit Matrix
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Direct alignment with Shah & Anchor Kutchhi Engineering College (SAKEC) Semester 3 teaching & learning scheme.
            </p>
          </div>

          <div className="clay-badge p-3.5 bg-white rounded-2xl border border-slate-100 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Credits</p>
              <p className="text-base font-black text-slate-800">22 + 2* Credits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Official Table Representation */}
      <div className="clay-box p-6 bg-white overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Semester III Course Breakdown & Hour Distribution
          </h3>
          <span className="text-xs text-slate-400">Click any course to filter notes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3">S.N.</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Abbr.</th>
                <th className="py-3 px-3">Course Code</th>
                <th className="py-3 px-3">Course Name</th>
                <th className="py-3 px-3 text-center">CL</th>
                <th className="py-3 px-3 text-center">LL</th>
                <th className="py-3 px-3 text-center">SL/PBL</th>
                <th className="py-3 px-3 text-center font-bold text-slate-700">Total NH</th>
                <th className="py-3 px-3 text-center font-bold text-indigo-600">Credits</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {OFFICIAL_SEMESTER_3_SCHEME.map((item) => (
                <tr
                  key={item.srNo}
                  className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                  onClick={() => handleFilterByCourse(item.courseName)}
                >
                  <td className="py-3 px-3 font-bold text-slate-400">{item.srNo}</td>
                  <td className="py-3 px-3 font-medium text-slate-600">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-indigo-600">{item.abbreviation}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{item.courseCode}</td>
                  <td className="py-3 px-3 font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {item.courseName}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500">{item.cl || '-'}</td>
                  <td className="py-3 px-3 text-center text-slate-500">{item.ll || '-'}</td>
                  <td className="py-3 px-3 text-center text-slate-500">{item.slPbl || '-'}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{item.nh}</td>
                  <td className="py-3 px-3 text-center font-bold text-indigo-600 text-sm">
                    {item.credits}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFilterByCourse(item.courseName);
                      }}
                      className="clay-button px-2.5 py-1 text-[11px] font-bold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all rounded-lg"
                    >
                      View Notes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/60 font-bold text-slate-800 text-xs border-t-2 border-indigo-200">
                <td colSpan={5} className="py-3.5 px-3 uppercase tracking-wider">
                  Total Scheme Hours & Credits (Semester - III)
                </td>
                <td className="py-3.5 px-3 text-center font-mono">150</td>
                <td className="py-3.5 px-3 text-center font-mono">360+60*</td>
                <td className="py-3.5 px-3 text-center font-mono">150</td>
                <td className="py-3.5 px-3 text-center font-mono text-indigo-700">660+60*</td>
                <td className="py-3.5 px-3 text-center font-mono text-indigo-700 text-sm">22+2*</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend Notes */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>CL: Classroom Learning • LL: Lab Learning • SL/PBL: Self Learning / Project Based Learning • NH: Notional Hours</span>
          <span className="text-indigo-600 font-medium">Mapped for Tanmay Shinde (67) & Aditya Shah (68)</span>
        </div>
      </div>
    </div>
  );
};
