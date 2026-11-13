import React, { useState } from 'react';
import { CheckCircle2, Layers, Code } from 'lucide-react';
import { SYLLABUS_MODULES } from '../data/syllabusData';

export const SyllabusVivaModal: React.FC = () => {
  const [activeModule, setActiveModule] = useState<number>(1);

  const selectedModule = SYLLABUS_MODULES.find((m) => m.moduleNumber === activeModule)!;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <section className="border border-ink bg-paper p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-ink">
            Syllabus &amp; Viva Alignment Guide
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-[58ch]">
            Direct mapping of all Course Outcomes (CO1–CO6) and Modules 1–4 to StudySyncPlus code —
            <span className="font-mono text-[11px] text-ink-3"> SAKEC</span>
          </p>
        </div>

        <div className="ruled-sunk px-4 py-3 shrink-0">
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em] mb-1">Project Authors</p>
          <div className="text-xs text-ink space-y-0.5 tabular">
            <p>
              <strong>Tanmay Shinde</strong> · Roll 67{' '}
              <span className="font-mono text-[11px] text-ink-2">126BTCM2008</span>
            </p>
            <p>
              <strong>Aditya Shah</strong> · Roll 68{' '}
              <span className="font-mono text-[11px] text-ink-2">126BTCM2009</span>
            </p>
          </div>
        </div>
      </section>

      {/* Module selector rail */}
      <nav className="tab-rail" aria-label="Syllabus modules">
        {SYLLABUS_MODULES.map((mod) => (
          <button
            key={mod.moduleNumber}
            onClick={() => setActiveModule(mod.moduleNumber)}
            aria-pressed={activeModule === mod.moduleNumber}
            className={`tab-rail-item flex flex-col items-start gap-1 ${
              activeModule === mod.moduleNumber ? 'is-active' : ''
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-80">
              Module {mod.moduleNumber} · {mod.mappedCO}
            </span>
            <span className="font-bold text-xs sm:text-sm">{mod.name}</span>
          </button>
        ))}
      </nav>

      {/* Module content */}
      <section className="ruled p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-ink">
          <div>
            <p className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
              Module {selectedModule.moduleNumber} · {selectedModule.mappedCO} · {selectedModule.hours} Lecture Hours
            </p>
            <h2 className="text-xl sm:text-2xl font-black text-ink">{selectedModule.name}</h2>
          </div>
          <span className="stamp stamp-verified animate-stamp shrink-0">Covered</span>
        </div>

        <div>
          <h3 className="text-xs font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-lime-text" aria-hidden="true" /> Syllabus Outcomes
          </h3>
          <ul className="space-y-2">
            {selectedModule.outcomes.map((topic, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 ruled-sunk text-xs sm:text-sm text-ink-2">
                <span className="w-1.5 h-1.5 bg-lime-deep mt-2 shrink-0" aria-hidden="true" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ruled-sunk p-4 sm:p-5">
          <h3 className="text-xs font-mono font-semibold text-ink uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Implementation In StudySyncPlus
          </h3>
          <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">{selectedModule.implementationInApp}</p>
        </div>

        <div className="bg-ink text-paper font-mono text-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Code className="w-4 h-4 text-lime shrink-0" aria-hidden="true" />
            <span className="text-ink-3">Code Reference:</span>
            <span className="font-bold break-all">{selectedModule.codeReference}</span>
          </div>
          <span className="text-lime font-bold uppercase text-[10px] tracking-[0.08em] shrink-0">Verified &amp; Active</span>
        </div>
      </section>
    </div>
  );
};