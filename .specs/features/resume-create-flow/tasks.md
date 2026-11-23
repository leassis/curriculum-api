# Resume Create Flow Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (no `design.md`): extends `tailored-resumes`; decisions below.
**Status**: Approved
**Approved**: 2026-11-23 - user: "Approved"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Unit tests only (fake repo + recording mock model); no database needed. Use `rtk proxy pnpm vitest ...` for raw output (STATE Handoff note).

## Design decisions (inline)

- `ResumeInput` gains `headerKeys?: string[]` (posted `headerFields`; `undefined` = the form posted none because the Owner has no Personal Info Fields). A private `headerFieldsFor(keys, existing)` shared with `save` returns `null` when every existing key is kept, else the kept keys filtered to existing ones (unknown keys dropped).
- `ResumeService.create` stays the validating insert and now stores `headerFields`. New `createAndGenerate(input): Promise<{ resume: Resume; error?: "generate" | "master-cv" }>`: runs `create` (its `ValidationError`s propagate, nothing stored), then `generate(resume.id)`; `LlmUnavailableError` → `error: "generate"`, a `ValidationError` with message "Fill the master CV first" → `error: "master-cv"`; the resume stays either way. Any other error propagates.
- `POST /admin/resumes` parses `parseBody({ all: true })`, passes `headerFields` as `headerKeys` (omitted field and no Personal Info Fields → `undefined`; fields exist but none checked → `[]`), calls `createAndGenerate`, redirects 303 to `/admin/resumes/:id` plus `?error=<code>` on failure.
- Form posts a hidden marker so "every box unchecked" is distinguishable from "no fieldset": the fieldset is rendered only when options exist, and the route treats a missing `headerFields` as `[]` only when the form had options. Marker: hidden input `headerFieldsPosted=1` inside the fieldset.
- `GET /admin/resumes/:id` reads `?error`; `generate` → "Generation failed, try again", `master-cv` → "Fill the master CV first", anything else → none. `Editor` gets an optional `error` prop rendered inside `#editor-status`.
- Create form gets `hx-boost`-free plain POST: busy state via a small inline `onsubmit` handler that disables the button and reveals "Generating…" (no new client bundle).

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (projects unit/integration, no coverage threshold) - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/services/resume.service.ts` | unit, fake repo + recording mock model | 1:1 to spec ACs and every edge case | `test/unit/services/resume.service.test.ts` | `pnpm test:unit` |
| `src/admin/resumes/routes.ts` | unit via test app with fakes | Create route: happy, failure redirects, 400, editor error text | `test/unit/admin/resumes.test.tsx` | `pnpm test:unit` |
| `src/admin/resumes/view.tsx` | unit (rendered HTML) | Fieldset, busy-state wiring, error text | `test/unit/admin/resumes.test.tsx` | `pnpm test:unit` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks with unit tests only | `pnpm test:unit` |
| Build | Last task | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. 5 tasks: one batch, executed inline.

```
T1 → T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Create stores the chosen Personal header

**What**: `ResumeInput.headerKeys?`, shared `headerFieldsFor`, `create` stores `headerFields`.
**Where**: `src/services/resume.service.ts`
**Depends on**: None
**Reuses**: the all/kept logic of `save`
**Requirement**: RCF-03

**Done when**:

- [x] Unit tests C5, C6, C16, C17 pass
- [x] Every existing `resume service` test passes unchanged
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): store the personal header chosen on create`
**Status**: ✅ Complete

---

### T2: `createAndGenerate` keeps the resume on failure

**What**: `createAndGenerate(input)` returning `{ resume, error? }`.
**Where**: `src/services/resume.service.ts`
**Depends on**: T1
**Reuses**: `create`, `generate`, `LlmUnavailableError`, `ValidationError`
**Requirement**: RCF-02, RCF-05, RCF-06, RCF-09

**Done when**:

- [x] Unit tests C2, C8 (service), C9, C10, C18 pass
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): create and generate in one service call`
**Status**: ✅ Complete

---

### T3: Create route generates and redirects

**What**: `POST /admin/resumes` parses header keys, calls `createAndGenerate`, redirects 303 with `?error=` on failure; update the old create-redirect test.
**Where**: `src/admin/resumes/routes.ts`
**Depends on**: T2
**Reuses**: central `DomainError` handler for 400s
**Requirement**: RCF-02, RCF-05, RCF-06

**Done when**:

- [x] Unit tests C3, C4, C8 (route), C9, C10 route rows pass
- [x] `admin resumes > creates a resume and redirects with 303` updated to the new redirect and passes
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): generate on resume create`
**Status**: ✅ Complete

---

### T4: Editor shows the create error

**What**: `GET /admin/resumes/:id` reads `?error` and `Editor` renders the fixed text in `#editor-status`.
**Where**: `src/admin/resumes/routes.ts`, `src/admin/resumes/view.tsx`
**Depends on**: T3
**Reuses**: `#editor-status` line, existing generate failure text
**Requirement**: RCF-07, RCF-08

**Done when**:

- [x] Unit tests C11, C12, C13, C14 pass
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): show create-time generation errors in the editor`
**Status**: ✅ Complete

---

### T5: Personal header and busy state on the create form

**What**: "Personal header" fieldset (all checked, hidden `headerFieldsPosted`, omitted without options) and disable-on-submit with "Generating…" on the "New resume" form.
**Where**: `src/admin/resumes/view.tsx`, `src/admin/resumes/routes.ts` (pass options to `ResumesPage`)
**Depends on**: T4
**Reuses**: fieldset markup of the editor, `htmx-indicator` text style
**Requirement**: RCF-01, RCF-04

**Done when**:

- [ ] Unit tests C1, C7, C15 pass
- [ ] Walk: create a resume with one box unchecked, see the editor with the draft; make the model fail and see the error - recorded in `## Handoff`
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(admin): choose the personal header on the new resume form`
**Status**: ⬜ Pending

---

## Checks

**C1** - The "New resume" form has a "Personal header" fieldset with one checked checkbox per Personal Info Field (RCF-01, Create AC 1)
Proof: run unit | ✓ admin resumes create flow > new resume form has a checked personal header checkbox per field

**C2** - `createAndGenerate` creates the resume and generates with the same input as generate (RCF-02, Create AC 2)
Proof: run unit | ✓ resume service create flow > creates then generates with the generate input

**C3** - `POST /admin/resumes` answers 303 to `/admin/resumes/:id` after creating and generating (RCF-02, Create AC 2)
Proof: run unit | ✓ admin resumes create flow > create generates and redirects to the editor

**C4** - The editor after the redirect shows the generated content in the Markdown field and preview (RCF-02, Create AC 3)
Proof: run unit | ✓ admin resumes create flow > editor after create holds the generated content

**C5** - Unchecked boxes: exactly the checked keys are stored as `headerFields` (RCF-03, Create AC 4)
Proof: run unit | ✓ resume service create flow > stores exactly the checked header keys

**C6** - All boxes checked stores `headerFields = null` (RCF-03, Create AC 5)
Proof: run unit | ✓ resume service create flow > stores null when every header box is checked

**C7** - The create form disables its button and shows "Generating…" while submitting (RCF-04, Create AC 6)
Proof: run unit | ✓ admin resumes create flow > create form disables the button and shows generating text

**C8** - Empty title or Job Description, over-long or PII custom instructions answer 400, store nothing and do not call the LLM (RCF-05, Create AC 7)
Proof: run unit | ✓ admin resumes create flow > answers 400 and stores nothing for invalid input

**C9** - `LlmUnavailableError` keeps the resume (content empty, model null, header stored) and redirects to `?error=generate` (RCF-06, Failure AC 1)
Proof: run unit | ✓ admin resumes create flow > keeps the resume and redirects with error generate when the llm fails

**C10** - An empty Master CV keeps the resume and redirects to `?error=master-cv` (RCF-06, Failure AC 2)
Proof: run unit | ✓ admin resumes create flow > keeps the resume and redirects with error master-cv when the master cv is empty

**C11** - Editor with `?error=generate` shows "Generation failed, try again" in the status line (RCF-07, Failure AC 3)
Proof: run unit | ✓ admin resumes create flow > editor shows the generation failed text for error generate

**C12** - Editor with `?error=master-cv` shows "Fill the master CV first" in the status line (RCF-07, Failure AC 4)
Proof: run unit | ✓ admin resumes create flow > editor shows the master cv text for error master-cv

**C13** - Editor with any other `error` value shows no error text (RCF-07, Failure AC 5)
Proof: run unit | ✓ admin resumes create flow > editor shows no error text for an unknown error value

**C14** - Generate on the editor opened after a failure works as today (RCF-08, Failure AC 6)
Proof: run unit | ✓ admin resumes create flow > generate works on the editor opened after a failed create

**C15** - With no Personal Info Fields the fieldset is omitted and create stores `headerFields = null` (RCF-01, edge)
Proof: run unit | ✓ admin resumes create flow > omits the fieldset and stores null without personal info fields

**C16** - A posted header key that matches no Personal Info Field is ignored (RCF-03, edge)
Proof: run unit | ✓ resume service create flow > ignores unknown header keys

**C17** - Every box unchecked stores `headerFields = []` (RCF-03, edge)
Proof: run unit | ✓ resume service create flow > stores an empty list when every header box is unchecked

**C18** - The recording mock model receives no Personal Info Field value and no `fullName` on create (RCF-09, edge)
Proof: run unit | ✓ resume service create flow > sends no personal info value or full name to the model on create

---

## Handoff

**Settled mid-build:** none
**Dispatched:** batch worker T1-T5 (started, not returned)
**Walked:** not yet

---

## Phase Execution Map

```
T1 → T2 → T3 → T4 → T5
```

Execution is strictly sequential. 5 tasks fit one batch: executed inline, no batch sub-agents. Verifier runs after T5.
