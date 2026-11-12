import React, { useState } from 'react';
import { CheckCircle2, Layers, Code } from 'lucide-react';

interface SyllabusModule {
  moduleNumber: number;
  mappedCO: string;
  name: string;
  hours: number;
  outcomes: string[];
  implementationInApp: string;
  codeReference: string;
}

const SYLLABUS_MODULES: SyllabusModule[] = [
  {
    moduleNumber: 1,
    mappedCO: 'CO1',
    name: 'Advanced JavaScript Concepts',
    hours: 14,
    outcomes: [
      '1.1 ES6 features (arrow functions, let/const, template literals, destructuring, spread/rest)',
      '1.2 DOM Manipulation (dynamic card generation, modal dialogs, inline UI updates)',
      '1.3 Events and Form validation (real-time regex validation on resource upload modal)',
      '1.4 localStorage and sessionStorage persistence across user sessions',
      '1.5 Error handling and debugging techniques (try/catch blocks, error simulation)'
    ],
    implementationInApp:
      'All components are built with modern ES6+ syntax. Dynamic DOM updates are handled via React VDOM, form validation checks title length, regex roll numbers and PDF size caps, while resources, bookmarks and ratings persist in the Convex backend; the Async & JS Lab retains a live browser localStorage inspector for the syllabus outcome.',
    codeReference: 'src/components/UploadModal.tsx & convex/resources.ts'
  },
  {
    moduleNumber: 2,
    mappedCO: 'CO2',
    name: 'Client-Server Communication',
    hours: 14,
    outcomes: [
      '2.1 JSON structured data exchange format',
      '2.2 Fetch API for asynchronous HTTP communication',
      '2.3 AJAX techniques for dynamic UI updates without page reloads',
      '2.4 Asynchronous programming with Promises and async/await',
      '2.5 Promise chaining (.then() pipelines)',
      '2.6 RESTful API integration (Live OpenLibrary academic search)',
      '2.7 Introduction to CORS (Cross-Origin Resource Sharing)'
    ],
    implementationInApp:
      'The "Async & JS Lab" tab provides live Fetch API execution to the OpenLibrary REST endpoint, an animated 3-step Promise chain pipeline, and interactive simulated network failures with try/catch error traps.',
    codeReference: 'src/services/apiService.ts & src/components/JsSandboxModal.tsx'
  },
  {
    moduleNumber: 3,
    mappedCO: 'CO3, CO4',
    name: 'Front-End Frameworks and UI',
    hours: 16,
    outcomes: [
      '3.1 & 3.2 Responsive Grid System and mobile-first fluid layout',
      '3.3 React.js (JSX, modular components, typed Props, React Hooks)',
      '3.4 Single Page Application (SPA) architecture with stateful tab switching',
      '3.5 State Management in React using Context API'
    ],
    implementationInApp:
      'Modern Single Page Application built using React 19, TypeScript, and a paper-and-ink Course File design system. Temporary UI state (tab, search, filters) is centralized in ResourceContext while all study data streams reactively from Convex queries, providing instantaneous live filtering, bookmarking, editing, and resource deletion.',
    codeReference: 'src/App.tsx & src/context/ResourceContext.tsx'
  },
  {
    moduleNumber: 4,
    mappedCO: 'CO5, CO6',
    name: 'Data Visualization and Deployment',
    hours: 16,
    outcomes: [
      '4.1 & 4.2 Interactive data visualizations using Chart.js',
      '4.3 Deployment on GitHub Pages with clean file structure & version control',
      '4.4 Web Hosting essentials & static asset optimization',
      '4.5 Deployment workflows on GitHub Pages & Netlify'
    ],
    implementationInApp:
      'Integrated Chart.js and react-chartjs-2 with dynamic Bar, Line, and Doughnut charts reflecting live user resource metrics from the Convex backend. Automated build scripts configured with relative asset paths for GitHub Pages hosting of the SPA, with Convex serving data and PDF storage.',
    codeReference: 'src/components/AnalyticsCharts.tsx & convex/resources.ts'
  }
];

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

      {/* Detail inspector */}
      <section className="ruled p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-ink">
          <div>
            <p className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-1">
              Module {selectedModule.moduleNumber} · {selectedModule.mappedCO} · {selectedModule.hours} Lecture Hours
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-black text-ink">{selectedModule.name}</h2>
          </div>
          <span className="stamp stamp-verified animate-stamp hidden sm:inline-flex">Covered</span>
        </div>

        {/* Outcomes checklist */}
        <div>
          <h3 className="text-[11px] font-mono font-semibold text-ink-3 uppercase tracking-[0.08em] mb-3">
            Syllabus Topics Covered
          </h3>
          <ul className="space-y-2">
            {selectedModule.outcomes.map((topic, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 p-3 ruled-sunk text-xs sm:text-sm text-ink-2"
              >
                <CheckCircle2 className="w-4 h-4 text-lime-text shrink-0 mt-0.5" aria-hidden="true" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Implementation summary */}
        <div className="ruled-sunk p-4 border-l border-l-ink">
          <h3 className="text-[11px] font-mono font-semibold text-ink uppercase tracking-[0.08em] mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            Project Implementation Details
          </h3>
          <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
            {selectedModule.implementationInApp}
          </p>
        </div>

        {/* Code reference bar */}
        <div className="bg-ink text-paper font-mono text-xs p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Code className="w-4 h-4 text-lime shrink-0" aria-hidden="true" />
            <span className="text-ink-3">Source Code:</span>
            <span className="text-paper font-bold break-all">{selectedModule.codeReference}</span>
          </div>
          <span className="text-lime font-bold uppercase text-[10px] tracking-[0.08em] shrink-0">
            Verified &amp; Active
          </span>
        </div>
      </section>
    </div>
  );
};
