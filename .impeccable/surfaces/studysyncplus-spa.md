---
version: 1
slug: "studysyncplus-spa"
primary_target: "StudySyncPlus SPA"
related_targets: []
---

# Surface brief — StudySyncPlus SPA (all tabs + overlays)

## Scope and visitor mode
The entire single-page app (5 tabs, upload/detail/bookmark overlays). Mode: Operate — the visitor finds, filters, saves, and downloads Semester 3 study resources fast.

## Audience, job, action, proof, constraints
SAKEC Sem-3 Computer Engineering students, before internal exams, laptop + phone. Job: locate the verified PDF for a specific course in under a minute, then trust it. Proof: course-code stamps, uploader + roll, download counts, verification marks. Constraints: all features/data preserved; user-pinned palette (white ground, near-black ink, lime single accent); React 19 + Tailwind; GitHub Pages static deploy.

## Chosen direction — COURSE FILE (user pick, seed 7312545f)
Official course-file jacket world: stamped cover sheet, ruled form fields, form-dense provenance blocks. Shell stays standard app UI (tab nav, inputs, selects, cards); world enters via type (Archivo display + JetBrains Mono data), palette (paper/ink/lime), density (form-dense with margin relief), and one signature move (the ink stamp: verified/active states as solid ink marks with lime accents, focus as corner brackets). Craft disciplines carried: true 1px hairlines, zero radius, tabular numerals, flash-and-hold count changes, accent restraint, damped single-axis motion.

## Memorable moment
The stamped VERIFIED cover-sheet block in the library hero — the product's trust system made physical.

## Direction contract
THESIS: The official course file is the interface: provenance you can read like a stamped form, refusing the pasted gradient-card category default.
OWN-WORLD: Paper-white ground, iron-black ink, hairline rules, form-dense ruled blocks, lime as the single live accent; stamped rectangular marks, zero radius everywhere; Archivo display against tracked mono labels.
STORY: "This hub is the department's official file for my semester — every PDF carries its course code and a stamped provenance, so I trust it and find it fast."
FIRST VIEWPORT: Top tab nav (active = ink stamp fill); cover-sheet hero — tracked mono kicker, large display headline, description, ruled search field + lime primary CTA; stamped VERIFIED metadata block at right; ruled subject index strip; filter row with tabular result count; resource cards as white ruled tiles with mono code stamps.
FORM: Direction chosen by user from the dealt hand (pick card; seed 7312545f; code-first build; no comp).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions
Exact lime token values pending contrast check in DESIGN.md; chart series mapping (ink/lime/grays) fixed at build; confetti kept but tuned to ink+lime palette.

## Revision 2 — editorial refinement (2026-11-13)
User-directed refinement of the same world (palette and Course File identity unchanged; FORM stands). Composition contract updates: hero unboxed to headline + one sentence + ruled facts row (no CTAs — search moved into discovery band, upload stays in nav); subject rail + search + type + NEW sort + live count unified into one ruled discovery band (active subject = lime highlighter fill); cards stripped to code / title / subject·type / description / provenance-footer with compact download (no stamp cluster, no tag chips); footer reduced to one strong-ruled row. Grid caps at 3 columns with `gap-x-6 gap-y-8`. Verified: build clean, detector 0 findings, no JS errors, sort reorders live.

## Revision 3 — subject-centric re-architecture (2026-11-13)
Same Course File world (paper/ink/lime, Archivo + JetBrains Mono, stamps/rules, zero radius) — new information architecture. The five-tab shell is retired. Two primary destinations: **Subjects home** (hero → subject grid, each subject a ruled row/tile with material counts and open action; no dashboard stats) and **Study Assistant** (one unified chat, context auto-determined). Inside a subject (hybrid shell per user decision): global top bar (identity, search, primary upload, assistant, overflow menu) + left subject rail for switching between subjects. A subject page integrates everything progressive: resource list grouped by kind (Notes / Papers / Slides / Assignments…), syllabus outline, scheme row, viva mapping — via tabs or progressive sections, not wall-of-cards. Upload is one bulk flow: drop many files, common metadata once, per-file title edits, per-file ingest status (pending→processing→ready/failed with retry), ZIP bulk download. Chat exposes no retrieval modes: context follows the current view (resource → subject → library) with a small context switcher; citations render as Page/Slide chips linking to the source document. Secondary features demoted per user decision: Analytics + Async Lab live in the top-bar overflow; Syllabus-Viva and Curriculum Scheme become integrated subject/home innards. Mobile: bottom bar replaces rail.
