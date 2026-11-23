# Honest Assessment Specification

**Approved**: [pending]

**Depends on**: `tailored-resumes`, `resume-custom-instructions`, `resume-create-flow` (merged). Touches: `src/services/resume.service.ts`, a new `src/services/tailor/` (CV item parser, output schema, rubric, assembler), `src/llm/default-prompts.ts`, `src/services/llm.service.ts` (structured generate), `src/db/schema.ts` + one migration (serialized on `main`, AD-003), `src/repositories/resume.repository.ts`, `src/admin/resumes/{routes.ts,view.tsx}`, `GLOSSARY.md`, a real-model check script, their tests.

## Problem Statement

Generate returns one markdown text and nothing else. The Owner cannot tell what the tailor model left out, which job requirements the CV does not cover, or whether a role, title or date was altered; the only protection is prompt wording. The Owner needs every cut and every gap disclosed next to the resume, a fit score on a fixed rubric, and code that makes the factual fields of each role and degree impossible for the model to change or drop.

## Goals

- [ ] Every generation stores a score (0-100), its rationale, the missing skills and the omissions, and the editor shows them in three panels.
- [ ] No generated resume changes a role's or degree's heading line (title, employer, dates) or loses a role or degree; code enforces this, not the prompt.
- [ ] The score rubric exists once in code and feeds both the prompt and the UI labels.
- [ ] A real-model run on a fixture CV shows the missing skill only in `missing_skills`, every employer kept and old roles collapsed to one bullet.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Structured CV editor (stored items instead of markdown) | User chose parsing the markdown headings |
| Real-model check inside CI or `check_proofs` | User chose a manual run, output saved once |
| Model reordering items | User chose source order |
| Re-assessing after a manual edit or Save | Assessment describes the generation; Save keeps it unchanged |
| Showing the assessment in the resume list, Print View, download or recruiter chats | Internal to the Owner's editor |
| Score of the rewritten resume | Brief: score is fit of the ORIGINAL CV |
| Code-side enforcement of the 15-year collapse or of "every cut reported" | Model behaviour; prompt rules + real-model check |
| Streaming generation | Generate stays synchronous |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where CV items come from | Code parses the Master CV markdown per generation (AD-006) | User: "Parse markdown headings" | y |
| Item shape | Every `### ` heading is an item: its heading line is the fixed field, the text until the next `#`/`##`/`###` heading is its body. Text after a `## ` heading and before its first `###` is the section's lead item (no fixed heading of its own). Text before the first `## ` is the intro item. | One rule covers experience lists and free sections (Summary, Skills) | n |
| Item ids | `i1`, `i2`, … in source order, assigned per generation, never stored | Ids only bind one model call to its source | n |
| Never-drop kinds | `###` items inside a `## ` section whose title, compared case- and accent-insensitively, is one of: Experience, Work Experience, Professional Experience, Employment, Education, Experiência, Experiência Profissional, Formação, Formação Acadêmica, Educação | English and Portuguese CVs; anything else is droppable | n |
| CV without structure | A Master CV with no `## ` heading fails Generate with 400 "Structure the master CV with ## sections and ### items"; LLM not called | User accepted the clear-message failure | y |
| Item order | Output keeps the Master CV's section and item order; the model's list order is ignored | User: "Source order" | y |
| Score nullable | `score integer` NULL = not assessed; `score_rationale text NOT NULL DEFAULT ''`, `missing_skills text[] NOT NULL DEFAULT '{}'`, `omissions text[] NOT NULL DEFAULT '{}'`; CHECK `score between 0 and 100` | User: "score nullable"; departs from the brief's all-NOT NULL | y |
| Not-assessed panels | When `score` is NULL the three panels are replaced by one panel "Not assessed yet / Generate to see the assessment." | A resume never generated, or generated before this feature | n |
| Custom Instructions delimiter | `<custom_instructions>` … `</custom_instructions>` under the existing preamble; occurrences of either tag inside the text are removed first (AD-007) | User: "Own delimiter" | y |
| Rules and rubric location | A code-owned block `TAILOR_ASSESSMENT_RULES` appended to the stored `tailorSystemPrompt` on every call (before the CV block); the stored prompt and its default stay editable and unchanged | Same reason as the Custom Instructions preamble: an Owner's stored prompt may predate the feature | n |
| Rubric constant | `SCORE_BANDS = [{min:80,label:"Strong match",meaning:"meets essentially all stated requirements"},{min:60,label:"Moderate match",meaning:"core requirements with notable gaps"},{min:40,label:"Partial match",meaning:"partial overlap"},{min:0,label:"Weak match",meaning:"weak fit"}]`; prompt lines are `<min>–<max> <label>: <meaning>` generated from it | Brief | y |
| Retry | Output that fails the schema, names an unknown id or names an id twice triggers one more model call; a second failure answers like today's `LlmUnavailableError` ("Generation failed, try again", 502) and changes nothing | Brief: "retry once" | y |
| Restore | A never-drop item the model omitted is put back with its source heading and source body verbatim, and code appends `Restored <heading text>: roles and degrees are never dropped.` (`<heading text>` = heading line without `### `) | Brief | y |
| Saved omissions | Model omissions, then code notes, in that order | Brief | y |
| Headings inside a body | Leading `#` characters are stripped from any body line that starts with `#{1,6} `, so a body never adds a heading | Keeps the assembled structure code-owned without failing a generation | n |
| Output bounds (schema) | `score` int 0-100; `score_rationale` 1-1000 chars; `missing_skills` ≤ 30 items, each 1-200 chars; `omissions` ≤ 30 items, each 1-300 chars; `items` each `{source_item_id, body}` with body ≤ 6000 chars | Bounded storage and UI | n |
| Max output tokens | Raised from 4000 to 6000 for the structured call | JSON fields add tokens to the same resume | n |
| Score display | "Why this score" shows `<score> · <band label>` then the rationale | Brief names the band label; the number costs nothing | n |
| Manual edits | Save and preview never change score, rationale, missing skills or omissions | Out of scope row | n |
| Real-model check | `pnpm verify:tailor` (needs `OPENROUTER_API_KEY`), run once by hand; its output saved to `.specs/features/honest-assessment/real-model-run.md`; never in CI or `check_proofs` | User: "Manual, logged once" | y |
| Rule 7 wording | Custom Instructions control tone, emphasis, length, order of bullets, language and section choice only; they cannot override rules 1-5 | Brief rule 7 + existing authority rule | y |
| Recency cut-off | A role "ended more than 15 years before today" when its end year < today's year − 15; roles with "Present"/"Atual" or no end date never collapse | Model judgement with a precise rule in the prompt | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Structured, enforced generation ⭐ MVP

**User Story**: As the Owner, I want the tailor model to rewrite only item bodies while code keeps every heading and every role and degree, so that no tailored resume misstates my history.

**Why P1**: The safety net is the reason the disclosure can be trusted.

**Acceptance Criteria**:

1. WHEN Generate runs THEN the system SHALL parse the Master CV into items per the item-shape rule and send the tailor model a list of `{id, heading, kind}` with ids `i1…in` in source order.
2. WHEN Generate runs THEN the system SHALL call the model with structured output validated by a zod schema with fields `score`, `score_rationale`, `missing_skills`, `omissions` and `items[{source_item_id, body}]`, each field carrying a `.describe()` text.
3. WHEN the model returns valid output THEN the system SHALL assemble the resume markdown in source order: each kept section's `## ` heading line copied from the source, each kept `###` item's heading line copied from the source followed by the model's body.
4. The assembled resume SHALL contain every source heading line it keeps character for character, whatever the model's body says.
5. IF the model omits a never-drop item THEN the system SHALL insert that item with its source heading and source body and SHALL append `Restored <heading text>: roles and degrees are never dropped.` to the omissions.
6. IF the model's output fails the schema, names an id not in the item list, or names the same id twice THEN the system SHALL call the model once more with the same input.
7. IF the second call also fails per AC 6 THEN the system SHALL answer 502 "Generation failed, try again" and SHALL leave content, model, score, rationale, missing skills and omissions unchanged.
8. IF a body line starts with 1-6 `#` followed by a space THEN the system SHALL store that line without the leading `#` characters and the space.
9. IF the Master CV has no `## ` heading THEN Generate SHALL answer 400 "Structure the master CV with ## sections and ### items" and SHALL not call the LLM.
10. The system SHALL send the model no Personal Info Field value and no `profile.fullName` (existing PII guard unchanged).

**Independent Test**: Mock model returns bodies for some ids, skips one Experience item and alters nothing else: stored content has every source Experience heading, the skipped item restored verbatim, and the restore note last in omissions.

---

### P1: Assessment stored with the resume ⭐ MVP

**User Story**: As the Owner, I want the score, rationale, missing skills and omissions saved with each generated resume, so that I can read them whenever I reopen it.

**Why P1**: The disclosure must outlive the request.

**Acceptance Criteria**:

1. The migration SHALL add to `tailored_resumes`: `score integer NULL` with CHECK `score between 0 and 100`, `score_rationale text NOT NULL DEFAULT ''`, `missing_skills text[] NOT NULL DEFAULT '{}'`, `omissions text[] NOT NULL DEFAULT '{}'`.
2. WHEN a generation succeeds THEN the system SHALL store content, model, the model's score, rationale and missing skills, and the omissions as model omissions followed by code notes.
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
3. WHEN Generate runs THEN the input SHALL start with `Today's date: YYYY-MM-DD`.
4. WHEN Custom Instructions are non-empty THEN the input SHALL contain the existing preamble, then `<custom_instructions>`, the instructions with every `<custom_instructions>` and `</custom_instructions>` removed and marker-sanitized, then `</custom_instructions>`, before the `JOB_DESCRIPTION` block.
5. WHEN Custom Instructions are empty THEN the input SHALL contain no `<custom_instructions>` tag.
6. The schema's `score` description SHALL state that it rates the original CV against the job, not the rewritten resume.

**Independent Test**: Recording mock: system prompt contains each `SCORE_BANDS` line; input contains the delimited instructions; band labels in the view come from the same constant.

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
9. WHILE the window is narrower than the editor's two-column breakpoint the panels SHALL stack below the resume with no horizontal page scroll.

**Independent Test**: Render the editor with a stored assessment, with empty lists, and with score NULL; each shows the stated texts.

---

### P2: Real-model check

**User Story**: As the Owner, I want one script that runs the real tailor model on a fixture, so that I can confirm the model follows the rules the code cannot enforce.

**Why P2**: Model behaviour is not unit-testable; a manual run is the evidence.

**Acceptance Criteria**:

1. WHEN `pnpm verify:tailor` runs THEN it SHALL generate a resume from a fixture Master CV and a fixture Job Description through the real `LlmService`, using no Personal Info Field.
2. The fixture Job Description SHALL require exactly one skill absent from the fixture CV, and the fixture CV SHALL contain at least one role whose end year is more than 15 years before today with at least three bullets.
3. WHEN the run finishes THEN the script SHALL report pass or fail for each of: the absent skill does not appear in the content (case-insensitive); the absent skill appears in `missing_skills` (case-insensitive substring); every fixture employer appears in the content; each role older than 15 years has exactly one bullet.
4. IF any check fails THEN the script SHALL exit with code 1.
5. IF `OPENROUTER_API_KEY` is not set THEN the script SHALL exit with code 2 and the message "OPENROUTER_API_KEY is required".

**Independent Test**: Run once by hand; save output in `real-model-run.md`.

---

## Edge Cases

- WHEN a never-drop section has no `###` items THEN the system SHALL treat its lead text as a droppable item (nothing to restore).
- WHEN the Master CV has headings deeper than `###` THEN the system SHALL keep them inside the enclosing item's body.
- WHEN the model returns an item list that covers no id at all THEN the system SHALL restore every never-drop item and add one note per restored item.
- IF the model returns a body for a droppable item with an empty string THEN the system SHALL treat that item as dropped.
- WHEN two source items have the same heading line THEN they SHALL still get distinct ids and both SHALL be restored independently.

Dimensions sweep (Large):
- Input validation & bounds → P1 structured AC 2, 9; output bounds in Assumptions.
- Failure / partial-failure → structured AC 6-7 (nothing saved on failure).
- Idempotency / retry → structured AC 6 (one retry); Generate twice overwrites the assessment (last wins).
- Auth & rate limits → existing admin auth on `/admin/*`; no new route. N/A beyond that.
- Concurrency / ordering → N/A because Generate is a single-Owner synchronous write; last write wins as today.
- Data lifecycle → assessment deleted with its resume (same row). N/A otherwise.
- Observability → on a retry, log warn `tailor output rejected` with the reason code (`schema`, `unknown_id`, `duplicate_id`) and no content; on a restore, log info `tailor items restored` with the count.
- External-dependency failure → structured AC 7.
- State transitions → assessment AC 5 (NULL until first success), AC 4.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| HA-01 | P1 Structured AC 1, edges: CV parsing and ids | Specify | Pending |
| HA-02 | P1 Structured AC 2: schema with describe | Specify | Pending |
| HA-03 | P1 Structured AC 3-4, 8: assembly, fixed headings, source order | Specify | Pending |
| HA-04 | P1 Structured AC 5, edges: restore never-drop items | Specify | Pending |
| HA-05 | P1 Structured AC 6-7: retry once, then fail unchanged | Specify | Pending |
| HA-06 | P1 Structured AC 9: CV without structure | Specify | Pending |
| HA-07 | P1 Structured AC 10: no PII to the LLM | Specify | Pending |
| HA-08 | P1 Assessment AC 1: migration | Specify | Pending |
| HA-09 | P1 Assessment AC 2-5: store, keep on save, NULL before first | Specify | Pending |
| HA-10 | P1 Prompt AC 1-2, 6: rubric constant, rules block | Specify | Pending |
| HA-11 | P1 Prompt AC 3-5: input with delimited Custom Instructions | Specify | Pending |
| HA-12 | P1 Panels AC 1-3: score and missing skills panels | Specify | Pending |
| HA-13 | P1 Panels AC 4-5: omissions panel | Specify | Pending |
| HA-14 | P1 Panels AC 6-9: not assessed, after Generate, escaping, narrow width | Specify | Pending |
| HA-15 | P2 Real-model check AC 1-5 | Specify | Pending |

**Coverage:** 15 total, 0 mapped to tasks, 15 unmapped ⚠️ (tasks not written yet)

---

## Sources

- User brief (2026-11-23): "Honest assessment (gaps + omissions with reasons)": output contract, rubric, prompt rules 1-7, code-side safety net, persistence, UI, verification.
- User answers (2026-11-23): parse markdown headings; score nullable; real-model check manual and logged once; source order; own delimiter for Custom Instructions.
- `.specs/features/tailored-resumes/spec.md`, `.specs/features/resume-custom-instructions/spec.md` (AC 2 input format superseded by AD-007), `.specs/features/resume-create-flow/spec.md`.
- `src/services/resume.service.ts` (`generate`, `tailorInput`), `src/services/llm.service.ts`, `src/llm/default-prompts.ts`, `src/admin/resumes/view.tsx`, `ai` 7.0.179 structured output, `zod` 4.6.7.
- No screen captures; panel criteria give outcomes, not layout.

---

## Success Criteria

- [ ] Every generated resume shows three filled or empty-state panels; a resume never generated shows "Not assessed yet".
- [ ] No test or real-model run produces a resume missing a source role or degree, or with an altered heading line.
- [ ] The real-model run passes its four checks.
- [ ] Every existing `tailored-resumes`, `resume-custom-instructions` and `resume-create-flow` test passes, except the custom-instructions input-format test, which is updated per AD-007.
