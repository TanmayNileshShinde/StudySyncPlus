export interface SyllabusModule {
  moduleNumber: number;
  mappedCO: string;
  name: string;
  hours: number;
  outcomes: string[];
  implementationInApp: string;
  codeReference: string;
}

export const SYLLABUS_MODULES: SyllabusModule[] = [
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
    codeReference: 'src/components/BulkUploadModal.tsx & convex/resources.ts'
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
