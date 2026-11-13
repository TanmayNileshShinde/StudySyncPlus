# FEATURES.md — StudySyncPlus Feature Inventory

> Snapshot of the implemented product, updated **2026-11-13** after the full Convex Backend & Real PDF Storage migration.
> Purpose: a ground-truth list of verified capabilities. Everything here is verified in code and runtime.

---

## 1. Stack & Architecture

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 19.3 + TypeScript 7 (strict) | SPA, single route, tab-based navigation via context state |
| Backend & Database | Convex 1.49 (Reactive Cloud) | All-TypeScript reactive database, mutations, queries, file storage |
| Build | Vite 8 (`tsc -b && vite build`) | GitHub Pages target, `homepage` set, `gh-pages -d dist` deploy script |
| Styling | Tailwind 3.4 + hand-authored `src/index.css` | Design tokens as CSS custom properties + `@layer components` primitives |
| State | Convex queries/mutations (data) + React Context (temporary UI state) | Realtime sync, zero polling, automatic query invalidation |
| File Storage | Convex File Storage | Real PDF uploads & downloads (50 MB cap), signed direct upload URLs, signed file preview URLs |
| Charts | Chart.js 4.6 via react-chartjs-2 5.3 | Registered once in `AnalyticsCharts.tsx`, live from Convex data |
| Icons | lucide-react 1.72 | Only icon system; no emoji in UI |
| Effects | canvas-confetti 1.9 | Palette-tuned: ink / lime / stone |
| Lint | oxlint | One fast-refresh warning (ResourceContext export) |

**File map**

```
convex/
  schema.ts                    # Semesters, subjects, resources, bookmarks, ratings, documentChunks
  validators.ts                # Resource types, view models, size caps, formatting helpers
  semesters.ts                 # Dynamic semester listing, adding, activation
  subjects.ts                  # Scheme course management, archiving, semester filtering
  resources.ts                 # Resource queries, real PDF uploads, editing, deletion, download counter
  bookmarks.ts                 # Per-owner bookmarks query and toggle
  ratings.ts                   # 1-5 peer review ratings and aggregate updates
  init.ts                      # Idempotent database seeding and reset
  seedData.ts                  # Semester III official scheme and 8 initial resources
src/
  App.tsx                      # ConvexProvider, error boundary, library tab (hero/discovery/grid), overlays
  main.tsx                     # React root
  index.css                    # world tokens, stamps, tab-rail, buttons, fields, animations
  types/index.ts               # StudyResource, SubjectOption, SchemeCourse, ActiveTab, FormErrors
  context/ResourceContext.tsx  # Centralized UI state + Convex query/mutation integration
  services/apiService.ts       # Fallback PDF generator, OpenLibrary fetch, promise/error demos
  hooks/useOverlayBehavior.ts  # ESC close, focus trap, body scroll lock, focus return
  lib/
    convexIds.ts               # Branded Convex Id adapter functions
    owner.ts                   # Anonymous stable browser owner key
    format.ts                  # File size display formatting
  components/
    Navbar.tsx  Footer.tsx  ResourceCard.tsx
    UploadModal.tsx  ResourceDetailModal.tsx  BookmarksDrawer.tsx
    AnalyticsCharts.tsx  CurriculumSchemeModal.tsx
    JsSandboxModal.tsx  SyllabusVivaModal.tsx
```

---

## 2. App Shell (all tabs)

| Feature | Where | Status |
|---|---|---|
| Sticky header: file-mark logo, wordmark, subtitle "SAKEC · Semester III Course File" | `Navbar.tsx` | Shipped |
| 5 section tabs (Library / Scheme / Analytics / Async Lab / Syllabus & Viva), active = ink stamp fill + lime base edge, `aria-current` | `Navbar.tsx`, `.tab-rail` in `index.css` | Shipped |
| Saved button with live bookmark count (tabular numerals) from Convex query | `Navbar.tsx` | Shipped |
| Upload primary CTA (lime) | `Navbar.tsx` → `UploadModal` | Shipped |
| Reset-to-seed-data control (ghost icon) restoring official dataset via Convex mutation | `Navbar.tsx` → context `resetToDefaults` | Shipped |
| Toast system: ink block, lime inset rule, 240ms slide, auto-dismiss, `aria-live`, no bounce | `App.tsx` (`Toast`), context `showToast` | Shipped |
| Footer: single strong-ruled row — brand + descriptor / team + course line | `Footer.tsx` | Shipped (Rev 2) |
| Themed browser surfaces: lime selection, ink caret, stone scrollbar, 2px ink focus frames | `index.css` | Shipped |

## 3. Tab 1 — Resource Library

| Feature | Where | Status |
|---|---|---|
| Editorial hero: display headline with lime highlighter phrase, one support sentence, ruled facts row (credits · institute · catalogued count · VERIFIED stamp with stamp-in animation) | `App.tsx` | Shipped (Rev 2) |
| Discovery band: subject index rail (dynamic subjects from Convex incl. "All"), active = lime highlighter fill, horizontally scrollable | `App.tsx` | Shipped (Rev 2) |
| Toolbar: live search (title/description/course code/tags/uploader via context), clear-search button | `App.tsx` + context `searchQuery` | Shipped |
| Resource-type filter (5 types + All) | `App.tsx` + context `selectedType` | Shipped |
| Sorting: Featured / Most downloaded / Highest rated / Newest first / Title A–Z (local state, memoized) | `App.tsx` | Shipped (Rev 2) |
| Fixed-constraint stamp "Sem 3 · PDF only" (md+) | `App.tsx` | Shipped |
| Live result count with flash-and-hold animation on change | `App.tsx` | Shipped |
| Card grid: 1/2/3 columns (mobile/tablet/desktop), `gap-x-6 gap-y-8` | `App.tsx` | Shipped (Rev 2) |
| Resource card: mono course code, title (clamp-2), subject · type, description (clamp-3), provenance footer (uploader · size · ★rating tabular), compact Download with count, bookmark toggle (lime wash when saved), delete for user uploads only | `ResourceCard.tsx` | Shipped (Rev 2) |
| Card click / Enter / Space opens detail modal | `ResourceCard.tsx` | Shipped |
| Empty state: ruled panel + recovery action ("Clear All Filters") | `App.tsx` | Shipped |
| Row click on scheme table deep-links here pre-filtered by subject | `CurriculumSchemeModal.tsx` → context | Shipped |

## 4. Overlays (shared behavior)

All overlays: ink 40% scrim, zero-radius panel, ESC closes, focus trapped and returned, body scroll locked, click-outside closes. Shared hook: `useOverlayBehavior.ts`.

| Overlay | Capabilities | Status |
|---|---|---|
| **UploadModal** | Real PDF file upload via Convex File Storage direct upload URL; subject ↔ official course-code auto-pairing; 5 resource types; title/roll/description regex + length validation; 50 MB hard cap check; handles both new uploads and editing existing uploads; palette confetti on success | Shipped |
| **ResourceDetailModal** | Full provenance grid (author/roll, size, downloads, rating), tags, Save/Share (clipboard copy), Edit action (uploader-only), Download (increments Convex counter, delivers real uploaded PDF or legacy summary fallback + confetti), In-modal PDF embedded preview link, Interactive 1–5 star peer rating widget | Shipped |
| **BookmarksDrawer** | Right sheet listing saved resources reactively synced with Convex bookmarks table, quick download, remove, opens detail, empty state | Shipped |

## 5. Tab 2 — Sem 3 Scheme & Dynamic Management

| Feature | Where | Status |
|---|---|---|
| Official SAKEC Semester III credit matrix (11 columns: SN, category, abbr, code, name, CL, LL, SL/PBL, NH, credits, action) backed by Convex `subjects` table | `CurriculumSchemeModal.tsx` | Shipped |
| Dynamic course creation form (Add Course) with credit, hours, code validation | `CurriculumSchemeModal.tsx` → `subjects.add` | Shipped |
| Course archiving toggle: soft-archive hide from library filter rail & upload picker | `CurriculumSchemeModal.tsx` → `subjects.setArchived` | Shipped |
| Row click / View Notes deep-links to filtered Library | `CurriculumSchemeModal.tsx` | Shipped |
| Totals footer row (660+60* NH, 22+2* credits), lime credit emphasis, sunk table stripes | same | Shipped |

## 6. Tab 3 — Visual Analytics

| Feature | Where | Status |
|---|---|---|
| KPI ledger strip: total resources, total downloads, avg rating (all live from Convex data), demo-data honesty label | `AnalyticsCharts.tsx` | Shipped |
| Bar chart: downloads by subject, ink bars, leading subject gets lime highlighter (scriptable context) | same | Shipped |
| Doughnut: resource-type distribution, ink/lime/stone series | same | Shipped |
| Line chart: weekly traffic trend — **synthetic demo data** (labeled as such) | same | Shipped |
| Ink tooltip blocks, mono axis labels, hairline gridlines | same | Shipped |

## 7. Tab 4 — Async & JS Lab · Tab 5 — Syllabus & Viva

| Feature | Where | Status |
|---|---|---|
| Live OpenLibrary REST fetch with latency readout and results list | `JsSandboxModal.tsx`, `apiService.searchExternalAcademicBooks` | Shipped |
| 3-stage promise-chain demo with console stream | `apiService.simulatePromiseChaining` | Shipped |
| Simulated 503 error + try/catch trap with status panel | `apiService.simulateNetworkError` | Shipped |
| Live browser localStorage inspector (refreshable), CORS explainer | `JsSandboxModal.tsx` | Shipped |
| 4 syllabus modules × CO mapping × outcomes × in-app implementation × source-file references, module rail with stamp-fill active state | `SyllabusVivaModal.tsx` | Shipped |

## 8. Tab 2 — StudySync AI (Grounded RAG Assistant)

| Feature | Where | Status |
|---|---|---|
| Tri-mode semantic retrieval (Library, Semester III, Individual PDF) | `StudySyncAiTab.tsx` → `rag.search` | Shipped |
| End-to-end vector RAG with Convex vector search (`documentChunks.by_embedding`, 1024-d) | `convex/schema.ts`, `convex/rag.ts` | Shipped |
| NVIDIA Nemotron 3.5 1024-d embeddings (`nvidia/nemotron-3.5-embed-1b`) with asymmetric passage/query projection | `convex/rag.ts` | Shipped |
| NVIDIA Nemotron 30B reasoning chat completion (`nvidia/nemotron-3.5-lightning-30b-a3b`) with strict grounding | `convex/rag.ts` | Shipped |
| Real PDF ingestion (131 pages of `DSA_MSE_Master_Study_Guide.pdf` -> 417 vector chunks with page numbers) | `scripts/ingest_test_pdf.mjs`, `rag.ingestResourcePages` | Shipped |
| Grounding provenance ledger: streamlined single-row citation chips with match percentage, collapsible excerpts, and instant page-mapped PDF viewer | `StudySyncAiTab.tsx` | Shipped |
| In-app PDF Document Viewer with exact page jumping (`#page=X`), direct tab popout, and split preview | `StudySyncAiTab.tsx` | Shipped |
| Rich Markdown rendering: tables, code blocks with copy button, syntax highlighting (`highlight.js`) | `MarkdownRenderer.tsx` | Shipped |
| Safe Mermaid diagram & flowchart rendering with automatic syntax sanitization and sizing controls | `MermaidDiagram.tsx` | Shipped |
| Persistent multi-session chat history, dedicated draft session creation, switching, and deletion | `convex/chat.ts`, `StudySyncAiTab.tsx` | Shipped |
| Suggested syllabus questions and context-aware follow-up prompt chips | `StudySyncAiTab.tsx` | Shipped |
| Direct deep-linking: "Ask AI" buttons on `ResourceCard` and `ResourceDetailModal` to jump straight to PDF chat | `ResourceCard.tsx`, `ResourceDetailModal.tsx` | Shipped |
| Edge-case guarantees: polite out-of-domain question refusal, missing-context honesty, and idempotent duplicate ingestion protection | `convex/rag.ts`, `scripts/test_rag_pipeline.mjs` | Shipped |

## 9. Backend & Storage Systems

| System | Details | Status |
|---|---|---|
| Persistence | Convex cloud database replaces localStorage for resources, subjects, semesters, bookmarks, ratings, chat threads, and chat messages | Shipped |
| File Storage | Convex File Storage for real PDFs (50 MB limit); direct two-step upload via `generateUploadUrl` + `resources.create`; preview and download via `fileUrl` / `download` | Shipped |
| Ownership Model | Stable anonymous `ownerKey` stored in localStorage; student uploaders own their creations and can edit/delete them; official seed records are protected | Shipped |
| Data Seeding | Idempotent `init.seedIfEmpty` and `init.resetToSeed`; Semester III scheme and initial resources migrated to Convex | Shipped |
| Vector Search | `documentChunks` table in `convex/schema.ts` with 1024-dimensional vector index `by_embedding` and `resourceId` / `semesterId` filtering | Shipped |
| Accessibility | Overlay focus traps, keyboard-operable cards/rows, `aria-pressed`/`aria-live`/labels, `prefers-reduced-motion` collapse, AA contrast tokens | Shipped |

---

## 10. Known Limitations (evidence-based)

1. **No authentication / login** — By explicit constraint, the platform is publicly accessible without Clerk or auth credentials. Ownership is guarded by browser-local `ownerKey`.
2. **Weekly-traffic line chart is synthetic** — Intentionally labeled as demonstration data in analytics.
3. **No client URL routing** — Single-page app with React state navigation (tabs and deep links operate in memory).
4. **500 kB bundle size warning** — Chart.js and Mermaid are bundled without dynamic code splitting.
5. **Delete uses `window.confirm`** — Browser native dialog prior to mutation execution.

---

*Verified against `npm run build` (clean), `npm run lint` (0 errors), live Convex Vector Search, NVIDIA Nemotron 1024-d embeddings, 7/7 automated RAG test suite pass, and live PDF grounding.*
