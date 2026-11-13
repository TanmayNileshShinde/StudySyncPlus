# 🎓 StudySyncPlus — Academic Resource Hub & Grounded AI Study Workspace

[![React 19](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Convex](https://img.shields.io/badge/Convex-1.49-F65B42?logo=convex&logoColor=white)](https://convex.dev/)
[![Nvidia AI](https://img.shields.io/badge/Nvidia%20AI-Nemotron%2030B-76B900?logo=nvidia&logoColor=white)](https://build.nvidia.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Official Department Course File & Academic Workspace for Semester III Computer Engineering**  
> **Institution:** Shah & Anchor Kutchhi Engineering College (SAKEC), Chembur, Mumbai  
> **Curriculum:** Semester III [Level 4.5, UG Certificate] • **Course:** Web Computing & Modern Frameworks

---

## 👥 Student Development Team

| Roll No. | Student ID | Full Name | Academic Role | GitHub Profile |
|:---:|:---:|:---:|:---:|:---:|
| **67** | `126BTCM2008` | **Tanmay Shinde** | Full-Stack & UI/UX Architect | [@TanmayNileshShinde](https://github.com/TanmayNileshShinde) |
| **68** | `126BTCM2009` | **Aditya Shah** | Systems, RAG & Convex Engine | [@adityashah2701](https://github.com/adityashah2701) |

---

## 🌐 Live Application & Repositories

- 🚀 **Live Production Deployment (GitHub Pages):** [https://TanmayNileshShinde.github.io/StudySyncPlus/](https://TanmayNileshShinde.github.io/StudySyncPlus/)
- 📦 **Source Code Repository:** [https://github.com/TanmayNileshShinde/StudySyncPlus](https://github.com/TanmayNileshShinde/StudySyncPlus)
- ☁️ **Cloud Backend Deployment:** [Convex Cloud](https://wry-crane-347.convex.cloud)

---

## 📖 Overview & Purpose

**StudySyncPlus** transforms traditional static academic drives into an active, high-yield academic study environment. Engineered specifically around the Semester III Computer Engineering curriculum at SAKEC, it integrates:

1. **A Finder/Google Drive–style hierarchical file manager** with real folder navigation, breadcrumbs, nested directories, drag-and-drop, and bulk operations.
2. **Native in-browser document viewers** for both PDF and PowerPoint (PPTX) presentations with zero conversion loss.
3. **A strictly grounded AI Study Assistant** driven by dense vector search (2048-dimensional embeddings) and Nvidia Nemotron LLMs, providing exact page- and slide-level citations.
4. **An editorial "Course File" design system** (paper ground, iron-black ink, hairline rules, mono provenance stamps, and highlighter lime accents) designed for high legibility and zero cognitive fatigue.

---

## ✨ Key Features & Capabilities

### 1. 🗂️ True Hierarchical File Manager (Finder / Drive UX)
- **Navigable Directories:** Folders are true navigable entities rather than filter tags. Clicking a folder navigates *into* its sub-hierarchy.
- **Dynamic Breadcrumbs:** Full path tracking (`Subject / Unit / Topic`) supporting browser back/forward buttons and direct navigation jumps.
- **Dedicated Unorganized Root:** Automatically categorizes loose materials without a designated folder.
- **Comprehensive File & Folder Operations:** Create, rename, delete, move, and download files and nested subfolders.
- **Drag-and-Drop & Multi-Select:** Select multiple resources and batch-move them into folders with visual drop-zone feedback.
- **Directory Search & Sorting:** Real-time search scoped to the current directory or whole subject, sorted by name, date, size, or format.

### 2. 📑 High-Fidelity Native Document Viewers (Zero Conversion Loss)
- **Native PowerPoint (PPTX) Viewer:**
  - Original PPTX files render directly inside the browser using `pptx-preview` without lossy server-side PDF conversion.
  - Slide-by-slide navigation, thumbnail rail, zoom controls, full-screen mode, and slide counters.
  - Native extraction and presentation of slide speaker notes.
- **High-Performance PDF Viewer:**
  - Built on `pdfjs-dist` with custom canvas rendering.
  - Page thumbnail strip, jump-to-page, document switcher dropdown, and full-screen reading modes.

### 3. 🤖 Grounded AI Study Assistant (RAG & Vector Search)
- **Nvidia Nemotron Embeddings & LLM:**
  - Document chunking pipeline with page and slide provenance indexing.
  - 2048-dimensional vector embeddings powered by `nvidia/nemotron-3.5-embed-1b`.
  - Question answering and synthesis powered by `nvidia/nemotron-4-30b-instruct`.
- **Strict Grounding & Exact Citations:**
  - AI responses are strictly confined to uploaded course materials to eliminate hallucinations.
  - Every assertion links to an exact source: `[SOURCE 1: "1.4 OS Structures", Slide 15]`.
- **Targeted Slide & Page Tagging (`@` / `/` Autocomplete):**
  - Type `@slide 15, 23`, `/slide 1-3`, `@page 4`, or `@doc` to target specific portions of a document.
  - Features an interactive mention autocomplete popover with live slide chips.
  - Fallback natural-language detection for phrases like *"Explain slide 15 and slide 23"*.
- **Diagrams & Visualizations:**
  - Answers automatically generate interactive **Mermaid.js** diagrams (architecture flowcharts, sequence diagrams, mindmaps) and syntax-highlighted code snippets.
  - LaTeX mathematical equations rendered via KaTeX.

### 4. 🎨 "Course File" Editorial UI Design System
- Strictly complies with the project's [DESIGN.md](file:///Users/adityashah/Developer/Aditya%20Projects/Notes/Bridge-Course/web/Web-Tech-2/Microproject/StudySyncPlus/DESIGN.md) specification:
  - **Paper Ground (`#ffffff` / `#f7f7f5`):** Calm, distraction-free reading surface.
  - **Iron-Black Ink (`#111111`):** High-contrast, sharp typography using *Archivo* and *JetBrains Mono*.
  - **Single Live Highlighter (`#a3e635`):** Pinned lime accent reserved exclusively for active states and primary actions.
  - **Zero Visual Noise:** No decorative gradients, 3D clay bloatware, or distracting cards. Density lives inside clean hairline rules.

### 5. 🎯 Curriculum & Academic Evaluation Features
- **Curriculum Matrix:** Embedded SAKEC Sem 3 Scheme with credit splits, IA, ISE, ESE, TW, and Oral/Practical marks.
- **Core Course Workspaces:**
  - `CMCOR2PC201`: Data Structures
  - `CMCOR2BS201`: Discrete Mathematics & Graph Theory
  - `CMCOR2PC202`: Operating Systems
  - `CMCOR2PC203`: Digital Logic & Computer Organization
  - `CMCOR2PC204`: Data Base Management System
  - `CMCOR2ES201`: Principle of Communication
- **Syllabus Viva & Exam Preparation:** Subject-wise viva voce question banks and high-yield flashcards.
- **Async Lab:** Interactive JavaScript error simulator and Promise lab demonstrating asynchronous fetch and error boundaries.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend Framework** | **React 19**, **TypeScript 7** | Strongly typed, high-performance modular UI architecture |
| **Bundler & Tooling** | **Vite 8**, **Oxlint** | Sub-second HMR, optimized production builds, strict linting |
| **Cloud Backend** | **Convex 1.49** | Real-time database, mutations, reactive queries, file storage |
| **AI & Vector Search** | **Nvidia AI**, Convex Vector Indexes | `nemotron-3.5-embed-1b` (2048-d) & `nemotron-4-30b-instruct` |
| **Document Engines** | `pptx-preview`, `pdfjs-dist`, `fflate` | In-browser PPTX & PDF rendering, OpenXML zip extraction |
| **Text Parsing & RAG** | `pdf-parse`, custom PPTX extractor | Provenance-preserving extraction (page/slide numbers + notes) |
| **Styling & Typography** | **Tailwind CSS**, *Archivo*, *JetBrains Mono* | "Course File" editorial layout, monospace metadata stamps |
| **Visualizations** | **Mermaid.js 12**, **Chart.js 4**, `rehype-highlight` | Architecture diagrams, analytics charts, code syntax highlighting |

---

## 📋 Comprehensive Syllabus & Course Outcome (CO) Mapping

Built for the academic evaluation of **Course Code: Web Computing & Modern Frameworks (Semester III)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COURSE OUTCOME MAPPING                          │
├─────────┬─────────────────────────────────────────────────┬────────────┤
│ Outcome │ Description                                     │ Status     │
├─────────┼─────────────────────────────────────────────────┼────────────┤
│ CO1     │ Advanced JavaScript & ES6+ language features    │ Mastered   │
│ CO2     │ Asynchronous client-server communication & APIs │ Mastered   │
│ CO3     │ Modular component architecture with React       │ Mastered   │
│ CO4     │ Single Page Application (SPA) state management  │ Mastered   │
│ CO5     │ Academic data visualization & diagramming       │ Mastered   │
│ CO6     │ Production build optimization & cloud hosting   │ Mastered   │
└─────────┴─────────────────────────────────────────────────┴────────────┘
```

### 🧩 Module 1: Advanced JavaScript Concepts (CO1)
- **1.1 ES6+ Features:** Arrow functions, rest/spread operators, template literals, and object/array destructuring used universally throughout the codebase.
- **1.2 Strict Typing:** End-to-end TypeScript interfaces for all data structures, mutations, and backend queries.
- **1.3 Storage & Provenance:** Local state caching combined with Convex cloud persistence for resources, bookmarks, and user session profiles.
- **1.4 Error Handling & Diagnostics:** Robust `try...catch...finally` implementations and an intentional runtime error simulator in the Async Lab.

### 🌐 Module 2: Client-Server & Asynchronous Computing (CO2)
- **2.1 Reactive Cloud Backend:** Zero-polling Convex subscriptions update all active client views in real time.
- **2.2 RESTful & Blob Streaming:** Secure signed URL generation and streaming downloads directly from Convex Storage.
- **2.3 Asynchronous Document Parsing:** Web Workers and multi-stage Promise pipelines for background PDF and PPTX extraction.
- **2.4 Vector Search Integration:** Asynchronous batching of embeddings with checkpointed retry pipelines.

### ⚛️ Module 3: Front-End Frameworks & State Management (CO3, CO4)
- **3.1 React 19 Ecosystem:** Modern functional hooks (`useState`, `useEffect`, `useContext`, `useMemo`, `useCallback`, `useRef`).
- **3.2 Centralized Context:** Global `ResourceContext` orchestrating folder navigation, selection sets, search filters, and active resources.
- **3.3 Single Page Application Architecture:** URL-backed route state for subject workspaces, folder trees, and document viewers.
- **3.4 Responsive Grid:** Fluid mobile-first grid conforming to SAKEC standard viewing resolutions (mobile, tablet, desktop, 4K).

### 📊 Module 4: Data Visualization & Cloud Deployment (CO5, CO6)
- **4.1 Interactive Chart.js Telemetry:**
  - **Bar Chart:** Subject-wise download volume and student access counts.
  - **Spline Trend Chart:** Weekly study sessions and peak resource discovery periods.
  - **Doughnut Distribution:** Resource categorization (Notes, PYQs, Lab Manuals, Syllabus).
- **4.2 AI Diagrams with Mermaid.js:** Real-time client rendering of algorithmic flowcharts and OS architectural diagrams directly in chat responses.
- **4.3 Production Build:** Production minification, asset cache-busting, and sub-second asset delivery via GitHub Pages.

---

## 📂 Project Directory Structure

```text
StudySyncPlus/
├── convex/                          # Convex Cloud Backend
│   ├── schema.ts                    # Database schema (resources, chunks, folders, chat)
│   ├── rag.ts                       # RAG actions, vector search, chat completion, chunking
│   ├── ragInternal.ts               # Chunk queries, hydration, exact slide getters
│   ├── extract.ts                   # Provenance-bearing PDF & PPTX text extractors
│   ├── ingest.ts                    # Multi-stage background embedding pipeline
│   ├── resources.ts                 # Resource CRUD, upload URLs, downloads
│   ├── folders.ts                   # Hierarchical folder tree mutations & queries
│   └── chat.ts                      # Chat threads, messages, citations, tags
│
├── src/                             # React 19 Client Application
│   ├── components/
│   │   ├── StudyWorkspace/          # High-Fidelity Study Workspace
│   │   │   ├── StudyWorkspace.tsx   # Workspace split-screen shell
│   │   │   ├── DocumentViewer.tsx   # Header, controls, switcher dropdown
│   │   │   ├── PresentationViewer.tsx # Native PPTX viewer (pptx-preview)
│   │   │   ├── PdfViewer.tsx        # High-performance PDF.js canvas viewer
│   │   │   └── WorkspaceAssistant.tsx # Grounded AI Assistant with @ mentions
│   │   ├── SubjectsHome.tsx         # Academic home, search, continue studying
│   │   ├── SubjectPage.tsx          # Finder/Drive hierarchical file manager
│   │   ├── AnalyticsCharts.tsx      # Chart.js academic telemetry
│   │   ├── MarkdownRenderer.tsx     # Markdown, KaTeX & code highlight renderer
│   │   ├── MermaidDiagram.tsx       # Live interactive Mermaid diagrams
│   │   ├── CurriculumSchemeModal.tsx# SAKEC Sem 3 credit & exam scheme matrix
│   │   └── SyllabusVivaModal.tsx    # Interactive viva voce revision modal
│   ├── context/
│   │   └── ResourceContext.tsx      # Central reactive global state store
│   ├── types/
│   │   └── index.ts                 # Core TypeScript definitions & schemas
│   └── index.css                    # "Course File" design tokens & typography
│
├── public/                          # Static assets and test documents
├── DESIGN.md                        # Visual design contract (palette, typography, rules)
├── vite.config.ts                   # Vite build & bundler configuration
└── package.json                     # Dependency manifests & project scripts
```

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js:** `v20.0.0` or higher (verified on Node 22 & 24)
- **npm:** `v10.0.0` or higher
- **Convex Account:** (Free tier at [convex.dev](https://convex.dev))

### 1. Clone the Repository
```bash
git clone https://github.com/TanmayNileshShinde/StudySyncPlus.git
cd StudySyncPlus
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Convex Deployment URL
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud

# (Optional) NVIDIA NIM API Key for RAG chat & embeddings
NVIDIA_API_KEY=nvapi-your-key-here
```

### 4. Start Convex Backend
In a separate terminal window, start the local Convex sync process:
```bash
npx convex dev
```

### 5. Launch Frontend Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Production Build & Deployment

### Build Application
Compile TypeScript and bundle production assets with Vite:
```bash
npm run build
```

### Code Quality & Linting
Run the high-speed Oxlint linter:
```bash
npm run lint
```

### Deploy to GitHub Pages
```bash
npm run deploy
```

---

## 📄 License & Academic Attribution

This project is submitted for academic evaluation in **Semester III Computer Engineering** at **Shah & Anchor Kutchhi Engineering College (SAKEC)**.

Released under the **[MIT License](https://opensource.org/licenses/MIT)**.  
Copyright © 2026 **Tanmay Shinde** & **Aditya Shah**. All rights reserved.
