import React, { useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { Layers, PlusCircle, Archive, RotateCcw } from 'lucide-react';
import type { NewSubjectInput } from '../types';

const EMPTY_FORM = {
  name: '',
  courseCode: '',
  category: 'Program Core',
  abbreviation: 'PC',
  cl: 30,
  tl: 0,
  ll: 30,
  slPbl: 0,
  nh: 60,
  credits: 2,
  inLibrary: true
};

export const CurriculumSchemeModal: React.FC<{ onOpenSubject?: (subjectId: string) => void }> = ({
  onOpenSubject
}) => {
  const {
    schemeCourses,
    semester,
    addSubject,
    setSubjectArchived,
    openSubject,
    showToast
  } = useResources();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<NewSubjectInput>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const semesterLabel = semester?.label ?? 'Semester III';

  const handleFilterByCourse = (course: { id: string; courseName: string; inLibrary: boolean; isArchived: boolean }) => {
    if (course.inLibrary && !course.isArchived) {
      if (onOpenSubject) {
        onOpenSubject(course.id);
      } else {
        openSubject(course.id);
      }
      showToast(`Opened: ${course.courseName}`);
    } else {
      showToast(`No shelf section for "${course.courseName}" yet.`);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.courseCode.trim()) {
      showToast('Course name and code are required.');
      return;
    }
    setIsSaving(true);
    try {
      await addSubject(form);
      setForm(EMPTY_FORM);
      setIsAddOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add the course.');
    } finally {
      setIsSaving(false);
    }
  };

  const numberField = (
    label: string,
    key: keyof NewSubjectInput,
    props: { min?: number } = {}
  ) => (
    <div>
      <label htmlFor={`scheme-${key}`} className="block font-mono text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
        {label}
      </label>
      <input
        id={`scheme-${key}`}
        type="number"
        min={props.min ?? 0}
        value={String(form[key])}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
        className="field w-full px-2.5 py-2"
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <section className="border border-ink bg-paper p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-ink">
            Department Course Structure &amp; Credit Matrix
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-[58ch]">
            Direct alignment with the SAKEC {semesterLabel.toLowerCase()} teaching &amp; learning scheme —{' '}
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
            {semesterLabel} Course Breakdown &amp; Hour Distribution
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-ink-3 hidden sm:inline">Click any course row to filter the library</span>
            <button
              onClick={() => setIsAddOpen((prev) => !prev)}
              className="btn btn-secondary px-2.5 py-1.5 text-[11px] min-h-0"
              aria-expanded={isAddOpen}
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAddOpen ? 'Close Form' : 'Add Course'}</span>
            </button>
          </div>
        </div>

        {/* Add-course form (collapsed by default) */}
        {isAddOpen && (
          <form onSubmit={handleAddCourse} className="px-6 py-4 border-b border-rule bg-sunk space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-2">
                <label htmlFor="scheme-name" className="block font-mono text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
                  Course Name
                </label>
                <input
                  id="scheme-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Computer Networks"
                  className="field w-full px-2.5 py-2"
                />
              </div>
              <div>
                <label htmlFor="scheme-code" className="block font-mono text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
                  Course Code
                </label>
                <input
                  id="scheme-code"
                  type="text"
                  value={form.courseCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, courseCode: e.target.value }))}
                  placeholder="CMCOR2PC205"
                  className="field w-full px-2.5 py-2 font-mono"
                />
              </div>
              <div>
                <label htmlFor="scheme-category" className="block font-mono text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
                  Category
                </label>
                <input
                  id="scheme-category"
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="field w-full px-2.5 py-2"
                />
              </div>
              <div>
                <label htmlFor="scheme-abbr" className="block font-mono text-[10px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
                  Abbr.
                </label>
                <input
                  id="scheme-abbr"
                  type="text"
                  value={form.abbreviation}
                  onChange={(e) => setForm((prev) => ({ ...prev, abbreviation: e.target.value }))}
                  className="field w-full px-2.5 py-2 font-mono"
                />
              </div>
              {numberField('CL', 'cl')}
              {numberField('LL', 'll')}
              {numberField('SL/PBL', 'slPbl')}
              {numberField('TL', 'tl')}
              {numberField('NH', 'nh')}
              {numberField('Credits', 'credits')}
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-[11px] font-medium text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.inLibrary}
                    onChange={(e) => setForm((prev) => ({ ...prev, inLibrary: e.target.checked }))}
                    className="w-4 h-4 accent-[#111111]"
                  />
                  In library rail
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSaving} className="btn btn-primary px-5">
                <PlusCircle className="w-4 h-4" aria-hidden="true" />
                <span>{isSaving ? 'Adding…' : 'Add to Scheme'}</span>
              </button>
            </div>
          </form>
        )}

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
              {schemeCourses.map((item) => (
                <tr
                  key={item.id}
                  className={`transition-colors hover:bg-lime-wash group cursor-pointer ${item.isArchived ? 'opacity-50' : ''}`}
                  onClick={() => handleFilterByCourse({ id: item.id, courseName: item.courseName, inLibrary: item.inLibrary, isArchived: item.isArchived })}
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
                    {item.isArchived && (
                      <span className="stamp stamp-outline ml-2 align-middle">Archived</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-ink-2 tabular">{item.cl || '—'}</td>
                  <td className="py-3 px-3 text-center font-mono text-ink-2 tabular">{item.ll || '—'}</td>
                  <td className="py-3 px-3 text-center font-mono text-ink-2 tabular">{item.slPbl || '—'}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-ink tabular">{item.nh}</td>
                  <td className="py-3 px-3 text-center font-bold text-lime-text tabular text-sm">
                    {item.credits}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!item.isArchived && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterByCourse(item);
                          }}
                          className="btn btn-secondary px-2.5 py-1.5 text-[11px] min-h-0"
                          aria-label={`View notes for ${item.courseName}`}
                        >
                          View Notes
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void setSubjectArchived(item.id, !item.isArchived);
                        }}
                        className="p-1.5 text-ink-3 hover:text-alert hover:bg-sunk transition-colors"
                        aria-label={item.isArchived ? `Restore ${item.courseName}` : `Archive ${item.courseName}`}
                        title={item.isArchived ? 'Restore course to the library' : 'Archive course (hidden from library rail and uploads)'}
                      >
                        {item.isArchived ? (
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-sunk font-bold text-ink text-xs border-t-2 border-ink">
                <td colSpan={5} className="py-3.5 px-3 font-mono uppercase tracking-[0.06em] text-[10px]">
                  Total Scheme Hours &amp; Credits ({semesterLabel})
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
