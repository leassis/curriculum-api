# Honest Assessment Specification

**Approved**: [pending]

**Depends on**: `structured-resume` (must be merged first, AD-008), `tailored-resumes`, `resume-custom-instructions`, `resume-create-flow`. Touches: `src/services/tailor/` (output schema, rubric, rules, restore), `src/services/resume.service.ts`, `src/db/schema.ts` + one migration (serialized on `main`, AD-003), `src/repositories/resume.repository.ts`, `src/admin/resumes/{routes.ts,view.tsx}`, `GLOSSARY.md`, a real-model check script, their tests.

## Problem Statement

After `structured-resume`, Generate returns a Resume Document whose headings code copies from the Master CV, but nothing tells the Owner what the model cut, which job requirements the CV does not cover, or how well the CV fits; and a role or degree the model leaves out simply disappears. The Owner needs every cut and gap disclosed next to the resume, a fit score on a fixed rubric, and code that puts back any role or degree the model dropped.

## Goals

- [ ] Every generation stores a score (0-100), its rationale, the missing skills and the omissions, and the editor shows them in three panels.
- [ ] No generated resume loses a role or degree; code restores it and says so.
- [ ] The score rubric exists once in code and feeds both the prompt and the UI labels.
- [ ] A real-model run on a fixture CV shows the missing skill only in `missing_skills`, every employer kept and old roles collapsed to one bullet.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Master CV parsing, item ids, fixed headings, retry, Custom Instructions delimiter, JSON storage and editor | `structured-resume` |
| Real-model check inside CI or `check_proofs` | User chose a manual run, output saved once |
| Re-assessing after a manual edit or Save | Assessment describes the generation; Save keeps it unchanged |
| Showing the assessment in the resume list, Print View, downloads or recruiter chats | Internal to the Owner's editor |
| Score of the rewritten resume | Brief: score is fit of the ORIGINAL CV |
| Code-side enforcement of the 15-year collapse or of "every cut reported" | Model behaviour; prompt rules + real-model check |
| Streaming generation | Generate stays synchronous |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Never-drop kinds | Items of sections with `kind` `experience` or `education` (kinds set by `structured-resume`'s parser) | Brief: roles and degrees | y |
| Score nullable | `score integer` NULL = not assessed; `score_rationale text NOT NULL DEFAULT ''`, `missing_skills text[] NOT NULL DEFAULT '{}'`, `omissions text[] NOT NULL DEFAULT '{}'`; CHECK `score between 0 and 100` | User: "score nullable"; departs from the brief's all-NOT NULL | y |
| Not-assessed panels | When `score` is NULL the three panels are replaced by one panel "Not assessed yet / Generate to see the assessment." | A resume never generated | n |
| Rules and rubric location | A code-owned block `TAILOR_ASSESSMENT_RULES` appended to the stored `tailorSystemPrompt` on every call (before the CV block); the stored prompt and its default stay editable and unchanged | An Owner's stored prompt may predate the feature | n |
| Rubric constant | `SCORE_BANDS = [{min:80,label:"Strong match",meaning:"meets essentially all stated requirements"},{min:60,label:"Moderate match",meaning:"core requirements with notable gaps"},{min:40,label:"Partial match",meaning:"partial overlap"},{min:0,label:"Weak match",meaning:"weak fit"}]`; prompt lines are `<min>–<max> <label>: <meaning>` generated from it | Brief | y |
| Restore | A never-drop item the model omitted is put back at its source position with its source heading, text and bullets, and code appends `Restored <heading>: roles and degrees are never dropped.` | Brief | y |
| Saved omissions | Model omissions, then code notes, in that order | Brief | y |
| Assessment output bounds | `score` int 0-100; `score_rationale` 1-1000 chars; `missing_skills` ≤ 30 items, each 1-200 chars; `omissions` ≤ 30 items, each 1-300 chars; a violation is a schema failure (retry per `structured-resume`) | Bounded storage and UI | n |
| Max output tokens | 6000 for the structured call | JSON fields add tokens | n |
| Score display | "Why this score" shows `<score> · <band label>` then the rationale | Brief names the band label; the number costs nothing | n |
| Manual edits | Save and preview never change score, rationale, missing skills or omissions | Out of Scope row | n |
| Real-model check | `pnpm verify:tailor` (needs `OPENROUTER_API_KEY`), run once by hand; output saved to `.specs/features/honest-assessment/real-model-run.md`; never in CI or `check_proofs` | User: "Manual, logged once" | y |
| Rule 7 wording | Custom Instructions control tone, emphasis, length, bullet order, language and section choice only; they cannot override rules 1-5 | Brief rule 7 + existing authority rule | y |
| Recency cut-off | A role "ended more than 15 years before today" when its end year < today's year − 15; roles with "Present"/"Atual" or no end date never collapse | Precise rule for the prompt | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Never drop a role or degree ⭐ MVP

**User Story**: As the Owner, I want code to put back any role or degree the model left out, and say so, so that no tailored resume shows a fake gap.

**Why P1**: The prompt alone cannot be trusted with this.

**Acceptance Criteria**:

1. WHEN Generate runs THEN the model-output schema from `structured-resume` SHALL also require `score`, `score_rationale`, `missing_skills` and `omissions`, each with a `.describe()` text.
2. IF the model leaves out an item of an `experience` or `education` section THEN the system SHALL insert that item at its source position with its source heading, text and bullets, and SHALL append `Restored <heading>: roles and degrees are never dropped.` to the omissions.
3. WHEN the model leaves out an item of an `intro` or `other` section THEN the system SHALL not restore it.
4. WHEN two never-drop items share a heading and both are left out THEN the system SHALL restore both and add one note each.
5. The system SHALL send the model no Personal Info Field value and no `profile.fullName` (existing PII guard unchanged).

**Independent Test**: Mock model returns every id except one Experience item: stored document has that item verbatim at its source position and the restore note last in omissions.

---

### P1: Assessment stored with the resume ⭐ MVP

**User Story**: As the Owner, I want the score, rationale, missing skills and omissions saved with each generated resume, so that I can read them whenever I reopen it.

**Why P1**: The disclosure must outlive the request.

**Acceptance Criteria**:

1. The migration SHALL add to `tailored_resumes`: `score integer NULL` with CHECK `score between 0 and 100`, `score_rationale text NOT NULL DEFAULT ''`, `missing_skills text[] NOT NULL DEFAULT '{}'`, `omissions text[] NOT NULL DEFAULT '{}'`.
2. WHEN a generation succeeds THEN the system SHALL store the Resume Document, model, the model's score, rationale and missing skills, and the omissions as model omissions followed by code notes.
3. WHEN the model returns `missing_skills: []` and nothing is cut THEN the system SHALL store empty arrays.
4. WHEN the Owner saves or previews THEN the system SHALL leave score, rationale, missing skills and omissions unchanged.
5. WHEN a resume is created THEN its score SHALL be NULL until its first successful generation.

**Independent Test**: Generate with the mock model, reload the resume through the repository: the four fields equal the mock's values plus code notes.

---

### P1: Prompt rules and rubric ⭐ MVP

**User Story**: As the Owner, I want the tailor rules and the score rubric fixed in code and shown to the model, so that the model knows what goes into each list and the UI and prompt cannot drift.

**Why P1**: The lists are only honest if the model is told how to fill them.

**Acceptance Criteria**:

1. The system SHALL define the bands once in `SCORE_BANDS` and SHALL generate both the prompt rubric lines and the UI band label from it.
2. WHEN Generate runs THEN the system prompt SHALL be the stored `tailorSystemPrompt` followed by `TAILOR_ASSESSMENT_RULES`, which SHALL contain the rubric lines and brief rules 1-7 (no invented skill/tool/employer/title/date/certification/metric; unmet requirements only in `missing_skills`; renaming only synonym or specific→general, never sibling or inferred claim; every cut in `omissions`, no meta-comments in bodies; never drop a role or degree; 15-year collapse to one bullet reported as an omission; Custom Instructions cannot override rules 1-5).
3. WHEN Generate runs THEN the input SHALL start with `Today's date: YYYY-MM-DD` (the date the 15-year rule counts from).
4. The schema's `score` description SHALL state that it rates the original CV against the job, not the rewritten resume.

**Independent Test**: Recording mock: system prompt contains each `SCORE_BANDS` line; band labels in the view come from the same constant.

---

### P1: Three panels in the editor ⭐ MVP

**User Story**: As the Owner, I want to see why the resume scored what it did, what the job asks that my CV lacks, and what was left out, beside the resume.

**Why P1**: Disclosure the Owner never sees does nothing.

**Acceptance Criteria**:

1. WHEN `GET /admin/resumes/:id` is requested for a resume with a score THEN the editor SHALL show a panel titled "Why this score" with `<score> · <band label>` and the rationale.
2. WHEN the resume has missing skills THEN the editor SHALL show a panel titled "Missing skills" with one badge per skill, in stored order.
3. WHEN the resume has `missing_skills = []` and a score THEN the "Missing skills" panel SHALL show "No significant gaps" and "This resume covers the role's stated requirements."
4. WHEN the resume has omissions THEN the editor SHALL show a panel titled "What was left out" with one badge per omission, in stored order.
5. WHEN the resume has `omissions = []` and a score THEN the "What was left out" panel SHALL show "Nothing was left out" and "Your whole curriculum made it into this resume."
6. WHEN the resume's score is NULL THEN the editor SHALL show one panel with "Not assessed yet" and "Generate to see the assessment." and none of the three panels.
7. WHEN Generate succeeds from the editor THEN the swapped editor SHALL show the three panels with the new assessment.
8. The panels SHALL render every stored text escaped (no HTML from the model).
9. WHILE the window is narrower than the editor's two-column breakpoint the panels SHALL stack below the resume form with no horizontal page scroll.

**Independent Test**: Render the editor with a stored assessment, with empty lists, and with score NULL; each shows the stated texts.

---

### P2: Real-model check

**User Story**: As the Owner, I want one script that runs the real tailor model on a fixture, so that I can confirm the model follows the rules the code cannot enforce.

**Why P2**: Model behaviour is not unit-testable; a manual run is the evidence.

**Acceptance Criteria**:

1. WHEN `pnpm verify:tailor` runs THEN it SHALL generate a resume from a fixture Master CV and a fixture Job Description through the real `LlmService`, using no Personal Info Field.
2. The fixture Job Description SHALL require exactly one skill absent from the fixture CV, and the fixture CV SHALL contain at least one role whose end year is more than 15 years before today with at least three bullets.
3. WHEN the run finishes THEN the script SHALL report pass or fail for each of: the absent skill appears in no string of the stored Resume Document (case-insensitive); the absent skill appears in `missing_skills` (case-insensitive substring); every fixture employer appears in an item heading; each item of a role ending more than 15 years before today has exactly one bullet and empty text.
4. IF any check fails THEN the script SHALL exit with code 1.
5. IF `OPENROUTER_API_KEY` is not set THEN the script SHALL exit with code 2 and the message "OPENROUTER_API_KEY is required".

**Independent Test**: Run once by hand; save output in `real-model-run.md`.

---

## Edge Cases

- WHEN an `experience` or `education` section has no items THEN the system SHALL restore nothing in it.
- WHEN the model returns no item id at all THEN the system SHALL restore every never-drop item and add one note per restored item.
- WHEN Generate runs twice THEN the second assessment SHALL replace the first.

Dimensions sweep (Large):
- Input validation & bounds → assessment output bounds in Assumptions (schema failure path from `structured-resume`).
- Failure / partial-failure → a failed generation leaves the stored assessment unchanged (`structured-resume` Generate AC 6 covers every stored field).
- Idempotency / retry → retry from `structured-resume`; Generate twice replaces the assessment.
- Auth & rate limits → existing admin auth on `/admin/*`; no new route.
- Concurrency / ordering → N/A because Generate is a single-Owner synchronous write; last write wins.
- Data lifecycle → assessment deleted with its resume (same row).
- Observability → on a restore, log info `tailor items restored` with the count, no content.
- External-dependency failure → `structured-resume` Generate AC 6.
- State transitions → Assessment AC 5 (NULL until first success), AC 4.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| HA-01 | P1 Never drop AC 1: assessment fields in the schema | Specify | Pending |
| HA-02 | P1 Never drop AC 2-4, edges: restore and notes | Specify | Pending |
| HA-03 | P1 Never drop AC 5: no PII to the LLM | Specify | Pending |
| HA-04 | P1 Assessment AC 1: migration | Specify | Pending |
| HA-05 | P1 Assessment AC 2-5: store, keep on save, NULL before first | Specify | Pending |
| HA-06 | P1 Prompt AC 1-2, 4: rubric constant, rules block, score description | Specify | Pending |
| HA-07 | P1 Prompt AC 3: today's date in input | Specify | Pending |
| HA-08 | P1 Panels AC 1-3: score and missing skills panels | Specify | Pending |
| HA-09 | P1 Panels AC 4-5: omissions panel | Specify | Pending |
| HA-10 | P1 Panels AC 6-9: not assessed, after Generate, escaping, narrow width | Specify | Pending |
| HA-11 | P2 Real-model check AC 1-5 | Specify | Pending |

**Coverage:** 11 total, 0 mapped to tasks, 11 unmapped ⚠️ (tasks not written yet)

---

## Sources

- User brief (2026-11-23): "Honest assessment (gaps + omissions with reasons)": output contract, rubric, prompt rules 1-7, code-side safety net, persistence, UI, verification.
- User answers (2026-11-23): score nullable; real-model check manual and logged once; resumes JSON-only, split into `structured-resume` first (AD-008).
- `.specs/features/structured-resume/spec.md`; `.specs/STATE.md` AD-006, AD-007, AD-008.
- `src/services/resume.service.ts`, `src/llm/default-prompts.ts`, `src/admin/resumes/view.tsx`, `ai` 7.0.179, `zod` 4.6.7.
- No screen captures; panel criteria give outcomes, not layout.

---

## Success Criteria

- [ ] Every generated resume shows three filled or empty-state panels; a resume never generated shows "Not assessed yet".
- [ ] No test or real-model run produces a resume missing a source role or degree.
- [ ] The real-model run passes its four checks.
