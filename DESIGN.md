---
name: StudySyncPlus
description: Semester III course-file resource hub — paper, ink, and one highlighter accent.
colors:
  paper: "#ffffff"
  paper-sunk: "#f7f7f5"
  ink: "#111111"
  ink-2: "#57534e"
  ink-3: "#78716c"
  rule: "#e7e5e4"
  lime: "#a3e635"
  lime-hover: "#8bc922"
  lime-deep: "#65a30d"
  lime-text: "#365314"
  lime-wash: "#f4fce4"
  lime-deep: "#65a30d"
  chart-2: "#78716c"
  chart-3: "#d6d3d1"
  alert: "#b91c1c"
typography:
  base:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5.5vw, 3.75rem)"
    fontWeight: 900
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
  micro:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  none: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xl2: "48px"
  xl3: "64px"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "36px"
  field:
    backgroundColor: "{colors.paper-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
---

# DESIGN.md — StudySyncPlus Visual Contract

> World: **COURSE FILE** — the official department course-file jacket, stamped and ruled.
> Mode: **Operate**. Palette pinned by the user: **white ground · near-black ink · lime, the single live accent.**
> This file is the contract the build satisfies. It is re-verified against the built site at finish.
> **Revision 2 (editorial refinement):** unboxed hero, one discovery band, calmer card anatomy, slim footer — see §6.

---

## 1. Identity

A StudySyncPlus page reads like the college's official course file for Semester III: paper-white ground, iron-black ink, hairline rules, form-dense provenance blocks, and stamped marks that carry trust (course codes, verification, counts). No gradients, no glass, no glow, no rounded softness. The shell is standard app UI — the world enters only through **type, palette, density, and one signature move (the stamp)**. **Editorial composition:** the page ground is generous whitespace; density lives *inside* ruled containers, never loose on the page. An unboxed hero, one coherent discovery band, and a calm card grid replace dashboard-style boxed sections.

**Banned outright (anti-reference):** dual-tone clay shadows, gradient text, gradient fills, glass/blur decoration, rounded pill clusters, pastel multi-color chips, emoji in UI copy, kickers/eyebrows above headings, hard offset shadows, colored border-left accents, icons+heading+text card scaffolds.

## 2. Color tokens

| Token | Value | Use |
|---|---|---|
| `--paper` | `#ffffff` | Page ground, card faces |
| `--paper-sunk` | `#f7f7f5` | Form fields, sunk wells, table stripes |
| `--ink` | `#111111` | Primary text, primary fills, rules-strong |
| `--ink-2` | `#57534e` | Secondary text (7.4:1 on white) |
| `--ink-3` | `#78716c` | Tertiary/meta text (4.7:1) |
| `--rule` | `#e7e5e4` | Hairlines, dividers (always 1px) |
| `--lime` | `#a3e635` | Primary action fill, active marks, lead data series, verified stamps |
| `--lime-hover` | `#8bc922` | Primary action hover lift |
| `--lime-deep` | `#65a30d` | Primary action pressed state, lime icons/accents on white |
| `--lime-text` | `#365314` | Lime-colored *text* on white (AA) |
| `--lime-wash` | `#f4fce4` | Lime tint ground for selected/verified rows |
| `--alert` | `#b91c1c` | Errors only |
| `--chart-2` | `#78716c` | Chart series 2 |
| `--chart-3` | `#d6d3d1` | Chart series 3 |

Rules:
- Lime does real jobs only: primary CTA fill (ink text on lime, ≥10:1), active tab edge, verified stamp marks, chart lead series. Never decoration, never scattered. Roughly ≤4 lime instances visible per viewport region.
- Text on lime surfaces is `--ink`; secondary text on tinted surfaces tints from the hue, never gray.
- Selection: lime background, ink text. Caret: ink. Scrollbar: stone thumb, white track, 1px hairline border.
- Dark surfaces (console blocks, toast): `#111111` ground, paper text, lime for live/success accents.

## 3. Typography

- **Face:** Archivo (Google Fonts, 400–900, variable width for display) — display + UI. **JetBrains Mono (400/500/700)** — data only: course codes, sizes, roll numbers, counters, console output, storage keys. Never mono as costume.
- **Scale:** display `clamp(2.6rem, 5.5vw, 4.25rem)` / 900 / `-0.03em tracking`, max 6rem; H2 section `1.375rem/800`; card title `1.0625rem/700`; body `0.875–1rem/450` at 65–75ch measure; UI label `0.75rem/600` sentence case; data label `0.6875rem/600 tracked` uppercase only in mono data contexts; micro data label `0.625rem/600–700 tracked` for stamps, chips, and chip counts (JetBrains Mono contexts only).
- Hierarchy steps are obvious: weight or size, never color gradient. Numerals in data contexts: `font-variant-numeric: tabular-nums`.
- **No kicker/eyebrow above any heading.** Headings carry their own weight; metadata lives in the stamped blocks or ruled rows beside/below.

## 4. Space, rules, geometry

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. More space above a heading than below it. Tight groups inside cards, generous separation between sections.
- **Page rhythm (library):** main `pt-10 sm:pt-14`; hero → discovery band `mt-12 sm:mt-14`; discovery → grid `mt-8`; grid `gap-x-6 gap-y-8`, max 3 columns at `lg` (wider cards, less truncation); content → footer `mt-20`.
- **Zero border-radius everywhere.** Rectangles only.
- **Rules are true 1px** (`--rule`), horizontal/vertical only (right angles; no diagonals). Strong rules (`--ink`) demote section boundaries.
- No shadows on flat UI. The only permitted shadow is overlay elevation: `0 24px 64px rgba(17,17,17,0.18)` (offset + blur, never a zero-offset halo).

## 5. Signature move — the stamp

States are printed marks:
- **Rest:** hairline border, paper face.
- **Active/selected:** solid ink fill (paper text) with a 2px lime base-edge — the active nav tab, the selected subject, the verified badge.
- **Primary action:** lime fill, ink text; hover lifts to `#8bc922`; active presses to flat `#65a30d`.
- **Focus-visible:** 2px ink outline frame, offset 2px; on ink-filled elements the frame is lime.
- **Disabled:** struck — dimmed 40% + `line-through` on the label? No: dimmed only, cursor not-allowed.
- **Verified stamp:** rectangular ink block, paper text `VERIFIED`, 2px lime inner keyline, `letter-spacing: 0.08em`.
- One authored motion moment: the **stamp-in** — a mark appearing (scale 0.96→1 + opacity 0→1, 160ms, `cubic-bezier(0.22,1,0.36,1)`). All other motion is damped single-axis (fade/rise ≤12px, 240ms), exponential ease-out, no bounce/overshoot. `prefers-reduced-motion` collapses to opacity only.

## 6. Component language

- **Nav:** white bar, 1px bottom rule. Brand: ink-square file mark (lime index bar) + "StudySyncPlus" 800 + one-line subtitle "SAKEC · Semester III Course File" (11px, no stamp). Tabs: text buttons, active = ink fill stamp. Actions right: Saved (count, tabular), Upload (lime primary), Reset (ghost icon).
- **Library hero (editorial, unboxed):** display headline with exactly one lime highlighter phrase; one supporting sentence (≤2 lines at 58ch); one ruled facts row — credits · institute · catalogued count (tabular) · VERIFIED stamp — with `sm:`-gated hairline separators (stack border-free on mobile). **No hero CTAs:** search lives in the discovery band; upload lives in the nav.
- **Discovery band (one ruled container, two rows):** row 1 = subject index rail — text buttons `px-4 py-3`, active = lime highlighter fill (ink text), inactive ink-2 with sunk hover, horizontally scrollable with themed hidden scrollbar; row 2 = toolbar — search field (flex, min 220px), type select, sort select (Featured / Most downloaded / Highest rated / Newest first / Title A–Z), "Sem 3 · PDF only" stamp (`md+`), live count `ml-auto` with flash re-mount.
- **Resource card:** white face, 1px rule, `p-6`, zero radius; anatomy top→down: mono course-code line (11px tracked) + bookmark/delete icons · title 700 `17px` clamp-2 · subject **·** type line (11px) · description 13px clamp-3 · `flex-1` spacer · hairline footer: uploader · size · ★rating (tabular) left, compact Download button (secondary, count in plain mono) right. **No stamps cluster, no tag chips, no full-width button** — the "Sem 3" and "PDF" stamps are omitted as redundant (Sem-3-only hub; format lives in filter + detail).
- **Buttons:** rectangular; primary (lime/ink), secondary (hairline border, ink text, hover ink fill/paper text), ghost (no border). All 8px×12px padding, min-height 36px.
- **Inputs:** sunk `--paper-sunk` field, 1px `--rule` border, ink text; focus = ink border + corner brackets; error = `--alert` border + message naming problem and recovery.
- **Selects:** native `<select>`, same field treatment.
- **Resource card:** white face, 1px rule; header row = mono course-code stamp + PDF tag (mono); title 700; provenance rows (uploader/roll · size · downloads · rating) with tabular numerals; actions row separated by hairline: Download (secondary → ink fill hover), bookmark toggle, delete for user uploads. No nested cards.
- **Discovery band:** replaces the separate subject strip + filter bar (see entry above).
- **Scheme table:** ruled table, header row ink-strong rule, tabular numerals, lime credits column emphasis via `--lime-text`, row hover `--lime-wash`, footer totals row on sunk ground.
- **Charts:** ruled panel, title row; series = ink (lead lime), mono axis labels, gridlines `--rule`; tooltips ink block.
- **Console blocks:** ink ground, paper text, lime for success lines, mono.
- **Overlays:** ink scrim 40%, panel white, 1px rule, elevation shadow, ESC closes, focus trapped, background scroll locked; header row with close; footer actions right-aligned.
- **Drawer:** right sheet, white, 1px left rule, same treatment.
- **Toast:** ink block bottom-right, paper text, lime left inset rule (1px), enter/exit slide 240ms, auto-dismiss 3.5s, no bounce, icon drawn (lucide).
- **Footer:** strong top rule, single row: file mark + wordmark + "Semester III course file · SAKEC" (11px) left; team + course one-liner right. No columns, no blurb, no stamps. Correct stack copy (React 19) lives in the syllabus tab, not the footer.

## 7. Accessibility floor

Body/placeholder ≥4.5:1, large ≥3:1. Keyboard: everything reachable; overlays trap focus, close on ESC, return focus to opener. Visible focus = 2px ink frame everywhere (lime frame on ink fills). `aria-live` on toast. Icon buttons carry `aria-label`/title. Motion respects `prefers-reduced-motion`.

## 8. Defect standards (must-fix from audit)

1. `animate-fadeIn` and every custom animation **defined** in CSS; no dead classes.
2. `no-scrollbar` defined and themed.
3. Toast: authored enter/exit, no `animate-bounce`.
4. All overlays: ESC + focus trap + body scroll lock.
5. `src/App.css` deleted (unused template leftover).
6. No emoji in UI strings; confetti re-tuned to ink/lime/stone palette.
7. Copy drift fixed: "React 19" in footer/syllabus copy.
8. Charts read from live state; series colors from token palette.
9. Empty/loading/error/disabled states styled in-world (empty search result = ruled empty state with recovery action).

## 9. Finish condition

Contrast, spacing, type-measure, states, browser surfaces (selection/caret/scrollbar/focus/numerals), copy, and coverage verified on the built site at desktop 1440 + mobile 390; mechanical detector clean; finish-review verdict recorded; DESIGN.md re-verified against the built world by the documenter.
