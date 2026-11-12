# FEATURES.md — StudySyncPlus Feature Inventory

> Snapshot of the implemented product, captured **2026-11-13** after the Revision 2 (editorial refinement) redesign.
> Purpose: a ground-truth list to plan the next patch against. Everything here is verified in code and runtime — nothing aspirational. Patch ideas are quarantined in §8.

---

## 1. Stack & Architecture

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 19.3 + TypeScript 7 (strict) | SPA, single route, tab-based navigation via context state |
| Build | Vite 8 (`tsc -b && vite build`) | GitHub Pages target, `homepage` set, `gh-pages -d dist` deploy script |
| Styling | Tailwind 3.4 + hand-authored `src/index.css` | Design tokens as CSS custom properties + `@layer components` primitives |
| State | React Context (`ResourceContext`) + `localStorage` | No external state library, no router |
| Charts | Chart.js 4.6 via react-chartjs-2 5.3 | Registered once in `AnalyticsCharts.tsx` |
| Icons | lucide-react 1.72 | Only icon system; no emoji in UI |
| Effects | canvas-confetti 1.9 | Palette-tuned: ink / lime / stone |
| Lint | oxlint | One pre-existing fast-refresh warning (ResourceContext) |

**File map**

```
src/
  App.tsx                      # shell, library tab (hero/discovery/grid), Toast, overlay mounting
  main.tsx                     # React root
  index.css                    # world tokens, stamps, tab-rail, buttons, fields, animations
  types/index.ts               # StudyResource, UserProfile, ActiveTab, enums, FormErrors
  context/ResourceContext.tsx  # all app state + persistence + toasts
  data/initialResources.ts     # 8 seeded resources + OFFICIAL_SEMESTER_3_SCHEME
  services/apiService.ts       # PDF generator, OpenLibrary fetch, promise/error demos
  hooks/useOverlayBehavior.ts  # ESC close, focus trap, body scroll lock, focus return
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
| Saved button with live bookmark count (tabular numerals) | `Navbar.tsx` | Shipped |
| Upload primary CTA (lime) | `Navbar.tsx` → `UploadModal` | Shipped |
| Reset-to-seed-data control (ghost icon) | `Navbar.tsx` → context `resetToDefaults` | Shipped |
| Toast system: ink block, lime inset rule, 240ms slide, auto-dismiss, `aria-live`, no bounce | `App.tsx` (`Toast`), context `showToast` | Shipped |
| Footer: single strong-ruled row — brand + descriptor / team + course line | `Footer.tsx` | Shipped (Rev 2) |
| Themed browser surfaces: lime selection, ink caret, stone scrollbar, 2px ink focus frames | `index.css` | Shipped |

## 3. Tab 1 — Resource Library

| Feature | Where | Status |
|---|---|---|
| Editorial hero: display headline with lime highlighter phrase, one support sentence, ruled facts row (credits · institute · catalogued count · VERIFIED stamp with stamp-in animation) | `App.tsx` | Shipped (Rev 2) |
| Discovery band: subject index rail (9 subjects incl. "All"), active = lime highlighter fill, horizontally scrollable, hidden themed scrollbar | `App.tsx` | Shipped (Rev 2) |
| Toolbar: live search (title/description/course code/tags/uploader via context), clear-search button | `App.tsx` + context `searchQuery` | Shipped |
| Resource-type filter (5 types + All) | `App.tsx` + context `selectedType` | Shipped |
| Sorting: Featured / Most downloaded / Highest rated / Newest first / Title A–Z (local state, memoized) | `App.tsx` | Shipped (Rev 2, new) |
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
| **UploadModal** | Subject ↔ official course-code auto-pairing (8 subjects), 5 resource types, title/roll/size/description regex + length validation with inline recovery messages, `aria-invalid`/`aria-describedby`, size cap 50 MB, tag parsing, persists to localStorage, fires palette confetti on success | Shipped |
| **ResourceDetailModal** | Full provenance grid (author/roll, size, downloads, rating), tags, Save/Share (clipboard copy), Download (PDF + counter + confetti) | Shipped |
| **BookmarksDrawer** | Right sheet listing saved resources, quick download, remove, opens detail, empty state, localStorage note | Shipped |

## 5. Tab 2 — Sem 3 Scheme

| Feature | Where | Status |
|---|---|---|
| Official SAKEC Semester III credit matrix (11 columns: SN, category, abbr, code, name, CL, LL, SL/PBL, NH, credits, action) | `CurriculumSchemeModal.tsx` + `OFFICIAL_SEMESTER_3_SCHEME` | Shipped |
| Row click / View Notes deep-links to filtered Library | `CurriculumSchemeModal.tsx` | Shipped |
| Totals footer row (660+60* NH, 22+2* credits), lime credit emphasis, sunk table stripes | same | Shipped |

## 6. Tab 3 — Visual Analytics

| Feature | Where | Status |
|---|---|---|
| KPI ledger strip: total resources, total downloads, avg rating (all live from state), demo-data honesty label | `AnalyticsCharts.tsx` | Shipped |
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
| localStorage inspector (keys + sizes, refreshable), CORS explainer | `JsSandboxModal.tsx` | Shipped |
| 4 syllabus modules × CO mapping × outcomes × in-app implementation × source-file references, module rail with stamp-fill active state | `SyllabusVivaModal.tsx` | Shipped |

## 8. Cross-Cutting Systems

| System | Details | Status |
|---|---|---|
| Persistence | `studysyncplus_resources_v3` + `studysyncplus_user_profile_v3`; auto-sync on change; JSON-parse guards with console errors; reset restores seed | Shipped |
| PDF generation | Client-side Blob summary document per resource (not the actual notes file) | Shipped |
| Download counter | Per-resource, increments on download, feeds analytics | Shipped |
| Design system | `DESIGN.md` Rev 2 (Course File world, paper/ink/lime) + `.impeccable/design.json` sidecar; mechanical detector: 0 findings | Shipped |
| Accessibility | Overlay focus traps, keyboard-operable cards/rows, `aria-pressed`/`aria-live`/labels, `prefers-reduced-motion` collapse, AA contrast tokens | Shipped |

**Data model:** `StudyResource` (id, courseCode, title, subject, semester=3, type, uploadedBy, rollNumber, uploadDate, fileSize, downloadCount, rating 1–5, fileFormat 'PDF', description, tags[], externalUrl?, isUserUploaded?) · `UserProfile` (name, rollNumber, studentId, semester, branch, college, savedResourceIds[], studyStreakDays) · 8 seeded resources `res-001…res-008`.

---

## 9. Known Limitations (evidence-based)

1. **No URL routing** — tabs/filters live in context state only; deep links work in-app (scheme → library) but aren't shareable/bookmarkable URLs.
2. **No real file storage** — uploads are metadata records; downloads generate a summary PDF, not the uploaded file. `externalUrl` field exists but is never populated by the UI.
3. **Weekly-traffic line chart is synthetic** — intentionally labeled demo data.
4. **500 kB bundle warning** — Chart.js is imported eagerly; no code splitting.
5. **Delete uses `window.confirm`** — native dialog, not the in-world modal system.
6. **No edit path** for uploaded resources (create + delete only).
7. **Sort/filter/search state is session-local** — not persisted, resets on reload.
8. **No data schema migration** — storage keys are versioned by suffix (`_v3`); no migration routine between versions.
9. **Student credits / profile are hard-coded defaults** — no profile editing UI.
10. Pre-existing oxlint fast-refresh warning in `ResourceContext.tsx` (export shape, not a bug).

## 10. Patch Candidates (ideas for planning — not implemented)

Low effort / high polish:
- Replace `window.confirm` with an in-world confirm modal (reuse overlay hook).
- Persist sort + type + subject selection (e.g., into the profile record).
- Code-split Chart.js (`React.lazy`) to kill the 500 kB chunk warning.

Medium:
- URL routing or hash-sync for tabs + filters (shareable filtered views; complements the existing scheme deep-link).
- Edit flow for user-uploaded resources.
- Real file attach: store small PDFs as Blob URLs / IndexedDB, or wire `externalUrl` to a Drive/Repo link field in the upload form.
- Export/import library JSON (backup + share between students).

Larger:
- Real backend or GitHub-API-backed store so resources sync between students.
- Actual past-paper file hosting with preview (first page thumbnail).
- Search upgrade: debounce, match highlighting, tag chips as clickable filters.

---

*Verified against `npm run build` (clean), `npm run lint` (one pre-existing warning), impeccable detector (0 findings), and live captures at 1440/834/390 on the dev server.*
