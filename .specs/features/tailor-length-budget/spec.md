# Tailor Length Budget Specification

**Approved**: 2026-11-28 - user: "Approve"

## Problem Statement

Tailored resumes come out nearly as long as the Career Library. A dev DB sample kept 9 of 9 experiences and 40 of 43 bullets, 33 of them copied word for word, with 12,038 of 12,697 experience characters (95%), although the Custom Instructions said "keep at maximum 2 pdf pages". The tailor prompt pushes toward keeping everything and gives no number, `TailorOutputSchema` sets no bullet maximum, "2 pages" is not measurable for the model, and `assemble.ts` accepts every bullet the model returns.

## Goals

- [ ] A tailored resume's estimated printed length is at most its target pages whenever the minimum resume (every role, zero bullets) fits.
- [ ] The Owner sets the target pages per resume (1, 2 or 3) and sees the estimate against it in the editor.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Forcing the model to reword bullets | User (Q4): copying bullets verbatim is acceptable; forced rewriting raises the risk of invented facts. |
| Dropping a role to save space | User (Q3): "never drop a role" stays; a role may keep zero bullets. |
| Parsing page limits out of Custom Instructions | User (Q2): Custom Instructions stay for tone and emphasis; length is the structured field. |
| Re-trimming a stored resume when its target pages change | The new target applies at the next generation; editing a target never rewrites a document. |
| Exact pagination of the printed PDF | The estimate is a character-based approximation, calibrated once. |
| The print templates of `feat/print-template` | Not on this branch; the constant is measured on this branch's print view and re-measured if that view changes. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Numeric budget, enforced in code | Code computes the budget, passes it to the model as numbers, and cuts the least relevant bullets after the reply | User Q1: "Yes, all" | y |
| Chars per page | Measured once by rendering this branch's print view at A4 in a browser and dividing printed characters by printed pages; stored as a code constant; Letter scaled by printable area | User: "Measure, then constant" | y |
| What counts | Everything printed: headline, summary, every item's title line, meta line, text, bullets, skills and level, plus a fixed allowance for the Personal Header | User: "Everything" | y |
| Bullet curve | Roles ranked by recency (current first, then latest end date); weights 1, 0.8, 0.6, 0.4, 0.2, then 0; a role's cap = its weight share of the experience bullet budget divided by the library's mean bullet length, floored, and never above its library bullet count | User: "Budget-weighted" | y |
| Editor | Target pages selector (1/2/3) and an estimate such as "~2.3 of 2 pages", with a warning when over | User: "Estimate + target" | y |
| Minimum over target | The resume is saved with the cuts made and the editor warns it is over target | User: "Generate + warn" | y |
| Migration ordering | The `target_pages` column is its own migration commit on this branch; the user lands it on `main` before any other schema branch | User: "Own task, flag it" | y |
| Default for new and existing resumes | New resumes take Settings `print.targetPages` (default 2); the migration sets existing rows to 2 | Mirrors `print.pageSize`; existing rows need a value | y |
| Cut order after the reply | First trim each experience to its cap (dropping its last bullets, which the model orders most relevant first); while still over, drop the last bullet of project items, then of experiences from oldest to newest | Projects are optional content; older roles matter less | y |
| Mean bullet length when the library has no bullets | 120 characters | Avoids division by zero; no bullets means no caps matter | y |
| Where the numbers reach the model | The tailor input states the target pages and each experience's bullet cap by its item id (e.g. "c3: at most 2 bullets"); the prompt says to keep within those caps | Input is per call; the system prompt stays the Owner's text | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Tailored resume fits the target ⭐ MVP

**User Story**: As the Owner, I want a tailored resume cut to its target pages so that it prints at the length I asked for.

**Why P1**: It is the reported defect.

**Acceptance Criteria**:

1. WHEN a resume is generated THEN the tailor input SHALL state the resume's target pages and, for each experience item, its bullet cap by item id.  <!-- event-driven -->
2. WHEN bullet caps are computed THEN the system SHALL rank experiences by recency (current first, then latest end year and month) and give them weights 1, 0.8, 0.6, 0.4, 0.2 and 0 for the sixth and older.  <!-- event-driven -->
3. The system SHALL never give an experience a bullet cap above its Career Library bullet count.  <!-- ubiquitous -->
4. WHEN the model returns more bullets for an experience than its cap THEN the assembly SHALL keep only the first cap bullets.  <!-- event-driven -->
5. IF the assembled resume's estimate exceeds its target pages after the caps THEN the assembly SHALL drop the last bullet of project items, then of experiences from oldest to newest, one at a time, until the estimate fits or no such bullet remains.  <!-- unwanted-behavior -->
6. The assembly SHALL keep every experience, whatever the budget, with zero bullets at the least.  <!-- ubiquitous -->
7. IF the estimate exceeds the target pages with no bullets left to drop THEN the system SHALL save the resume anyway.  <!-- unwanted-behavior -->

**Independent Test**: Generate from a library with 9 roles and 43 bullets at target 2 using the mock model returning every bullet; the stored document's estimate is at most 2 pages and its newest role keeps more bullets than its oldest.

---

### P2: Target pages per resume

**User Story**: As the Owner, I want to choose 1, 2 or 3 target pages per resume, with a default in Settings, so that each application gets the length it needs.

**Why P2**: The budget needs a target; a sensible default covers most resumes.

**Acceptance Criteria**:

1. WHEN a resume is created THEN the system SHALL set its target pages to Settings `print.targetPages`, or 2 when that key is unset.  <!-- event-driven -->
2. WHEN the Owner saves a target pages value of 1, 2 or 3 for a resume THEN the system SHALL store it and use it at the next generation.  <!-- event-driven -->
3. IF a target pages value outside 1, 2 and 3 is submitted, for a resume or for `print.targetPages` THEN the system SHALL reject it with a validation error and keep the stored value.  <!-- unwanted-behavior -->
4. WHEN the migration runs THEN existing resumes SHALL get target pages 2.  <!-- event-driven -->

**Independent Test**: Set `print.targetPages` to 1, create a resume, see 1 selected; change it to 3 and save, see 3 after reload.

---

### P3: Length estimate in the editor

**User Story**: As the Owner, I want the editor to show the estimated page count against the target so that I know before printing.

**Why P3**: Feedback; the budget works without it.

**Acceptance Criteria**:

1. WHILE a resume has a Resume Document the editor SHALL show its estimate to one decimal against its target, e.g. "~2.3 of 2 pages".  <!-- state-driven -->
2. WHILE the estimate exceeds the target pages the editor SHALL show a warning that the resume is over its target.  <!-- state-driven -->
3. WHILE a resume has no Resume Document the editor SHALL show no estimate.  <!-- state-driven -->

**Independent Test**: Open a resume whose document estimates 2.3 pages at target 2; the editor shows "~2.3 of 2 pages" and the warning.

---

## Edge Cases

- IF the Career Library has no bullets THEN the system SHALL use 120 characters as the mean bullet length.
- WHEN the page size is Letter THEN the estimate SHALL use the A4 constant scaled by the ratio of Letter's printable area to A4's.
- IF the model returns fewer bullets than a cap THEN the assembly SHALL keep them all.
- IF an experience is not current and has no end year THEN the ranking SHALL treat it as ongoing, like a current one. (LEN-07, added after verification)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LEN-01 | P1: AC 1 (input numbers) | Tasks | Pending |
| LEN-02 | P1: AC 2-3 (bullet curve) | Tasks | Pending |
| LEN-03 | P1: AC 4-7 (enforcement) | Tasks | Pending |
| LEN-04 | P2: AC 1-4 (target pages field and setting) | Tasks | Pending |
| LEN-05 | P3: AC 1-3 (editor estimate) | Tasks | Pending |
| LEN-06 | Edge cases (estimate constant, Letter, no bullets) | Tasks | Pending |
| LEN-07 | Edge cases (no end date ranks as ongoing) | Tasks | Pending |

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped

---

## Measurement

Measured 2026-11-28 on this branch's print view (`src/admin/print/style.ts`, A4), in the browser pane at print width (body 174mm, padding 0), with the dev DB's only tailored resume ("Senior Engineer": 20 items, 9 experiences, 42 bullets, 7,869 printed body characters) and a placeholder four-field Personal Header. Ground truth: Chrome headless `--print-to-pdf` of the same page gives **4 pages**; a block-by-block pagination walk (page 265mm, `break-inside: avoid`) gives 3 full pages plus 37% of the fourth (3.37).

| Constant | Value | How |
| -------- | ----- | --- |
| Printable page height (A4) | 265mm (297 - 2×16) | `@page` margin |
| Printable width (A4) | 174mm (210 - 2×18) | `@page` margin |
| Line height, body text | 4.762mm (10pt × 1.35) | CSS, confirmed by measure |
| Characters per line, paragraph | 108 | long real-text paragraph, chars / rendered lines |
| Characters per line, bullet | 104 | same text in a `li` (28pt indent) |
| `h2` section heading | 5.08mm + 19pt margins | measured height + CSS |
| `h3` item title | 5.08mm + 12pt top margin | measured height + CSS |
| Paragraph spacing | 6pt after each `p` (meta line included) | CSS |
| Bullet spacing | 3pt after each `li`, 3pt net per list | CSS (list margin collapses) |
| Margin collapse | 6pt less on an `h2`/`h3` that follows a `p` or `ul` | CSS margin collapsing |
| Personal Header allowance | 22.2mm | measured header block with four contact fields |
| Page-break waste | ×1.04 | 3.37 paginated pages / 3.24 raw (859.2mm / 265mm) |

A line-based model with these constants (each block `ceil(chars / charsPerLine)` lines × 4.762mm plus its spacing, header allowance, ×1.04) estimates the sample at 854.8mm, **3.35 pages**, against 859.2mm and 3.37 measured: within 0.6%. That puts the plain average at about 2,340 printed characters per A4 page for this resume's mix (74% of the body characters are bullets, each about 2 lines).

Letter (215.9 × 279.4mm, same margins): printable 179.9 × 247.4mm. The area ratio to A4 is 0.965. A finer conversion would scale characters per line by width (×1.034) and lines per page by height (×0.934); the spec keeps the area ratio.

The sample resume prints at 4 pages (3.37 by estimate) at the "keep at maximum 2 pdf pages" instruction, which confirms the defect: about 1.4 pages over target.

---

## Sources

- Print template session message, 2026-11-28: dev DB evidence, causes, and the user's answers Q1-Q5 ("Yes, all").
- User answers in this session, 2026-11-28: chars per page "Measure, then constant"; bullet curve "Budget-weighted"; counted "Everything"; editor "Estimate + target"; over minimum "Generate + warn"; migration "Own task, flag it".
- `src/admin/print/style.ts` on this branch: A4, margins 16mm 18mm, Arial 10pt, line-height 1.35 - the view the constant is measured on.

---

## Success Criteria

- [ ] The dev DB sample (9 roles, 43 bullets) regenerates at target 2 with an estimate of at most 2 pages.
- [ ] The printed PDF of that resume is 2 pages or fewer.
