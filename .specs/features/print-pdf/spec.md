# Print PDF Specification

**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"

**Depends on**: `tailored-resumes` (merged on `main`). Addendum to its print view (RES-07). Owns: `src/admin/print.tsx`, `src/admin/print-style.ts`, `test/unit/admin/print*.test.tsx`. Does not touch `schema.ts`, `drizzle/`, `container.ts`, `app.ts` (AD-003).

## Problem Statement

The Owner prints the Master CV and each resume to PDF from `/admin/profile/print` and `/admin/resumes/:id/print`. The sister project `curriculum-ai` ships a tuned print stylesheet (`styles/print.css`, `components/print-button.tsx`, archived spec `print-export`) whose PDF output was verified there (Arial, section hierarchy, page breaks that do not split entries, selectable text). This addendum ports what improves the current print view: typography, page-break rules, colour fidelity and the on-screen print toolbar.

## Goals

- [ ] The printed page matches the reference layout of `curriculum-ai`.
- [ ] No heading is stranded and no bullet is cut by a page break.
- [ ] The Owner can get back to the editor and knows how to suppress browser headers.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Server-side PDF generation (headless Chromium) | Source has none either; the browser's "Save as PDF" is the PDF path (tailored-resumes Out of Scope); no dependency added |
| Cover letter body, `max-width: 8.5in` | No cover letter here; page size comes from `print.pageSize` |
| `@page { margin: 0 }` trick | RES-07 AC 4 fixes `@page { size: A4; margin: 16mm 18mm; }` and its test is a contract; a screen-only tip covers headers and footers |
| `h1 + p` contact line styling | The header here is a server-built `ul.contact` from Personal Info; styled directly |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| PDF generation | Browser print dialog only, no new dependency | Source also has no server-side PDF; owner asked for CSS print plus `window.print` | y (default, orchestrator) |
| Body font | Arial, Helvetica, sans-serif, replacing Georgia | The reference PDF in the source is Arial; a system font, ATS-safe | y (default, orchestrator) |
| `@page` margin | Keep `16mm 18mm` | RES-07 AC 4 and its test are binding | y (default, orchestrator) |
| Justified text | Paragraphs and list items justified with `hyphens: auto`, headings left | Same as the source layout | y (default, orchestrator) |
| Back link target | `/admin/resumes/:id` for a resume, `/admin/profile` for the Master CV, prefixed by `basePath` | Existing admin routes | y (default, orchestrator) |

**Open questions:** none.

---

## User Stories

### P1: The printed page matches the reference layout ⭐ MVP

**User Story**: As the Owner, I want the PDF to look like my reference resume so that I can send it as is.

**Why P1**: The PDF is the product's output.

**Acceptance Criteria**:

1. PDF-01: WHEN a print view is rendered THEN the stylesheet SHALL set the body font to Arial at 10pt with line height 1.35 and black text.
2. PDF-02: WHEN a print view is rendered THEN the name `h1` SHALL be 22pt bold centred in `#2c3e50`, and the contact list SHALL be centred in `#555555`.
3. PDF-03: WHEN a print view is rendered THEN `h2` SHALL be 12pt bold uppercase in `#2c3e50` and `h3` 12pt bold black, both left aligned, and a paragraph directly after an `h3` SHALL be italic `#7f8c8d`.
4. PDF-04: WHEN a print view is rendered THEN the page rule SHALL remain `@page { size: A4; margin: 16mm 18mm; }`, with Letter under the override.

**Independent Test**: Open `/admin/resumes/:id/print` and compare with the reference PDF.

### P1: Page breaks keep entries together ⭐ MVP

**User Story**: As the Owner, I want no heading stranded at the bottom of a page and no bullet or paragraph cut in two.

**Why P1**: A split entry fails in front of a recruiter.

**Acceptance Criteria**:

1. PDF-05: WHEN printing THEN every heading SHALL carry `break-after: avoid`, and a paragraph after an `h3` SHALL carry `break-before: avoid`.
2. PDF-06: WHEN printing THEN paragraphs, list items, lists, quotes, code blocks, tables and images SHALL carry `break-inside: avoid`, and paragraphs SHALL carry `orphans: 3` and `widows: 3`.
3. PDF-07: WHEN printing THEN the page SHALL carry `print-color-adjust: exact` so heading colours survive.

**Independent Test**: Print a two-page resume and check that no entry is split.

### P2: On-screen toolbar

**User Story**: As the Owner, I want a way back and a hint about browser headers.

**Why P2**: A courtesy; the back button works.

**Acceptance Criteria**:

1. PDF-08: WHEN a resume print view renders on screen THEN it SHALL offer a link back to `/admin/resumes/:id`, and the Master CV print view a link to `/admin/profile`, each prefixed by `basePath`.
2. PDF-09: WHEN a print view renders on screen THEN it SHALL show a tip to turn off "Headers and footers" in the browser print dialog.
3. PDF-10: WHEN printing THEN the link and the tip SHALL be hidden through `.screen-only`.

**Independent Test**: Open the page and click the link back; print and confirm both are absent.

---

## Non-regression

Personal Info values appear only in the print view and never reach an LLM; the body stays sanitized markdown; no inline script (CSP `script-src 'self'`, script served from `/admin/print/print.js`); the tests in `test/unit/admin/print.test.tsx` and `test/integration/routes/resumes.test.ts` pass unchanged.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PDF-01 | P1: matches the reference layout | Execute | Pending |
| PDF-02 | P1: matches the reference layout | Execute | Pending |
| PDF-03 | P1: matches the reference layout | Execute | Pending |
| PDF-04 | P1: matches the reference layout | Execute | Pending |
| PDF-05 | P1: page breaks | Execute | Pending |
| PDF-06 | P1: page breaks | Execute | Pending |
| PDF-07 | P1: page breaks | Execute | Pending |
| PDF-08 | P2: toolbar | Execute | Pending |
| PDF-09 | P2: toolbar | Execute | Pending |
| PDF-10 | P2: toolbar | Execute | Pending |
