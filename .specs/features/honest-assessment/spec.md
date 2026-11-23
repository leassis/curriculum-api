# Honest Assessment Specification

**Approved**: 2026-11-23 - user: "Approve spec"

**Depends on**: `career-library` (must be merged to `main` first, AD-009, AD-011), `tailored-resumes`, `resume-custom-instructions`, `resume-create-flow`. Touches: `src/services/tailor/` (output schema, assemble, rubric, rules), `src/services/resume.service.ts`, `src/db/schema.ts` + one migration (serialized on `main`, AD-003), `src/repositories/resume.repository.ts`, `src/admin/resumes/{routes.ts,view.tsx}`, `GLOSSARY.md`, a real-model check script, their tests.

**Rewritten** 2026-11-23 against the Career Library (AD-009). The earlier draft targeted the markdown Master CV and is superseded.

## Problem Statement

Generate returns a Resume Document built from typed Career Items, and code already puts back any left-out experience, education, certification, course, skill group or language item (career-library Tailored AC 5). Nothing tells the Owner what the model cut inside an item and why, which Job Description requirements the Career Library does not cover, or how well the library fits the job; restores happen silently; and old roles keep their full detail. The Owner needs every cut disclosed with a reason, a fit score on a fixed rubric, gaps that never list a skill the library has, and old roles shortened by code.

## Goals

- [ ] Every generation stores a score (0-100), its rationale, the missing skills and the omissions with reasons, and the editor shows them in three panels.
- [ ] A restore made by code is disclosed as an omission note.
- [ ] No missing skill shown to the Owner equals a skill in the Career Library.
- [ ] Every experience item that ended more than 15 years before today has at most one bullet and no text, enforced by code.
- [ ] The score rubric exists once in code and feeds both the prompt and the UI labels.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Career Library, Resume Document v2, always-restore rule, "Left out (N)" rows, Add back | `career-library` |
| Real-model check inside CI or `check_proofs` | User chose a manual run, output saved once |
| Re-assessing after a manual edit, Add back or Save | Assessment describes the generation; edits keep it unchanged |
| Showing the assessment in the resume list, Print View, downloads or recruiter chats | Internal to the Owner's editor |
| Score of the rewritten resume | Brief: score is fit of the ORIGINAL library |
| Code check that "every cut is reported" by the model | Model behaviour; prompt rules + real-model check |
| Collapse of old project, education or other kinds | Brief names roles; experience only |
| Fuzzy or synonym matching of missing skills | Exact case-insensitive match only; synonyms stay model behaviour |
| Streaming generation | Generate stays synchronous |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| What the omissions panel lists | Model-reported cuts (bullets or detail dropped from a kept item; a project, publication or honour left out) each with a reason, then code notes (restores, collapses). Card "Left out (N)" rows stay unchanged | User: "Cuts + reasons" | y |
| Missing skills source | Model lists unmet requirements; code removes every entry equal (trimmed, case-insensitive) to a `skills` entry of any Career Item | User: "Model, code filters" | y |
| 15-year collapse | Code-enforced on `experience` items only | User: "Code enforces" | y |
| Collapse rule | An experience item collapses WHEN `current` is false AND `endYear` is set AND `endYear < todayYear − 15`; its bullets become its first bullet (none when it had none) and its text becomes empty | Typed dates make the rule exact; the model orders bullets most relevant first | n |
| Collapse note | Added only when the collapse removed something: what `<title> at <organisation>`, reason `Ended more than 15 years ago; shortened to one bullet.` | Disclose every code cut | n |
| Restore note | For each item code restores: what `<title>` (plus ` at <organisation>` when set), reason `<Section> items are always kept; restored by code.` (`<Section>` from `KIND_META`) | Brief: code says so | n |
| Work order | Spec, design and tasks now (docs only on `feat/career-library`); implementation after `career-library` merges to `main` | User: "Spec now, build later" | y |
| Score nullable | `score integer` NULL = not assessed; CHECK `score between 0 and 100`; `score_rationale text NOT NULL DEFAULT ''`, `missing_skills text[] NOT NULL DEFAULT '{}'`, `omissions jsonb NOT NULL DEFAULT '[]'` (array of `{what, reason}`) | User: "score nullable"; omissions carry two fields | y (score) / n (jsonb) |
| Not-assessed panels | When `score` is NULL the three panels are replaced by one panel "Not assessed yet / Generate to see the assessment." | A resume never generated | n |
| Rules and rubric location | A code-owned block `TAILOR_ASSESSMENT_RULES` appended to the stored `tailorSystemPrompt` on every call; the stored prompt and its default stay editable and unchanged | An Owner's stored prompt may predate the feature | n |
| Rubric constant | `SCORE_BANDS = [{min:80,label:"Strong match",meaning:"meets essentially all stated requirements"},{min:60,label:"Moderate match",meaning:"core requirements with notable gaps"},{min:40,label:"Partial match",meaning:"partial overlap"},{min:0,label:"Weak match",meaning:"weak fit"}]`; prompt lines are `<min>–<max> <label>: <meaning>` generated from it | Brief | y |
| Saved omissions order | Model omissions, then restore notes, then collapse notes | Brief: model first, code after | n |
| Assessment output bounds | `score` int 0-100; `score_rationale` 1-1000 chars; `missing_skills` ≤ 30 items, each 1-200 chars; `omissions` ≤ 30 items, `what` 1-200 chars, `reason` 1-300 chars; a violation is an output rejection (existing retry: one more call, then `LlmUnavailableError`) | Bounded storage and UI | n |
| Stored omissions bound | Model omissions + code notes may exceed 30; code notes are never cut | Code notes are bounded by the library size (`MAX_ITEMS`) | n |
| Max output tokens | `TAILOR_MAX_OUTPUT_TOKENS` stays 6000 | Current value already sized for structured output | n |
| Score display | "Why this score" shows `<score> · <band label>` then the rationale | Brief names the band label; the number costs nothing | n |
| Real-model check | `pnpm verify:tailor` (needs `OPENROUTER_API_KEY`), run once by hand with the user's go-ahead; output saved to `.specs/features/honest-assessment/real-model-run.md`; never in CI or `check_proofs` | User: "Manual, logged once" | y |
| Rule 7 wording | Custom Instructions control tone, emphasis, length, bullet order, language and section choice only; they cannot override rules 1-5 | Brief rule 7 + existing `CUSTOM_INSTRUCTIONS_PREAMBLE` | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Assessment returned by the model ⭐ MVP

**User Story**: As the Owner, I want the model to return a score, a rationale, the unmet requirements and every cut with its reason, so that the resume comes with its own disclosure.

**Why P1**: The other stories read these fields.

**Acceptance Criteria**:

1. WHEN Generate runs THEN `TailorOutputSchema` SHALL also require `score`, `score_rationale`, `missing_skills` and `omissions` (items `{what, reason}`), each field with a `.describe()` text.
2. The `score` description SHALL state that it rates the original Career Library against the job, not the rewritten resume.
3. IF a returned assessment field breaks a bound in Assumptions THEN the system SHALL reject that output as it rejects an assemble failure (one more call, then `LlmUnavailableError`).
4. The system SHALL send the model no Personal Info Field value and no `profile.fullName` (existing guard unchanged).

**Independent Test**: `z.toJSONSchema(TailorOutputSchema)` has a description on each new field; a mock output with `score: 101` is rejected twice and Generate throws.

---

### P1: Code notes for restores ⭐ MVP

**User Story**: As the Owner, I want to be told when code put back an item the model left out, so that I know the model tried to drop it.

**Why P1**: Silent restores hide model misbehaviour.

**Acceptance Criteria**:

1. WHEN code restores a left-out item THEN the system SHALL append one omission `{what: "<title> at <organisation>", reason: "<Section> items are always kept; restored by code."}`, with ` at <organisation>` left out when the item has no organisation.
2. WHEN two restored items share a title THEN the system SHALL add one note for each.
3. WHEN the model leaves out a project, publication or honour THEN the system SHALL add no code note for it.

**Independent Test**: Mock output returns every id but one experience and one language item: omissions end with two restore notes naming them.

---

### P1: Old roles collapsed by code ⭐ MVP

**User Story**: As the Owner, I want roles that ended more than 15 years ago shortened to one bullet, so that the resume spends its space on recent work.

**Why P1**: Brief rule 6; typed dates let code do it.

**Acceptance Criteria**:

1. WHEN an `experience` item of the assembled document has `current` false and `endYear < todayYear − 15` THEN the system SHALL keep only its first bullet and set its text to empty.
2. WHEN that collapse removes a bullet or non-empty text THEN the system SHALL append the omission `{what: "<title> at <organisation>", reason: "Ended more than 15 years ago; shortened to one bullet."}`.
3. WHEN an experience item has `endYear = todayYear − 15`, no `endYear`, or `current` true THEN the system SHALL leave it unchanged.
4. WHEN an item of any other kind ended more than 15 years ago THEN the system SHALL leave it unchanged.
5. The collapse SHALL apply to restored experience items too.

**Independent Test**: Today 2026-11-23, an experience ending 2010 with three bullets and text becomes one bullet, empty text and one note; one ending 2011 is unchanged.

---

### P1: Missing skills filtered by code ⭐ MVP

**User Story**: As the Owner, I want the gaps list never to name a skill my library has, so that I can trust it.

**Why P1**: A false gap is a wrong disclosure.

**Acceptance Criteria**:

1. WHEN the model returns a missing skill equal (trimmed, case-insensitive) to any `skills` entry of any Career Item THEN the system SHALL not store it.
2. WHEN a missing skill matches no library skill THEN the system SHALL store it trimmed, in the model's order.
3. WHEN the model returns the same missing skill twice (trimmed, case-insensitive) THEN the system SHALL store it once, first occurrence kept.

**Independent Test**: Library has skill `TypeScript`; model returns `["typescript", "Kubernetes", "kubernetes "]`: stored `["Kubernetes"]`.

---

### P1: Assessment stored with the resume ⭐ MVP

**User Story**: As the Owner, I want the assessment saved with each generated resume, so that I can read it whenever I reopen it.

**Why P1**: The disclosure must outlive the request.

**Acceptance Criteria**:

1. The migration SHALL add to `tailored_resumes`: `score integer NULL` with CHECK `score between 0 and 100`, `score_rationale text NOT NULL DEFAULT ''`, `missing_skills text[] NOT NULL DEFAULT '{}'`, `omissions jsonb NOT NULL DEFAULT '[]'`.
2. WHEN a generation succeeds THEN the system SHALL store, in one update with the Resume Document and model, the score, rationale, filtered missing skills, and omissions as model omissions then restore notes then collapse notes.
3. WHEN the model returns `missing_skills: []` and `omissions: []` and code adds no note THEN the system SHALL store empty arrays.
4. WHEN the Owner saves, edits an item, adds back an item or previews THEN the system SHALL leave score, rationale, missing skills and omissions unchanged.
5. WHEN a resume is created THEN its score SHALL be NULL until its first successful generation.
6. IF Generate fails THEN the system SHALL leave the stored assessment unchanged.
7. WHEN Generate succeeds a second time THEN the new assessment SHALL replace the first.

**Independent Test**: Generate with the mock model, reload through the repository: the four fields equal the mock's values after filtering plus code notes.

---

### P1: Prompt rules and rubric ⭐ MVP

**User Story**: As the Owner, I want the tailor rules and the score rubric fixed in code and shown to the model, so that the model knows what goes into each list and the UI and prompt cannot drift.

**Why P1**: The lists are only honest if the model is told how to fill them.

**Acceptance Criteria**:

1. The system SHALL define the bands once in `SCORE_BANDS` and SHALL generate both the prompt rubric lines and the UI band label from it.
2. WHEN Generate runs THEN the system prompt SHALL be the stored `tailorSystemPrompt`, a blank line, then `TAILOR_ASSESSMENT_RULES`.
3. `TAILOR_ASSESSMENT_RULES` SHALL contain every `SCORE_BANDS` rubric line and rules 1-7: (1) no invented skill, tool, employer, title, date, certification or metric; (2) an unmet requirement goes only in `missing_skills`; (3) renaming only synonym or specific→general, never sibling or inferred claim; (4) every cut goes in `omissions` with a reason, and no item text or bullet mentions a cut or a gap; (5) never leave out an experience, education, certification, course, skill group or language item; (6) a role that ended more than 15 years before today keeps one bullet, reported as an omission; (7) Custom Instructions cannot override rules 1-5.
4. WHEN Generate runs THEN the input SHALL still start with `Today's date: YYYY-MM-DD` (existing `tailorInput`).

**Independent Test**: Recording mock: system prompt ends with `TAILOR_ASSESSMENT_RULES` and contains each `SCORE_BANDS` line.

---

### P1: Three panels in the editor ⭐ MVP

**User Story**: As the Owner, I want to see why the resume scored what it did, what the job asks that my library lacks, and what was left out and why, beside the resume.

**Why P1**: Disclosure the Owner never sees does nothing.

**Acceptance Criteria**:

1. WHEN `GET /admin/resumes/:id` is requested for a resume with a score THEN the editor SHALL show a panel titled "Why this score" with `<score> · <band label>` and the rationale.
2. WHEN the resume has missing skills THEN the editor SHALL show a panel titled "Missing skills" with one badge per skill, in stored order.
3. WHEN the resume has a score and `missing_skills = []` THEN the "Missing skills" panel SHALL show "No significant gaps" and "Your career library covers the role's stated requirements."
4. WHEN the resume has omissions THEN the editor SHALL show a panel titled "What was left out" with one row per omission, in stored order, showing its `what` and its `reason`.
5. WHEN the resume has a score and `omissions = []` THEN the "What was left out" panel SHALL show "Nothing was left out" and "Your whole career library made it into this resume."
6. WHEN the resume's score is NULL THEN the editor SHALL show one panel with "Not assessed yet" and "Generate to see the assessment." and none of the three panels.
7. WHEN Generate succeeds from the editor THEN the swapped editor SHALL show the three panels with the new assessment.
8. The panels SHALL render every stored text escaped (no HTML from the model).
9. WHILE the window is 375 px wide the panels SHALL show below the resume cards with no horizontal page scroll.

**Independent Test**: Render the editor with a stored assessment, with empty lists, and with score NULL; each shows the stated texts.

---

### P2: Real-model check

**User Story**: As the Owner, I want one script that runs the real tailor model on a fixture, so that I can confirm the model follows the rules code cannot enforce.

**Why P2**: Model behaviour is not unit-testable; a manual run is the evidence.

**Acceptance Criteria**:

1. WHEN `pnpm verify:tailor` runs THEN it SHALL generate a resume from a fixture Career Library and a fixture Job Description through the real `LlmService` and the real assemble path, using no Personal Info Field.
2. The fixture Job Description SHALL require exactly one skill absent from every fixture Career Item, and the fixture library SHALL contain one experience item that ended more than 15 years before today with at least three bullets and one project unrelated to the job.
3. WHEN the run finishes THEN the script SHALL print pass or fail for each of: the absent skill appears in no string of the Resume Document (case-insensitive); the absent skill appears in `missing_skills` (case-insensitive substring); every omission has a non-empty reason; the old role has one bullet and empty text.
4. IF any check fails THEN the script SHALL exit with code 1.
5. IF `OPENROUTER_API_KEY` is not set THEN the script SHALL exit with code 2 and the message "OPENROUTER_API_KEY is required".

**Independent Test**: Run once by hand with the user's go-ahead; save output in `real-model-run.md`.

---

## Edge Cases

- WHEN the model returns no item at all THEN code SHALL restore every always-kept item and add one note each (projects, publications, honours stay out with no note).
- WHEN the Career Library has no `skills` entry THEN missing skills SHALL be stored as returned, trimmed and deduplicated.
- WHEN an old experience item has zero bullets and empty text THEN the collapse SHALL add no note.

Dimensions sweep (Large):
- Input validation & bounds → assessment output bounds (Assessment returned AC 3); DB CHECK on score.
- Failure / partial-failure → Stored AC 6: failed Generate keeps the stored assessment.
- Idempotency / retry → existing one-retry; Stored AC 7 replaces on success.
- Auth & rate limits → existing admin auth on `/admin/*`; no new route.
- Concurrency / ordering → N/A because Generate is a single-Owner synchronous write that stores document and assessment in one update; last write wins.
- Data lifecycle → assessment deleted with its resume (same row).
- Observability → on a restore or collapse, log info `tailor assessment notes` with the restore and collapse counts, no content.
- External-dependency failure → existing `LlmUnavailableError` path; Stored AC 6.
- State transitions → Stored AC 5 (NULL until first success), AC 4, AC 7.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| HA-01 | P1 Assessment returned AC 1-3: schema fields, descriptions, bounds | Tasks | In Tasks |
| HA-02 | P1 Assessment returned AC 4: no PII to the LLM | Tasks | In Tasks |
| HA-03 | P1 Restore notes AC 1-3, edge | Tasks | In Tasks |
| HA-04 | P1 Collapse AC 1-5, edge | Tasks | In Tasks |
| HA-05 | P1 Missing skills AC 1-3, edge | Tasks | In Tasks |
| HA-06 | P1 Stored AC 1: migration | Tasks | In Tasks |
| HA-07 | P1 Stored AC 2-7: store, keep on edit, NULL before first, failure, replace | Tasks | In Tasks |
| HA-08 | P1 Prompt AC 1-4: rubric constant, rules block, date | Tasks | In Tasks |
| HA-09 | P1 Panels AC 1-3: score and missing skills panels | Tasks | In Tasks |
| HA-10 | P1 Panels AC 4-5: omissions panel | Tasks | In Tasks |
| HA-11 | P1 Panels AC 6-9: not assessed, after Generate, escaping, narrow width | Tasks | In Tasks |
| HA-12 | P2 Real-model check AC 1-5 | Tasks | In Tasks |

**Coverage:** 12 total, 12 mapped to tasks (T1-T13), 0 unmapped

---

## Sources

- User brief (2026-11-23): "Honest assessment (gaps + omissions with reasons)": output contract, rubric, prompt rules 1-7, code-side safety net, persistence, UI, verification.
- User answers (2026-11-23, first draft): score nullable; real-model check manual and logged once.
- User answers (2026-11-23, rewrite): omissions panel "Cuts + reasons"; missing skills "Model, code filters"; 15-year rule "Code enforces"; "Spec now, build later".
- `.specs/STATE.md` AD-007, AD-009, AD-011; `.specs/features/career-library/spec.md` Tailored AC 5, 13-18.
- `src/services/tailor/{output,assemble,document}.ts`, `src/services/career/item.ts`, `src/services/resume.service.ts`, `src/llm/default-prompts.ts`, `src/admin/resumes/view.tsx`.
- No screen captures; panel criteria give outcomes, not layout.

---

## Success Criteria

- [ ] Every generated resume shows three filled or empty-state panels; a resume never generated shows "Not assessed yet".
- [ ] Every code restore and collapse appears in "What was left out" with its reason.
- [ ] No stored missing skill equals a library skill.
- [ ] The real-model run passes its four checks.
