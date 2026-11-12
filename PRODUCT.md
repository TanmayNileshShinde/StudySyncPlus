# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Semester III Computer Engineering students at Shah & Anchor Kutchhi Engineering College (SAKEC), Mumbai. Primary scene: between classes and in the days before internal exams, on laptops and phones, hunting for verified lecture notes, past papers, and lab manuals mapped to specific Sem-3 course codes. Secondary audience: course evaluators (faculty) reviewing the CO1–CO6 syllabus mapping, and the two student authors presenting the work.

## Product Purpose

A peer resource-sharing hub: students browse, filter, and download Semester 3 study PDFs; upload their own; save bookmarks for revision; inspect the official 22-credit scheme; view engagement analytics; and study the syllabus→code mapping used for viva. Success means a student finds the right verified PDF for their course in under a minute.

## Positioning

The only hub tailored to SAKEC's official Semester III (Level 4.5 UG Certificate, 22+2* credits) scheme: resources carry official course codes (CMLOR2VS201, CMCOR2PC202…), the scheme table deep-links into a pre-filtered library, and every tab doubles as live course-outcome evidence for the Web Computing & Modern Frameworks course.

## Operating Context

SPA deployed on GitHub Pages (static build). All state is client-side: `localStorage` persists resources + user profile; a reset control restores seeded syllabus data. Charts via Chart.js. Resource "downloads" generate a PDF client-side via Blob. Navigation is single-page tabs: Library, Sem 3 Scheme, Visual Analytics, Async & JS Lab, Syllabus & Viva — plus upload modal, resource detail modal, and bookmarks drawer.

## Capabilities and Constraints

- Library: live search (title/description/course code/tags/uploader), subject pills, resource-type dropdown, count display; strictly Semester 3 + PDF format.
- Upload form with real-time regex validation (title 6–95 chars, roll-number pattern `126BTCM2008`, file size ≤ 50 MB); uploads persist in localStorage; subject↔course-code auto-pairing.
- Downloads increment a per-resource counter, generate a client-side PDF, and fire confetti.
- Scheme table rows and "View Notes" actions deep-link to a pre-filtered library tab.
- Analytics aggregates live from state (downloads by subject, type distribution, weekly trend, KPIs).
- Async Lab performs a real OpenLibrary REST fetch with fallback, promise-chain demo, 503 error simulator, localStorage inspector, CORS explainer.
- Syllabus & Viva: 4 modules × outcomes × in-app implementation + source-file references.
- Must keep: all features and data flows, SAKEC attribution, student credits (Tanmay Shinde, Roll 67 / Aditya Shah, Roll 68).

## Brand Commitments

Name: **StudySyncPlus** (wordmark stays). College: Shah & Anchor Kutchhi Engineering College. Course: Web Computing & Modern Frameworks. **User-pinned palette (binding):** white ground, near-black ink, lime-green as the single accent — a fixed, color-theory-sound scheme replacing the incumbent claymorphic pastels. Full token decisions live in DESIGN.md.

## Evidence on Hand

12 seeded realistic resources (`src/data/initialResources.ts`), official Semester III scheme table, README with team table and course mapping. No real photography or generated imagery; the "Student Reach 1,240+" KPI and weekly traffic line are synthetic demo data and must not be presented as measured fact.

## Product Principles

1. Find fast — scanning, filtering, and search beat browsing; every path should land on the right PDF quickly.
2. Provenance builds trust — course codes, uploader identity, and verification badges are the core trust system.
3. Real product feel — clean, deliberate, color-theory-sound; no dead classes, no gradient soup, no broken states.
4. Course evidence — every tab keeps its CO-mapping purpose intact for evaluation.

## Accessibility & Inclusion

WCAG AA contrast targets for all text; lime pairings on white and on black must pass 4.5:1 where used for text. Overlays close on Escape and lock background scroll; controls keyboard-reachable; visible focus states.
