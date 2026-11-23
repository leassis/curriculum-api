# Honest Assessment Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/honest-assessment/design.md`
**Status**: Approved
**Approved**: 2026-11-23 - user: "approve but do not implement yet"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests create a throwaway Neon branch per run (needs `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` in `.env`/`.env.local`). Use `rtk proxy pnpm vitest ...` for raw output.

## Decisions made while writing tasks

- **Starts from `main` after `feat/career-library` is merged** (spec, user: "Spec now, build later"). Branch `feat/honest-assessment`; `validate_tasks.py --execute` runs there.
- **Migration `0007`** is generated on that branch and serialized on `main` (AD-003); it never runs against production without the user's go-ahead.
- **Paid run**: T13's real-model run costs one OpenRouter call per attempt; it runs only after the user says so in chat.
- **Shared fixtures**: `test/support/career.ts` (`sampleLibrary()`, `item()`) and `test/support/mock-llm.ts`; a helper `assessmentOutput(overrides)` is added to `test/support/resumes.ts` in T8.

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (projects unit/integration, no coverage threshold) - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/services/tailor/*` (pure) | unit | Every branch; 1:1 to spec ACs and edge cases; each bound at and past its limit | `test/unit/services/tailor/*.test.ts` | `pnpm test:unit` |
| `src/services/resume.service.ts` | unit, fakes + recording mock | 1:1 to Stored, Prompt, Assessment-returned ACs | `test/unit/services/resume.service.test.ts` | `pnpm test:unit` |
| `src/db/schema.ts` + migration | integration | Columns, defaults, CHECK | `test/integration/db/assessment-migration.test.ts` | `pnpm test:int` |
| `src/admin/resumes/view.tsx` | unit (render) | Every panel state, escaping | `test/unit/admin/resumes.test.tsx` | `pnpm test:unit` |
| `src/admin/resumes/routes.ts` | unit (test app) | Editor GET and Generate POST carry the panels | `test/unit/admin/resumes.test.tsx` | `pnpm test:unit` |
| `scripts/verify-tailor*.ts` | unit | Pure checks, fixtures, exit codes | `test/unit/scripts/verify-tailor.test.ts` | `pnpm test:unit` |
| `GLOSSARY.md`, `package.json` script | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks with unit tests only | `pnpm test:unit` |
| Full | Tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | Phase end, docs-only tasks | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. 13 tasks → 2 batches (Phase 1 = 6; Phases 2-4 = 7), offered to sub-agents (memory: user delegates implementation).

### Phase 1: Pure tailor rules

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Storage and service

```
T6 → T7 → T8
```

### Phase 3: Editor panels

```
T8 → T9 → T10
```

### Phase 4: Docs and real-model check

```
T10 → T11 → T12 → T13
```

---

## Task Breakdown

### T1: Score rubric and rules block

**What**: `SCORE_BANDS`, `bandFor`, `rubricLines`, `TAILOR_ASSESSMENT_RULES`.
**Where**: `src/services/tailor/rubric.ts`
**Depends on**: None
**Reuses**: none
**Requirement**: HA-08

**Done when**:

- [x] Unit tests: `bandFor` at 0, 39, 40, 59, 60, 79, 80, 100; rubric lines `80–100 Strong match: …` … `0–39 Weak match: …`; rules block contains every rubric line and rules 1-7 text (C26, C28)
- [x] Gate check passes: `pnpm test:unit`
- [x] Test count: existing unit tests + new rubric tests pass

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): add the score rubric and assessment rules`

---

### T2: Assessment fields in the output schema

**What**: `TailorOutputSchema` gains `score`, `score_rationale`, `missing_skills`, `omissions` (`{what, reason}`), each described.
**Where**: `src/services/tailor/output.ts`
**Depends on**: T1
**Reuses**: existing schema style
**Requirement**: HA-01

**Done when**:

- [x] Unit tests: `z.toJSONSchema` has a description on each new field and on `what`/`reason`; `score` description says it rates the original career library, not the rewritten resume (C1, C2)
- [x] Existing output and assemble tests updated only to supply the new required fields
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): ask the model for score, gaps and omissions`

---

### T3: Bounds, missing-skills filter, restore note

**What**: `Omission`, `Assessment`, `ASSESSMENT_BOUNDS`, `checkAssessment`, `filterMissingSkills`, `restoreNote`.
**Where**: `src/services/tailor/assessment.ts`
**Depends on**: T2
**Reuses**: `cleanLine`, `KIND_META`
**Requirement**: HA-01, HA-03, HA-05

**Done when**:

- [x] Unit tests: each bound accepted at its limit and rejected one past it (score −1/101/non-integer, rationale 0/1001, 31 skills, skill 201, 31 omissions, what 201, reason 301) (C3)
- [x] Unit tests: filter drops library-skill matches ignoring case, keeps unmatched trimmed in order, dedupes keeping first, keeps all when the library has no skills (C15-C18)
- [x] Unit tests: restore note with and without organisation, section from `KIND_META` (C6, C7)
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): filter missing skills and bound the assessment`

---

### T4: Collapse old roles

**What**: `collapseOldRoles(doc, todayYear)` returning the collapsed doc and its notes.
**Where**: `src/services/tailor/assessment.ts` (modify)
**Depends on**: T3
**Reuses**: `ResumeDocument`
**Requirement**: HA-04

**Done when**:

- [x] Unit tests with today 2026: experience ending 2010 → first bullet, empty text, note; ending 2011, no end year, current → unchanged; old project/education → unchanged; old role with no bullets and empty text → no note (C10-C13)
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): shorten roles that ended more than 15 years ago`

---

### T5: Assemble reports what it restored

**What**: `assemble`'s ok result adds `restored: CareerItem[]` (library items put back, in library order).
**Where**: `src/services/tailor/assemble.ts` (modify)
**Depends on**: T4
**Reuses**: `RESTORED_KINDS`
**Requirement**: HA-03

**Done when**:

- [x] Unit test: model omits one experience and one language → `restored` holds both; model returns all → `restored` empty
- [x] Existing assemble tests pass unchanged in their assertions
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(tailor): return the items assemble restored`

---

### T6: Finish step

**What**: `finish(library, ids, out, today)` → `{ ok, doc, assessment, restored, collapsed }` or `{ ok: false, reason }` with `"assessment"` for a bound violation.
**Where**: `src/services/tailor/finish.ts`
**Depends on**: T5
**Reuses**: `assemble`, assessment rules
**Requirement**: HA-03, HA-04, HA-05, HA-07

**Done when**:

- [x] Unit tests: omissions ordered model → restore → collapse; one note per restored item with a shared title; no note for left-out project/publication/honour; a restored old role collapses; no items returned → every always-kept item restored with one note each; bound violation → `reason: "assessment"` (C8, C9, C14, C44)
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): finish model output into a document and assessment`

---

### T7: Assessment columns (migration 0007)

**What**: Four columns and CHECK on `tailored_resumes`; `pnpm db:generate` migration.
**Where**: `src/db/schema.ts` (modify) + generated `drizzle/0007_*.sql`
**Depends on**: T6
**Reuses**: existing `check(...)` pattern
**Requirement**: HA-06

**Done when**:

- [x] Integration test: columns exist with defaults (`''`, `{}`, `[]`, NULL); insert of score 101 and −1 fails the CHECK; 0 and 100 succeed (C19)
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): store the resume assessment`

---

### T8: Generate stores the assessment

**What**: `Resume.assessment`, system prompt + rules block, `finish` in the retry loop, one update with the four fields, `info` log with counts.
**Where**: `src/services/resume.service.ts` (modify)
**Depends on**: T7
**Reuses**: retry loop, fakes, recording mock
**Requirement**: HA-01, HA-02, HA-07, HA-08

**Done when**:

- [x] Unit tests: out-of-bounds output twice → `LlmUnavailableError`; no PII value or full name in prompt; stored order and filtered skills; empty lists; unchanged after save options, item edit, Add back, preview; null before first generation; unchanged on failure; replaced on second success; system prompt ends with `TAILOR_ASSESSMENT_RULES` after a blank line; input starts with today's date (C4, C5, C20-C25, C27, C29)
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): store the score, gaps and omissions on generate`

---

### T9: Assessment panels view

**What**: `AssessmentPanels` rendered after `ResumeCards` inside `#editor`.
**Where**: `src/admin/resumes/view.tsx` (modify)
**Depends on**: T8
**Reuses**: `card-pad`, `badge`, `muted`
**Requirement**: HA-09, HA-10, HA-11

**Done when**:

- [x] Unit render tests: score + band + rationale; badges in order; no-gaps state; omission rows with reasons in order; nothing-left-out state; only "Not assessed yet" when null; `<script>` in model text escaped (C30-C35, C37)
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): show the resume assessment panels`

---

### T10: Editor routes pass the assessment

**What**: `GET /admin/resumes/:id` and `POST /admin/resumes/:id/generate` build `AssessmentView` with `bandFor(score).label`.
**Where**: `src/admin/resumes/routes.ts` (modify)
**Depends on**: T9
**Reuses**: test app, fake services
**Requirement**: HA-08, HA-11

**Done when**:

- [x] Unit test (test app): GET shows the band label from `SCORE_BANDS`; Generate response swaps in the new panels (C36)
- [x] Walk at 375 px wide: panels below the cards, no horizontal scroll (C38)
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(admin): pass the assessment to the resume editor`

---

### T11: Glossary

**What**: Glossary entries for Assessment, Fit Score, Missing Skill, Omission; "Avoid" lists.
**Where**: `GLOSSARY.md`
**Depends on**: T10
**Reuses**: existing glossary format
**Requirement**: HA-07

**Done when**:

- [x] Terms match the spec and UI labels
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: none
**Gate**: build
**Commit**: `docs: define the resume assessment terms`

---

### T12: Real-model checks and fixtures

**What**: Pure fixtures (library, job) and `runChecks(doc, assessment, fixture, today)` → four results + `exitCode(results)`.
**Where**: `scripts/verify-tailor-checks.ts`
**Depends on**: T11
**Reuses**: `item()` shape from `test/support/career.ts`
**Requirement**: HA-12

**Done when**:

- [x] Unit tests: fixture job requires exactly one skill absent from every fixture item; fixture has one experience ended > 15 years ago with ≥ 3 bullets and one unrelated project; each check fails on a doc that breaks it and passes otherwise; exit 1 when any fails, 0 when all pass (C40-C42)
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `test(tailor): add the real-model check fixtures`

---

### T13: `pnpm verify:tailor` script and paid run

**What**: Script wiring `ResumeService` with fakes + real `LlmService`; `verify:tailor` in `package.json`; one paid run after the user's go-ahead, output saved.
**Where**: `scripts/verify-tailor.ts` (+ one line in `package.json`)
**Depends on**: T12
**Reuses**: `scripts/smoke-structured.ts`, `test/support/resumes.ts`
**Requirement**: HA-12

**Done when**:

- [x] Unit test: running the script with `OPENROUTER_API_KEY` unset exits 2 printing "OPENROUTER_API_KEY is required" (C43)
- [ ] User approved the paid run in chat; output saved to `.specs/features/honest-assessment/real-model-run.md` with four PASS lines (C39)
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(scripts): add the real-model tailor check`

---

## Checks

**C1** - `TailorOutputSchema` requires `score`, `score_rationale`, `missing_skills`, `omissions` (`what`, `reason`), each with a description (HA-01, Assessment returned AC 1)
Proof: run unit | ✓ tailor assessment schema > requires and describes every assessment field

**C2** - The `score` description says it rates the original career library, not the rewritten resume (HA-01, Assessment returned AC 2)
Proof: run unit | ✓ tailor assessment schema > score rates the original career library

**C3** - Each assessment bound passes at its limit and fails one past it (HA-01, Assessment returned AC 3)
Proof: run unit | ✓ assessment bounds > rejects each value one past its bound

**C4** - An out-of-bounds assessment is rejected, retried once, then Generate throws `LlmUnavailableError` (HA-01, Assessment returned AC 3)
Proof: run unit | ✓ resume assessment > rejects an out-of-bounds assessment twice then fails

**C5** - No Personal Info Field value and no full name reaches the model (HA-02, Assessment returned AC 4)
Proof: run unit | ✓ resume assessment > sends no personal info value or full name

**C6** - A restore note reads `{what: "<title> at <organisation>", reason: "<Section> items are always kept; restored by code."}` (HA-03, Restore AC 1)
Proof: run unit | ✓ restore notes > names the title, organisation and section

**C7** - A restore note for an item without organisation has no ` at ` part (HA-03, Restore AC 1)
Proof: run unit | ✓ restore notes > leaves out the organisation when the item has none

**C8** - Two restored items with the same title get one note each (HA-03, Restore AC 2)
Proof: run unit | ✓ finish > adds one restore note per restored item with a shared title

**C9** - A left-out project, publication or honour gets no code note (HA-03, Restore AC 3)
Proof: run unit | ✓ finish > adds no note for a left-out project, publication or honour

**C10** - An experience ending 2010 (today 2026) keeps only its first bullet and empty text (HA-04, Collapse AC 1)
Proof: run unit | ✓ old role collapse > keeps the first bullet and empties the text of a role ended more than 15 years ago

**C11** - The collapse note is added only when a bullet or text was removed (HA-04, Collapse AC 2)
Proof: run unit | ✓ old role collapse > adds the note only when something was removed

**C12** - A role ending 2011, with no end year, or current is unchanged (HA-04, Collapse AC 3)
Proof: run unit | ✓ old role collapse > leaves a role ending 15 years ago, without end year or current unchanged

**C13** - Old items of other kinds are unchanged (HA-04, Collapse AC 4)
Proof: run unit | ✓ old role collapse > leaves other kinds unchanged

**C14** - A restored old role is collapsed too (HA-04, Collapse AC 5)
Proof: run unit | ✓ finish > collapses a restored old role

**C15** - A missing skill equal to a library skill ignoring case is dropped (HA-05, Missing AC 1)
Proof: run unit | ✓ missing skills filter > drops a skill equal to a library skill ignoring case

**C16** - Unmatched missing skills are kept trimmed in model order (HA-05, Missing AC 2)
Proof: run unit | ✓ missing skills filter > keeps unmatched skills trimmed in model order

**C17** - Duplicate missing skills keep the first occurrence (HA-05, Missing AC 3)
Proof: run unit | ✓ missing skills filter > keeps the first of duplicate skills

**C18** - With no library skills every missing skill is kept (HA-05, edge)
Proof: run unit | ✓ missing skills filter > keeps every skill when the library has none

**C19** - Migration adds `score` (NULL, CHECK 0-100), `score_rationale ''`, `missing_skills '{}'`, `omissions '[]'` (HA-06, Stored AC 1)
Proof: run int | ✓ assessment columns > adds the four columns with their defaults and the score check

**C20** - A generation stores score, rationale, filtered skills, and omissions in model → restore → collapse order (HA-07, Stored AC 2)
Proof: run unit | ✓ resume assessment > stores model omissions, then restore notes, then collapse notes

**C21** - Nothing missing or cut stores empty lists (HA-07, Stored AC 3)
Proof: run unit | ✓ resume assessment > stores empty lists when nothing is missing or cut

**C22** - Save options, item edit, Add back and preview leave the assessment unchanged (HA-07, Stored AC 4)
Proof: run unit | ✓ resume assessment > keeps the assessment on save, item edit, add back and preview

**C23** - A new resume has no assessment until its first generation (HA-07, Stored AC 5)
Proof: run unit | ✓ resume assessment > has no assessment before the first generation

**C24** - A failed Generate leaves the stored assessment unchanged (HA-07, Stored AC 6)
Proof: run unit | ✓ resume assessment > keeps the stored assessment when generate fails

**C25** - A second successful Generate replaces the assessment (HA-07, Stored AC 7)
Proof: run unit | ✓ resume assessment > replaces the assessment on a second generation

**C26** - Prompt rubric lines and band labels both come from `SCORE_BANDS` (HA-08, Prompt AC 1)
Proof: run unit | ✓ score rubric > builds prompt lines and labels from SCORE_BANDS

**C27** - The system prompt is the stored tailor prompt, a blank line, then `TAILOR_ASSESSMENT_RULES` (HA-08, Prompt AC 2)
Proof: run unit | ✓ resume assessment > appends the assessment rules to the stored tailor prompt

**C28** - `TAILOR_ASSESSMENT_RULES` holds every rubric line and rules 1-7 (HA-08, Prompt AC 3)
Proof: run unit | ✓ score rubric > rules block holds every rubric line and rules 1 to 7

**C29** - The tailor input starts with `Today's date: YYYY-MM-DD` (HA-08, Prompt AC 4)
Proof: run unit | ✓ resume assessment > input starts with today's date

**C30** - "Why this score" shows `<score> · <band label>` and the rationale (HA-09, Panels AC 1)
Proof: run unit | ✓ assessment panels > shows score, band and rationale

**C31** - "Missing skills" shows one badge per skill in stored order (HA-09, Panels AC 2)
Proof: run unit | ✓ assessment panels > shows one badge per missing skill in order

**C32** - Empty missing skills shows "No significant gaps" and "Your career library covers the role's stated requirements." (HA-09, Panels AC 3)
Proof: run unit | ✓ assessment panels > shows the no gaps state

**C33** - "What was left out" shows one row per omission with `what` and `reason` in stored order (HA-10, Panels AC 4)
Proof: run unit | ✓ assessment panels > shows one row per omission with its reason in order

**C34** - Empty omissions shows "Nothing was left out" and "Your whole career library made it into this resume." (HA-10, Panels AC 5)
Proof: run unit | ✓ assessment panels > shows the nothing left out state

**C35** - A NULL score shows only "Not assessed yet" and "Generate to see the assessment." (HA-11, Panels AC 6)
Proof: run unit | ✓ assessment panels > shows only not assessed yet when the score is null

**C36** - Generate from the editor swaps in the three panels with the new assessment (HA-11, Panels AC 7)
Proof: run unit | ✓ assessment panels > generate swaps in the new assessment

**C37** - Model text in the panels is escaped (HA-11, Panels AC 8)
Proof: run unit | ✓ assessment panels > escapes model text

**C38** - At 375 px wide the panels sit below the resume cards with no horizontal page scroll (HA-11, Panels AC 9)
Proof: walk - editor at 375 px: panels below the cards, `document.documentElement.scrollWidth` equals 375

**C39** - `pnpm verify:tailor` generates through the real `LlmService` and assemble path with no Personal Info Field (HA-12, Real-model AC 1)
Proof: walk - `real-model-run.md` holds the paid run's output with four PASS lines

**C40** - The fixture job requires exactly one skill absent from every fixture item; the fixture has an old role with ≥ 3 bullets and an unrelated project (HA-12, Real-model AC 2)
Proof: run unit | ✓ verify tailor > fixtures hold one absent skill, an old role and an unrelated project

**C41** - The script reports pass or fail for each of the four checks (HA-12, Real-model AC 3)
Proof: run unit | ✓ verify tailor > reports pass or fail for each of the four checks

**C42** - Any failed check makes the exit code 1 (HA-12, Real-model AC 4)
Proof: run unit | ✓ verify tailor > exits 1 when any check fails

**C43** - Without `OPENROUTER_API_KEY` the script exits 2 with "OPENROUTER_API_KEY is required" (HA-12, Real-model AC 5)
Proof: run unit | ✓ verify tailor > exits 2 without OPENROUTER_API_KEY

**C44** - A model reply with no items restores every always-kept item with one note each (HA-03, edge)
Proof: run unit | ✓ finish > restores every always-kept item when the model returns none

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** none
**Walked:** C38 at 375 px (browser pane, test app on fakes, resume generated with a 72 score, 5 missing skills, 2 omissions): `scrollWidth` 375 = `innerWidth`; Why this score, Missing skills, What was left out stack below the Header and item cards (`#assessment` top 3498 px, cards bottom 3475 px). Reach: unit-test app with fakes on a scratch port, admin cookie injected; no dev DB used.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6
Phase 2:  T7 → T8
Phase 3:  T9 → T10
Phase 4:  T11 → T12 → T13
```

Execution is strictly sequential. 13 tasks pack into 2 batches (Phase 1; Phases 2-4), offered to sub-agents before Execute.
