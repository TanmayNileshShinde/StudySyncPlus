# FEATURES.md — StudySyncPlus Feature Inventory

> Snapshot of the redesigned product, updated **November 2026** after the Complete Product & UX Redesign into a Subject-Centric Academic Workspace and Unified Full-Screen Study Workspace with Custom PDF.js & Slide Deck Engines.
> Purpose: a ground-truth list of verified capabilities. Everything here is verified in code, build, and live runtime.

---

## 1. Stack & Architecture

| Layer | Choice | Notes |
|---|---|---|
| **Framework** | React 19.3 + React Router 7 + TypeScript 7 (strict) | Full URL-based SPA routing with persistent paths, browser back/forward history, query params, and GitHub Pages fallback |
| **PDF Rendering Engine** | `pdfjs-dist` 5.4 + Vite Worker | Custom canvas-based PDF.js renderer with high-DPI scaling, virtualized on-demand page streaming, interactive text selection layer, and collapsible thumbnails |
| **Backend & Database** | Convex 1.49 (Reactive Cloud) | All-TypeScript reactive database, mutations, queries, file storage |
| **Vector Search & RAG** | Convex Vector Index (`documentChunks.by_embedding`, 1024-d) | NVIDIA Nemotron 1024-d embeddings + NVIDIA Nemotron 30B reasoning chat completion |
| **File Storage** | Convex File Storage | Real PDF and presentation uploads (50 MB limit), direct upload URLs, signed preview URLs |
| **Archive Bundler** | `fflate` 0.8 | Zero-dependency high-speed client-side ZIP generation for one-click course downloads |
| **Build & Tooling** | Vite 8 (`tsc -b && tsc -p tsconfig.convex.json --noEmit && vite build`) | Production build verified clean, zero errors |
| **Styling** | Tailwind 3.4 + hand-authored `src/index.css` | Paper-and-ink course file design contract, 1px hairlines, zero border-radius, lime accent |
| **Markdown & Mermaid** | `react-markdown` + `rehype-highlight` + `mermaid` | Code blocks with copy button, clean GFM tables, auto-sanitized flowcharts |
| **Lint** | `oxlint` | 0 errors |

---

## 2. Information Architecture & Navigation

| Surface | Purpose & Implementation | Status |
|---|---|---|
| **TopBar** | Sticky minimalist header: StudySyncPlus brand, semester mark, adaptive Back button in study mode, "Ask AI", "Add Materials" primary CTA, "Saved" counter, and "More" evaluator menu. | Shipped |
| **BottomNav** (Mobile) | 4 primary destinations (Home, Ask AI, Add, Saved, More) with safe-area insets; automatically hidden in study mode to maximize reading canvas. | Shipped |
| **SubjectsHome** | Academic workspace home: editorial hero, factual metrics strip, universal omnisearch across all subjects and documents, subject workspace tiles, and collapsible official curriculum scheme. | Shipped |
| **SubjectRail** (Desktop) | Sticky left rail inside subject workspaces: instant one-click switching between courses with active ink-stamp indicators and material counts. | Shipped |
| **SubjectPage** | Comprehensive course workspace: course code, credits, teaching hours, categorized document tabs, subject-scoped search, integrated syllabus & viva guide, and one-click ZIP download. | Shipped |
| **StudyWorkspace** | Full-screen two-panel study workspace eliminating separate dialog modals and disconnected chatbot pages. Persistent AI assistant on left; custom PDF.js canvas on right. | Shipped |
| **DocumentViewer** | Canvas area: custom minimal academic toolbar, PDF.js virtualized page renderer, collapsible page thumbnails, zoom controls, fit-to-width, native HTML5 fullscreen, print, download, 5-star peer rating, and metadata drawer. | Shipped |
| **PdfViewer** | Pure PDF.js continuous scroll viewer with lazy-loaded IntersectionObserver canvases, Retina high-DPI scaling, lime text-selection layer, and cited page badges. | Shipped |
| **PresentationViewer** | Dedicated presentation deck viewer for PPT/PPTX materials: slide filmstrip, structured slide text/bullet points, slide counter, raw download, and instant slide-specific AI questions. | Shipped |
| **WorkspaceAssistant** | Persistent AI sidebar: 3-way context scope selector (`This Doc`, `Subject`, `Library`), honesty indicator, saved session drawer, rich GFM tables, Mermaid diagrams, and clickable citations. | Shipped |
| **BulkUploadModal** | Multi-file drag-and-drop: auto-cleans file titles, category selectors, real-time XHR upload progress, live indexing tracking, and palette confetti. | Shipped |
| **BookmarksDrawer** | Right-hand slideout: reactively synchronized saved materials for exam revision with 1-click transition to the Study Workspace. | Shipped |
| **MoreSheet** | Discreet evaluator drawer hosting secondary tools: Scheme & Credit Matrix, Syllabus Alignment Map, Visual Analytics, and Async & JS Lab. | Shipped |
| **SavedView** (`/saved`) | Dedicated persistent screen for bookmarked revision materials with course-level filtering, search, quick study launcher, and one-click removal. | Shipped |
| **NotFoundView** (`*`) | Clean academic 404 screen matching paper-and-ink design tokens with one-click return to subjects home. | Shipped |

---

## 2.5. URL Routing & Persistent Deep-Linking (React Router 7)

| Route | Purpose & Behavior | Persistence |
|---|---|---|
| `/` | Academic Shelf Home: subject cards, omnisearch, scheme overview. | Persistent |
| `/subject/:subjectId` | Individual Subject Workspace: course materials, syllabus map, scheme metrics. | Persistent |
| `/study/:documentId` | Full-Screen Study Workspace: left PDF.js / deck canvas + right AI assistant. Supports `?page=N` and `?scope=document\|subject\|library`. | Persistent |
| `/assistant` | Study Assistant direct access: opens library or subject AI assistant with full split-screen reading context. | Persistent |
| `/saved` / `/bookmarks` | Saved Revision Materials: full listing of bookmarked documents. | Persistent |
| `/syllabus` | Direct persistent URL for Official SAKEC Syllabus & Viva Map. | Persistent |
| `/scheme` | Direct persistent URL for Curriculum Scheme & Credit Matrix. | Persistent |
| `/analytics` | Direct persistent URL for Academic Library Usage Analytics. | Persistent |
| `/async-lab` | Direct persistent URL for Async Promise & Error Lab. | Persistent |
| `*` | Graceful academic 404 Not Found screen with return navigation. | Persistent |

### Deep-Linking & History Features
- **Page Number Synchronization**: Scrolling or navigating pages in the PDF viewer synchronizes `?page=N` in the browser address bar via `replaceState` without polluting back/forward history.
- **Direct Shareable Links**: Copying the browser URL while studying on page 42 shares the exact document and page number.
- **Conversation State Persistence**: Active AI chat threads are preserved in `localStorage` under `studysyncplus_active_thread_${ownerKey}` across document switching, route changes, and hard page reloads.
- **GitHub Pages SPA Fallback**: `public/404.html` converts deep URL paths into query strings, and `index.html` restores them via `window.history.replaceState` before React mounts, ensuring zero 404 errors on GitHub Pages deployments.
- **Graceful Error Handling**: Non-existent subject or document IDs display dedicated academic "Not Found" error cards with single-click return actions, avoiding blank crashes.

---

## 3. Core Academic Workflows

### A. Subject Workspaces & Discovery
- **Subject-Centric Organization**: Courses are the primary organizational mental model. Each subject card reflects course code (`CMCOR2PC202`), credit weight (`4 cr`), category, material breakdown by type, and vector indexing status.
- **Universal Omnisearch**: Typing in the workspace search bar matches both subjects and individual documents (title, description, tags, course code, uploader) with real-time preview and direct click-to-study.
- **Categorized Tabs**: Inside each subject, materials are categorized into `All`, `Lecture Notes`, `Past Papers / PYQs`, `Lab Manuals`, `Cheat Sheets`, and `Reference Books` with live counts.
- **Bulk ZIP Download**: One-click "Download All" bundles the entire course file into a timestamped ZIP archive using `fflate` with a generated README manifest and live progress readout.

### B. Custom PDF.js Engine & Presentation Deck Viewer
- **Custom PDF.js Canvas Architecture**:
  - Replaced browser-native black embedded toolbars with an authentic paper-and-ink canvas.
  - Zero browser-specific controls: the toolbar uses StudySyncPlus design tokens (paper white ground, hairline rules, zero radius, lime active accents).
  - High-DPI crisp rendering on Retina screens via `window.devicePixelRatio`.
  - Virtualized IntersectionObserver rendering: only pages near the viewport render canvas bitmaps, preventing memory leaks on massive academic textbooks (e.g. 131-page MSE Master Study Guide).
  - Selectable text layer with signature lime text selection (`::selection { background: #a3e635; color: #111111; }`).
- **Collapsible Page Thumbnails Rail**:
  - 140px slideout thumbnail drawer showing lazy-rendered mini page previews with page numbers.
  - Active page marked with 2px lime indicator and ink border.
  - 1-click page jumping.
- **Toolbar Controls & Fit Modes**:
  - Previous / Next page steppers and direct page number input.
  - Zoom controls (`-`, `%`, `+`, `Fit to Width`, `Fit to Page`).
  - Native HTML5 Fullscreen button (`container.requestFullscreen()`) for distraction-free reading.
  - Print button: triggers clean vector printing without toolbar or sidebar elements.
  - Download button: fetches stored PDF with celebratory confetti.
  - Peer review 1–5 star rating widget.
- **Dedicated PPT/PPTX Slide Viewer**:
  - Separate slide deck interface rather than forcing binary PowerPoint files through a PDF converter.
  - Slide-by-slide browsing with slide counter (`Slide X of Total`).
  - Slide filmstrip sidebar showing all slide titles and text previews.
  - Action chip: "Ask AI About Slide X" to instantly interrogate specific slides.
  - Raw deck download action.

### C. Full-Screen Two-Panel AI Workspace
- **Persistent AI Assistant**: Resizable sidebar (`280px` to `680px`), double-click reset to `420px`, and keyboard shortcut collapse toggle (`Cmd+\` or `Ctrl+\`).
- **3-Way Context Scope Selector**:
  - `[ This Doc ]`: Scopes AI retrieval to the currently opened document (`mode: "resource"`).
  - `[ Subject ]`: Scopes AI retrieval across all documents in the active subject (`mode: "subject"`).
  - `[ Library ]`: Scopes AI retrieval across the entire academic library (`mode: "semester"`).
  - Context Honesty Bar displays exact chunk counts and document boundaries.
  - Preserves the conversation thread across scope switches and document switches.
- **Page-Mapped Interactive Citations**:
  - Citations display exact document name and page/slide badge (e.g. `[DSA MSE Guide · Page 20]`).
  - Clicking a citation smoothly scrolls the PDF viewer directly to Page 20 and highlights an active citation banner.
  - If cited from another document, the viewer automatically loads that document at the cited page while keeping the conversation intact.
- **Responsive Mobile Layout**:
  - On screens `< 768px`, a segmented control (`[ 📄 Document | 💬 Study AI ]`) lets students switch between document reading and AI discussion with one tap.

### D. Multi-File Upload & Document Management
- **Batch Drag & Drop**: Accepts multiple PDFs, PPT, and PPTX files (up to 50 MB each).
- **Auto-Title Cleaning**: Strips file extensions, hyphens, and underscores into clean academic titles.
- **XHR Progress Tracking**: Direct-to-storage signed URL uploads with real progress events (0% → 100%).
- **Live Pipeline Feedback**: Tracks document status from `uploading` → `filing` → `indexing` → `ready`.
- **Ownership Model**: Students retain ownership of their uploads via browser `ownerKey` and can edit title, category, description, or replace the stored file.

### E. Integrated Syllabus, Scheme & Viva
- **In-Subject Syllabus Tab**: Each course workspace includes an integrated Syllabus & Viva section detailing module outcomes, Course Outcome mappings (CO1–CO6), lecture hours, and project implementation references.
- **Official Scheme Matrix**: 11-column university matrix (Category, Abbr, Code, Name, CL, LL, SL/PBL, NH, Credits) accessible from both the workspace home and course details.

### F. Secondary Tools Relocation
- **Usage Analytics**: Visual KPI cards, downloads by subject bar chart, and resource-type doughnut chart moved out of primary navigation into the Tools drawer.
- **Async & JS Lab**: OpenLibrary academic REST API fetch, 3-stage promise-chain simulator, and network error traps maintained for viva evaluation in the Tools drawer.

---

## 4. Verification & Health Record

| Check | Target | Result | Status |
|---|---|---|---|
| **Build** | `npm run build` | 0 errors (4,193 modules transformed, Vite production bundle built in 1.43s) | **Pass** |
| **Lint** | `npm run lint` | 0 errors (oxlint across 65 files) | **Pass** |
| **Vector Search (Doc Mode)** | `scripts/test_rag_pipeline.mjs` | Retrieved 4 chunks, top hit page 20, score 0.506 | **Pass** |
| **Vector Search (Semester)** | `scripts/test_rag_pipeline.mjs` | Retrieved 4 chunks in Semester III, top hit page 52 | **Pass** |
| **Vector Search (Library)** | `scripts/test_rag_pipeline.mjs` | Retrieved 3 hits across catalog, top hit page 113 | **Pass** |
| **Grounded NVIDIA Generation** | `scripts/test_rag_pipeline.mjs` | 5 citations received, top citation page 31, persisted thread | **Pass** |
| **Out-of-Domain Refusal** | `scripts/test_rag_pipeline.mjs` | Correctly refused non-CS query (pasta recipe) | **Pass** |
| **Missing Context Honesty** | `scripts/test_rag_pipeline.mjs` | Identified missing curriculum topic without hallucination | **Pass** |
| **Duplicate Ingestion Guard** | `scripts/test_rag_pipeline.mjs` | Prevented duplicate chunk creation (status: `already_indexed`) | **Pass** |
