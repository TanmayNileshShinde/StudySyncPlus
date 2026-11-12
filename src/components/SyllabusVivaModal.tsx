import React, { useState } from 'react';
import { Award, CheckCircle2, ChevronRight, Code, FileText, Globe, Layers, UserCheck } from 'lucide-react';

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
      'All components are built with modern ES6+ syntax. Dynamic DOM updates are handled via React VDOM, form validation checks title length, regex roll numbers and positive file sizes, while localStorage retains all uploads and user bookmarks.',
    codeReference: 'src/components/UploadModal.tsx & src/context/ResourceContext.tsx'
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
      'Modern Single Page Application built using React 18, TypeScript, and Claymorphism design. State is centralized in ResourceContext with custom hooks, providing instantaneous live filtering, bookmarking, and resource deletion.',
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
      'Integrated Chart.js and react-chartjs-2 with dynamic Bar, Line, and Doughnut charts reflecting live user resource metrics. Automated build scripts configured with relative asset paths for immediate GitHub Pages hosting.',
    codeReference: 'src/components/AnalyticsCharts.tsx & vite.config.ts'
  }
];

export const SyllabusVivaModal: React.FC = () => {
  const [activeModule, setActiveModule] = useState<number>(1);

  const selectedModule = SYLLABUS_MODULES.find((m) => m.moduleNumber === activeModule)!;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="clay-box p-6 sm:p-8 bg-gradient-to-r from-white via-indigo-50/20 to-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-lg">
                Academic Evaluation Matrix
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Shah & Anchor Kutchhi Engineering College (SAKEC)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              Syllabus & Viva Alignment Guide
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Direct mapping of all Course Outcomes (CO1 to CO6) and Modules 1–4 to StudySyncPlus code.
            </p>
          </div>

          {/* Student Authors */}
          <div className="clay-badge p-3.5 bg-white rounded-2xl border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              Project Authors
            </p>
            <div className="text-xs text-slate-700 space-y-0.5">
              <p>
                <strong>Tanmay Shinde</strong> — Roll 67 (<span className="font-mono text-indigo-600">126BTCM2008</span>)
              </p>
              <p>
                <strong>Aditya Shah</strong> — Roll 68 (<span className="font-mono text-indigo-600">126BTCM2009</span>)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Selector Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SYLLABUS_MODULES.map((mod) => (
          <button
            key={mod.moduleNumber}
            onClick={() => setActiveModule(mod.moduleNumber)}
            className={`p-4 text-left rounded-2xl transition-all ${
              activeModule === mod.moduleNumber
                ? 'clay-box bg-indigo-600 text-white shadow-clay-colored'
                : 'clay-box bg-white text-slate-700 hover:text-indigo-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold font-mono">Module {mod.moduleNumber}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeModule === mod.moduleNumber
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {mod.mappedCO}
              </span>
            </div>
            <h4 className="font-bold text-xs sm:text-sm line-clamp-1">{mod.name}</h4>
          </button>
        ))}
      </div>

      {/* Detailed Module Inspector */}
      <div className="clay-box p-6 sm:p-8 bg-white space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-bold mb-1">
              <span>MODULE {selectedModule.moduleNumber}</span>
              <span>•</span>
              <span>{selectedModule.mappedCO}</span>
              <span>•</span>
              <span>{selectedModule.hours} Lecture Hours</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">{selectedModule.name}</h2>
          </div>
          <span className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 hidden sm:block">
            <CheckCircle2 className="w-6 h-6" />
          </span>
        </div>

        {/* Outcomes Checklist */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Syllabus Topics Covered
          </h3>
          <ul className="space-y-2.5">
            {selectedModule.outcomes.map((topic, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Implementation Summary */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            Project Implementation Details
          </h4>
          <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed">
            {selectedModule.implementationInApp}
          </p>
        </div>

        {/* Code Reference Pill */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <span>Source Code:</span>
            <span className="text-white font-bold">{selectedModule.codeReference}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold uppercase">Verified & Active</span>
        </div>
      </div>
    </div>
  );
};
