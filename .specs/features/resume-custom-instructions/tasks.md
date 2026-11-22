# Resume Custom Instructions Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (no `design.md`): extends `tailored-resumes`; decisions below.
**Status**: Approved
**Approved**: 2026-11-22 - user: "aprove and implement in a new branch"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests need `docker compose up -d --wait` and `TEST_DATABASE_URL` pointing at `curriculum_test`. Use `rtk proxy pnpm vitest ...` for raw output (STATE Handoff note).

## Design decisions (inline)

- Column `customInstructions: text().notNull().default("")` on `tailoredResumes`; migration `drizzle/0002_*.sql` from `pnpm db:generate`, its own commit, serialized on `main` (AD-003).
- `ResumeInsert` gains `customInstructions: string`; `ResumePatch` gains `customInstructions?: string`.
- `ResumeService` gets one private `checkInstructions(value, fields)`: trims, rejects > 2000 chars with `ValidationError("Custom instructions must be at most 2000 characters", { customInstructions: … })`, rejects a PII hit with `ValidationError("Your <label> is in the custom instructions — keep contact data in Personal info")`. Used by `create`, `save`, `generate`.
- `ResumeInput.customInstructions?: string`; `save(id, content, headerKeys, customInstructions?)`; `generate(id, customInstructions?)`. `undefined` keeps the stored value; a string replaces it.
- Exported `CUSTOM_INSTRUCTIONS_PREAMBLE` (spec text verbatim) and a pure `tailorInput(date, instructions, jobDescription)` in `resume.service.ts`: empty instructions → the pre-feature string exactly; otherwise `Today's date: D\n\n${PREAMBLE}\n${sanitizeMarkers(instructions)}\n\n${dataBlock("JOB_DESCRIPTION", jd)}`.
- `generate` saves the instructions (when given) with `update` before `llm.generate`; on `LlmUnavailableError` they stay saved, `content`/`model` untouched.
- Routes read `customInstructions` with the existing `text()` helper; absent on generate → `undefined`. Generate button gets `hx-include="#custom-instructions"` and the textarea `id="custom-instructions"` sits inside `#resume-form`, so Save's `hx-include="#resume-form"` carries it too.

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (projects unit/integration, no coverage threshold) - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/db/schema.ts` + migration | integration (via repository) | Column exists, default `''` for rows inserted without it | `test/integration/repositories/resume.repository.test.ts` | `pnpm test:int` |
| `src/repositories/resume.repository.ts` | integration | Insert and update store the value | `test/integration/repositories/resume.repository.test.ts` | `pnpm test:int` |
| `src/services/resume.service.ts` | unit, fake repo + recording mock model | 1:1 to spec ACs and every edge case | `test/unit/services/resume.service.test.ts` | `pnpm test:unit` |
| `src/admin/resumes/routes.ts` | unit via test app with fakes; integration on real DB | Every touched route: happy + 400 paths | `test/unit/admin/resumes.test.tsx`, `test/integration/routes/resumes.test.ts` | both |
| `src/admin/resumes/view.tsx` | unit (rendered HTML) | Both textareas, button wiring | `test/unit/admin/resumes.test.tsx` | `pnpm test:unit` |
| `GLOSSARY.md` | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks with unit tests only | `pnpm test:unit` |
| Full | Tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | Phase end, docs-only task | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. 7 tasks: one batch, executed inline.

### Phase 1: Data

```
T1 → T2
```

### Phase 2: Service

```
T2 → T3 → T4
```

### Phase 3: Admin

```
T4 → T5 → T6
```

### Phase 4: Docs

```
T6 → T7
```

---

## Task Breakdown

### T1: Add `custom_instructions` column and migration

**What**: Add `customInstructions: text().notNull().default("")` to `tailoredResumes` and generate migration `drizzle/0002_*.sql` with `pnpm db:generate`.
**Where**: `src/db/schema.ts`
**Depends on**: None
**Reuses**: existing `tailoredResumes` table, `drizzle.config.ts`
**Requirement**: CI-04

**Done when**:

- [x] Migration adds the column with default `''` in schema `curriculum_api`
- [x] Integration test: a resume inserted without the field reads `customInstructions === ""`
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`
- [x] Test count: existing integration tests + 1 pass (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): add custom_instructions to tailored_resumes`
**Status**: ✅ Complete

---

### T2: Repository stores custom instructions

**What**: `ResumeInsert.customInstructions` and `ResumePatch.customInstructions?` passed through `insert` and `update`.
**Where**: `src/repositories/resume.repository.ts`
**Depends on**: T1
**Reuses**: existing `insert`/`update`
**Requirement**: CI-01, CI-03

**Done when**:

- [ ] Integration test: insert stores the value, update replaces it, update without it keeps it
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`
- [ ] Test count: T1 count + 1 pass

**Tests**: integration
**Gate**: full
**Commit**: `feat(resumes): persist custom instructions in the repository`

---

### T3: Service validates and stores custom instructions on create and save

**What**: `checkInstructions` (trim, 2000-char bound, PII Guard) used by `create` and `save`; `ResumeInput.customInstructions?`, `save(…, customInstructions?)`.
**Where**: `src/services/resume.service.ts`
**Depends on**: T2
**Reuses**: `findPii`, `ValidationError`, `personalInfo.allValues()`
**Requirement**: CI-01, CI-03, CI-04, CI-05, CI-06

**Done when**:

- [ ] Unit tests C1, C4, C5, C6, C7, C8 (service rows) pass
- [ ] Every existing `resume service` test passes unchanged
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): validate and save custom instructions`

---

### T4: Generate sends custom instructions to the tailor model

**What**: `CUSTOM_INSTRUCTIONS_PREAMBLE`, `tailorInput(…)`, `generate(id, customInstructions?)` saving before the call.
**Where**: `src/services/resume.service.ts`
**Depends on**: T3
**Reuses**: `dataBlock`, `sanitizeMarkers` (`src/llm/data-block.ts`), recording mock model
**Requirement**: CI-06, CI-07, CI-08, CI-10, CI-11

**Done when**:

- [ ] Unit tests C9-C15, C17, C18 pass
- [ ] `resume service > calls the llm with area tailor…` and `prompt-hardening` tests pass unchanged
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): send custom instructions to the tailor model`

---

### T5: Routes read `customInstructions`

**What**: `POST /admin/resumes`, `PUT /admin/resumes/:id`, `POST /admin/resumes/:id/generate` pass `customInstructions` to the service (absent on generate → `undefined`).
**Where**: `src/admin/resumes/routes.ts`
**Depends on**: T4
**Reuses**: `text()` helper, central `DomainError` handler for 400s
**Requirement**: CI-01, CI-03, CI-05, CI-06, CI-07

**Done when**:

- [ ] Unit route tests C2, C16 (route rows) pass; integration test C19 passes
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(admin): accept custom instructions on resume routes`

---

### T6: Textareas in the create form and the editor

**What**: "Custom instructions" textarea (`name="customInstructions"`) in "New resume" and in `#resume-form` (`id="custom-instructions"`); Generate gets `hx-include="#custom-instructions"`.
**Where**: `src/admin/resumes/view.tsx`
**Depends on**: T5
**Reuses**: `field`/`field-label`/`input` classes of the Job Description textarea
**Requirement**: CI-02, CI-09

**Done when**:

- [ ] Unit tests C3, C20, C21 pass
- [ ] Walk: create a resume with instructions, edit them, Generate - recorded in `## Handoff`
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): edit custom instructions on resumes`

---

### T7: Glossary term

**What**: Add **Custom Instructions** to `GLOSSARY.md` with the spec's definition.
**Where**: `GLOSSARY.md`
**Depends on**: T6
**Reuses**: glossary entry format
**Requirement**: CI-02

**Done when**:

- [ ] Entry present next to **Tailored Resume**
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: none
**Gate**: build
**Commit**: `docs(glossary): define custom instructions`

---

## Checks

**C1** - Creating a resume stores the trimmed `customInstructions`, and `''` when absent (CI-01, Write AC 1)
Proof: run unit | ✓ resume service custom instructions > stores the trimmed custom instructions on create and empty when absent

**C2** - `POST /admin/resumes` passes `customInstructions` from the form to the new resume (CI-01, Write AC 1)
Proof: run unit | ✓ admin resumes custom instructions > create stores the posted custom instructions

**C3** - The "New resume" form has an optional textarea labelled "Custom instructions" named `customInstructions` (CI-02, Write AC 2)
Proof: run unit | ✓ admin resumes custom instructions > new resume form has an optional custom instructions textarea

**C20** - The editor shows a "Custom instructions" textarea holding the stored value (CI-02, Write AC 3)
Proof: run unit | ✓ admin resumes custom instructions > editor shows the stored custom instructions

**C4** - `save` stores the trimmed instructions with content and header fields (CI-03, Write AC 4)
Proof: run unit | ✓ resume service custom instructions > saves the trimmed custom instructions with content and header fields

**C16** - `PUT /admin/resumes/:id` with `customInstructions` answers "Saved" and the value is stored (CI-03, Write AC 4)
Proof: run unit | ✓ admin resumes custom instructions > put saves custom instructions and answers Saved

**C5** - Whitespace-only instructions are stored as `''` (CI-04, edge case)
Proof: run unit | ✓ resume service custom instructions > stores whitespace-only custom instructions as empty

**C22** - A resume inserted without the field reads `customInstructions === ""` (CI-04, edge case pre-migration row)
Proof: run int | ✓ resume repository > reads custom instructions as empty by default

**C23** - Repository insert stores and update replaces custom instructions (CI-01, CI-03)
Proof: run int | ✓ resume repository > stores and updates custom instructions

**C6** - 2000 characters after trim save; 2001 answer `Custom instructions must be at most 2000 characters` on create, save and generate and change nothing (CI-05, Write AC 5 + edge)
Proof: run unit | ✓ resume service custom instructions > accepts 2000 characters and rejects 2001 on create, save and generate without changes

**C7** - A Personal Info Field value answers `Your <label> is in the custom instructions — keep contact data in Personal info` on create, save and generate, changes nothing and does not call the LLM (CI-06, Write AC 6)
Proof: run unit | ✓ resume service custom instructions > rejects a personal info value on create, save and generate without calling the llm

**C8** - The PII and length errors reach the client as 400 (CI-05, CI-06, Write AC 5-6)
Proof: run unit | ✓ admin resumes custom instructions > answers 400 with the length and personal info messages

**C9** - Generate saves the given instructions before calling the LLM (CI-07, Generate AC 1)
Proof: run unit | ✓ resume service custom instructions > saves the custom instructions before calling the llm

**C10** - With instructions, the tailor input is date line, blank line, preamble, newline, instructions, blank line, `JOB_DESCRIPTION` block (CI-07, Generate AC 2)
Proof: run unit | ✓ resume service custom instructions > puts the preamble and instructions between the date and the job description

**C11** - Without instructions, the tailor input equals the pre-feature input (CI-07, Generate AC 3)
Proof: run unit | ✓ resume service custom instructions > builds the pre-feature input when there are no instructions

**C12** - A `<<<JOB_DESCRIPTION_START>>>` typed in the instructions leaves no run of 3+ angle brackets from them in the input (CI-08, Generate AC 4)
Proof: run unit | ✓ resume service custom instructions > strips marker runs from the instructions

**C13** - The call keeps system = `tailorSystemPrompt`, body = Master CV, `maxOutputTokens = 4000` (CI-07, Generate AC 5)
Proof: run unit | ✓ resume service custom instructions > keeps the tailor prompt, master cv and token limit

**C21** - The Generate button carries the editor's `customInstructions` textarea value (CI-09, Generate AC 6)
Proof: run unit | ✓ admin resumes custom instructions > generate button includes the custom instructions textarea

**C14** - On `LlmUnavailableError` the instructions stay saved and `content`/`model` are unchanged (CI-10, Generate AC 7)
Proof: run unit | ✓ resume service custom instructions > keeps the instructions saved and the content unchanged when the llm is unavailable

**C15** - The recording mock model receives no Personal Info Field value and no `fullName` when instructions are set (CI-11, Generate AC 8)
Proof: run unit | ✓ resume service pii > sends no personal info value or full name to the model with custom instructions

**C17** - Generate without `customInstructions` uses the stored value unchanged (CI-07, edge case)
Proof: run unit | ✓ resume service custom instructions > uses the stored instructions when generate receives none

**C18** - Generate route saves the posted instructions and returns the editor fragment (CI-07, Generate AC 1)
Proof: run unit | ✓ admin resumes custom instructions > generate saves the posted custom instructions

**C19** - On the real database: create with instructions, generate, the recorded input carries them, reload shows them (CI-07, CI-01)
Proof: run int | ✓ resumes with database > generates with custom instructions on the real database

---

## Handoff

**Settled mid-build:** none
**Dispatched:** batch worker T1-T7 (single batch, inline-equivalent), branch feat/resume-custom-instructions
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2
Phase 2:  T3 ------→ T4
Phase 3:  T5 ------→ T6
Phase 4:  T7
```

Execution is strictly sequential. 7 tasks fit one batch: executed inline, no batch sub-agents. Verifier runs after T7.
