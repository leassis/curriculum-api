# Structured Resume Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/structured-resume/design.md`
**Status**: Approved
**Approved**: 2026-11-23 - user: "Approve, use sonnet for phase 1, opus for phase 2"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests create a throwaway Neon branch per run (needs `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` in `.env`/`.env.local`). Use `rtk proxy pnpm vitest ...` for raw output.

## Decisions made while writing tasks

- **Two migration files, one feature.** `0003` adds `structured jsonb` (T11); `0004` sets `model = NULL` and drops `content` (T21, last code task). Dropping `content` first would break the type check of every task in between. Both ship together; Store AC 1-2 hold after `0004`. Neither is run against production without the user's go-ahead.
- **T2 is a manual real-model smoke.** It runs one structured call against `MODEL_TAILOR` and costs a few cents. It needs `OPENROUTER_API_KEY` and the user's go-ahead to run; its output goes to `smoke-run.md`. If it fails, T1's settings switch to `structuredOutputs: { strict: false }` and T2 runs again before Phase 2.
- **Shared fixture.** `test/support/resume-document.ts` exports `sampleCv` (markdown with intro, Experience with two roles one sharing a heading, Education, Skills) and `sampleDocument()`; every later test uses them.

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (projects unit/integration, no coverage threshold) - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/services/tailor/*` (pure) | unit | Every branch; 1:1 to spec ACs and edge cases | `test/unit/services/tailor/*.test.ts` | `pnpm test:unit` |
| `src/llm/openrouter.ts` | unit | Settings passed only when structured | `test/unit/llm/openrouter.test.ts` | `pnpm test:unit` |
| `src/services/llm.service.ts` | unit, recording mock | Success, invalid output, outage, PII guard | `test/unit/services/llm.service.test.ts` | `pnpm test:unit` |
| `src/services/resume.service.ts`, `recruiter-chat.service.ts` | unit, fakes + recording mock | 1:1 to spec ACs, every edge case | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| `src/db/schema.ts` + migrations | integration | Column added, content dropped, rows kept | `test/integration/db/constraints.test.ts`, `test/integration/db/structured-migration.test.ts` | `pnpm test:int` |
| `src/repositories/*` | integration | Read/write `structured`, recruiter read | `test/integration/repositories/*.test.ts` | `pnpm test:int` |
| `src/admin/resumes/{routes,view}` | unit (test app) + integration (real DB) | Every touched route: happy + 400 + 502 | `test/unit/admin/resumes.test.tsx`, `test/integration/routes/resumes.test.ts` | both |
| `scripts/smoke-structured.ts` | none (manual real-model run) | - | - | manual |
| `GLOSSARY.md`, `RUNNING.md` | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks with unit tests only | `pnpm test:unit` |
| Full | Tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | Phase end, docs/script-only tasks | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. 22 tasks → 3 batches (Phase 1 = 8, Phase 2 = 10, Phase 3 = 4), offered to sub-agents (memory: user delegates implementation).

### Phase 1: Pure tailor modules and provider

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 2: LLM, data and services

```
T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18
```

### Phase 3: Admin, drop markdown, docs

```
T18 → T19 → T20 → T21 → T22
```

---

## Task Breakdown

### T1: OpenRouter factory structured option

**What**: `ModelFactory = (modelId, opts?: { structured?: boolean })`; with `structured`, pass `{ provider: { require_parameters: true }, plugins: [{ id: "response-healing" }] }` as `OpenRouterChatSettings`.
**Where**: `src/llm/openrouter.ts`
**Depends on**: None
**Reuses**: `createOpenRouter`
**Requirement**: SR-02

**Done when**:

- [x] Unit test: structured model carries the two settings; default model carries neither
- [x] Gate check passes: `pnpm test:unit`
- [x] Test count: existing unit tests + 2 pass

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(llm): add structured-output settings to the OpenRouter factory`

---

### T2: Manual real-model smoke of structured output

**What**: Script that sends one `generateText` with `Output.object` of a two-field zod schema to `MODEL_TAILOR` through `createProvider(...)(id, { structured: true })` and prints the parsed object or the error class and message.
**Where**: `scripts/smoke-structured.ts`
**Depends on**: T1
**Reuses**: `createProvider`, `resolveConfig`
**Requirement**: SR-02

**Done when**:

- [x] Script exits 2 with "OPENROUTER_API_KEY is required" when the key is missing
- [x] User approved the paid run; output saved to `.specs/features/structured-resume/smoke-run.md`
- [x] Parsed object printed (or T1 switched to `strict: false` and re-run until it is)
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Status**: ✅ Complete

**Tests**: none
**Gate**: build
**Commit**: `chore(scripts): add structured-output smoke for the tailor model`

---

### T3: Resume Document schema

**What**: `ResumeDocumentSchema`, `ResumeDocument`, `parseDocument` (first failing path), `stripPrefix`; plus the shared fixture `test/support/resume-document.ts`.
**Where**: `src/services/tailor/document.ts`
**Depends on**: T2
**Reuses**: zod
**Requirement**: SR-15, SR-05

**Done when**:

- [x] Unit tests for every bound in spec Assumptions, `version` literal, `kind` enum, empty heading, 100 000-char total, path format, `stripPrefix` cases
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): add the Resume Document zod schema`

---

### T4: Master CV parser

**What**: `parseMasterCv(md)` → `ParsedCv | null` with sections, items, kinds, ids and the annotated CV; `sectionKind(title)`.
**Where**: `src/services/tailor/parse-cv.ts`
**Depends on**: T3
**Reuses**: `ResumeDocument` kinds
**Requirement**: SR-01, SR-04

**Done when**:

- [x] Unit tests: intro, lead text, items, bullets vs text, deeper headings stay text, English/Portuguese kinds with accents and case, duplicate headings get distinct ids, no `## ` → null, annotated tags
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): parse the Master CV into sections and items`

---

### T5: Tailor output schema

**What**: `TailorOutputSchema` (all fields required, every field `.describe()`d, no length keywords) and `TailorOutput`.
**Where**: `src/services/tailor/output.ts`
**Depends on**: T4
**Reuses**: zod
**Requirement**: SR-02

**Done when**:

- [x] Unit test: `z.toJSONSchema(TailorOutputSchema)` has a description on every property and no `maxLength`/`maxItems`
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): add the model-facing output schema`

---

### T6: Assembler

**What**: `assemble(parsed, output)` → document in source order with source titles/kinds/headings, prefixes stripped, empty sections dropped, `unknown_id` / `duplicate_id` / `schema` failures.
**Where**: `src/services/tailor/assemble.ts`
**Depends on**: T5
**Reuses**: `parseDocument`, `stripPrefix`
**Requirement**: SR-02, SR-03, SR-05

**Done when**:

- [x] Unit tests 1:1 to Generate AC 3-5, 8 and edges (duplicate headings, section with no items)
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): assemble a Resume Document with code-owned headings`

---

### T7: Markdown renderer

**What**: `renderResumeMarkdown(doc)` per Outputs AC 1.
**Where**: `src/services/tailor/render.ts`
**Depends on**: T6
**Reuses**: `ResumeDocument`
**Requirement**: SR-13

**Done when**:

- [x] Unit test: exact markdown for `sampleDocument()`; intro has no `##`
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): render a Resume Document to markdown`

---

### T8: Form codec

**What**: `documentFromForm(body)` and `applyOp(doc, op, target)`.
**Where**: `src/services/tailor/form.ts`
**Depends on**: T7
**Reuses**: `parseDocument`
**Requirement**: SR-10

**Done when**:

- [x] Unit tests: numeric key order, bullets split and blank lines dropped, empty section dropped, remove, up, down, no-op at edges
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (phase end)

**Status**: ✅ Complete

**Tests**: unit
**Gate**: build
**Commit**: `feat(tailor): build documents from the editor form and apply item ops`

---

### T9: Recording mock records the response format

**What**: `RecordedCall.responseFormat`; `text` option already returns JSON for structured calls.
**Where**: `test/support/mock-llm.ts`
**Depends on**: T8
**Reuses**: `MockLanguageModelV4`
**Requirement**: SR-02

**Done when**:

- [x] Unit test in `test/unit/llm/mock-llm.test.ts` asserts the recorded schema
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `test(support): record the response format in the mock model`

---

### T10: LlmService.generateObject

**What**: Structured call reusing `prepare`; `NoObjectGeneratedError` → new `LlmOutputInvalidError` (in `services/errors.ts`), other errors → `LlmUnavailableError`; usage logged as `generate` does.
**Where**: `src/services/llm.service.ts`
**Depends on**: T9
**Reuses**: `prepare`, `logCall`, `redactPii`
**Requirement**: SR-02, SR-07

**Done when**:

- [x] Unit tests: object returned, schema with descriptions recorded, invalid JSON → `LlmOutputInvalidError`, provider error → `LlmUnavailableError`, PII in body → `PiiLeakError`, model called with `structured: true`
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(llm): add structured generateObject to LlmService`

---

### T11: `structured` column (migration 0003)

**What**: `structured: jsonb()` on `tailoredResumes`; `pnpm db:generate` → `drizzle/0003_*.sql`.
**Where**: `src/db/schema.ts`
**Depends on**: T10
**Reuses**: AD-001 schema
**Requirement**: SR-08

**Done when**:

- [x] Integration test: a new row reads `structured === null`
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`

**Status**: ✅ Complete

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): add structured jsonb to tailored_resumes`

---

### T12: Repositories read and write `structured`

**What**: `ResumeRepo` insert/update/find carry `structured`; `RecruiterChatRepo.resumeDocument(id)` returns the raw jsonb or null; fakes updated.
**Where**: `src/repositories/resume.repository.ts`
**Depends on**: T11
**Reuses**: existing queries
**Requirement**: SR-08, SR-14

**Done when**:

- [x] Integration tests: round-trip of `sampleDocument()`; recruiter read returns it and null for no link
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`

**Status**: ✅ Complete

**Tests**: integration
**Gate**: full
**Commit**: `feat(repositories): read and write the resume document`

---

### T13: Custom Instructions delimiter in `tailorInput`

**What**: Wrap instructions in `<custom_instructions>`…`</custom_instructions>` after removing both tags (AD-007); empty → no tag.
**Where**: `src/services/resume.service.ts`
**Depends on**: T12
**Reuses**: `sanitizeMarkers`, `CUSTOM_INSTRUCTIONS_PREAMBLE`
**Requirement**: SR-06

**Done when**:

- [x] Unit tests for both ACs; existing `resume-custom-instructions` input-format test updated to the new format
- [x] Gate check passes: `pnpm test:unit`

**Status**: ✅ Complete

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): delimit custom instructions in the tailor input`

---

### T14: ResumeService.get parses the stored document

**What**: `Resume` gains `document: ResumeDocument | null` and `invalid: boolean`; invalid → error log `stored resume document invalid {id, path}`.
**Where**: `src/services/resume.service.ts`
**Depends on**: T13
**Reuses**: `parseDocument`
**Requirement**: SR-15

**Done when**:

- [ ] Unit tests: valid, null, invalid (log fields asserted, no content logged)
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): parse the stored document on read`

---

### T15: ResumeService.generate builds a document

**What**: Parse CV (400 on null), `generateObject` with annotated CV + `TailorOutputSchema`, `assemble`, two attempts with warn log `tailor output rejected {reason}`, then `LlmUnavailableError`; stores `structured` and `model`; `TAILOR_MAX_OUTPUT_TOKENS = 6000`.
**Where**: `src/services/resume.service.ts`
**Depends on**: T14
**Reuses**: `checkInstructions`, `tailorInput`, `parseMasterCv`, `assemble`
**Requirement**: SR-01 … SR-07

**Done when**:

- [ ] Unit tests 1:1 to Generate AC 1-7, 11 and the no-PII edge
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): generate a structured resume with one retry`

---

### T16: ResumeService.save and formOp

**What**: `save(id, body, headerKeys, instructions?)` → `documentFromForm` → `parseDocument` (400 with path) → PII over every string → update; `formOp(id, body, op, target)` returns the unsaved document.
**Where**: `src/services/resume.service.ts`
**Depends on**: T15
**Reuses**: `documentFromForm`, `applyOp`, `findPii`
**Requirement**: SR-10, SR-11, SR-15

**Done when**:

- [ ] Unit tests 1:1 to Edit AC 3-7 and Store AC 5-6
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): save and edit the resume document`

---

### T17: Print and download from the document

**What**: `printData` and `download` render through `renderResumeMarkdown`; NULL/invalid → existing empty state.
**Where**: `src/services/resume.service.ts`
**Depends on**: T16
**Reuses**: `renderResumeMarkdown`, `buildPrint`
**Requirement**: SR-13

**Done when**:

- [ ] Unit tests 1:1 to Outputs AC 2, 3, 6
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): render print and download from the document`

---

### T18: Recruiter context from the document

**What**: `RecruiterChatService` reads `resumeDocument`, parses it, sends `renderResumeMarkdown`; NULL/invalid → Master CV.
**Where**: `src/services/recruiter-chat.service.ts`
**Depends on**: T17
**Reuses**: `renderResumeMarkdown`, `parseDocument`
**Requirement**: SR-14

**Done when**:

- [ ] Unit tests 1:1 to Outputs AC 4-5
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (phase end)

**Tests**: unit
**Gate**: build
**Commit**: `feat(recruiter): send the linked resume document as career body`

---

### T19: Editor view renders the document form

**What**: `DocumentForm`, "Not generated yet" and invalid-data states, op buttons wiring, Generate `hx-confirm` when a document exists; pure JSX.
**Where**: `src/admin/resumes/view.tsx`
**Depends on**: T18
**Reuses**: existing `Editor`, `Layout`, design-system classes
**Requirement**: SR-09, SR-12

**Done when**:

- [ ] Unit tests (rendered HTML): Edit AC 1-2, Store AC 9 message, button `hx-vals`, escaping
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): render the resume document as an edit form`

---

### T20: Editor routes for save, form ops and preview

**What**: `PUT /resumes/:id` and `POST /resumes/:id/preview` read the form with `parseBody({ all: true, dot: true })`; new `POST /resumes/:id/form`; create flow maps the unstructured-CV 400 to `?error=structure` with message "Structure the master CV with ## sections and ### items".
**Where**: `src/admin/resumes/routes.ts`
**Depends on**: T19
**Reuses**: `ErrorFragment`, `CREATE_ERRORS`
**Requirement**: SR-04, SR-10, SR-11, SR-12

**Done when**:

- [ ] Unit tests (test app) for every touched route: happy, 400, 502
- [ ] Integration test: generate → remove → move → save → reload shows the change
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(admin): save, reorder and preview the resume document`

---

### T21: Drop `content` (migration 0004)

**What**: Remove `content` from `tailoredResumes`; `drizzle/0004_*.sql` sets `model = NULL` and drops `content`; remove the last references.
**Where**: `src/db/schema.ts`
**Depends on**: T20
**Reuses**: —
**Requirement**: SR-08

**Done when**:

- [ ] Integration test `structured-migration`: row inserted at `0003` keeps id, title, company, JD, instructions, header fields and recruiter link after `0004`; `content` column gone; `model` NULL
- [ ] `grep -rn "\.content\b" src/services/resume.service.ts src/admin/resumes` finds nothing about resumes
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db)!: drop markdown content from tailored_resumes`

---

### T22: Glossary and running notes

**What**: Glossary **Resume Document**; Tailored Resume definition says "stored as a Resume Document"; RUNNING.md notes migration `0004` discards generated resume texts.
**Where**: `GLOSSARY.md`
**Depends on**: T21
**Reuses**: —
**Requirement**: SR-08

**Done when**:

- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: none
**Gate**: build
**Commit**: `docs: define Resume Document and note the content drop`

---

## Checks

**C1** - Generate sends the model the annotated Master CV with every section and item id, kind and heading (SR-01, Generate AC 1)
Proof: run unit | ✓ resume service structured generate > sends the annotated master cv with ids kinds and headings

**C2** - The parser assigns `s`/`i` ids in source order, kinds from the AD-006 list ignoring case and accents, and distinct ids to duplicate headings (SR-01, Generate AC 1)
Proof: run unit | ✓ parse master cv > assigns ids in source order and kinds ignoring case and accents

**C3** - Deeper headings stay inside the item's text and a section without items keeps its lead text (SR-01, edges)
Proof: run unit | ✓ parse master cv > keeps deeper headings in item text and lead text in sections without items

**C4** - The model call carries `TailorOutputSchema` with a description on every field (SR-02, Generate AC 2)
Proof: run unit | ✓ llm service generate object > sends the schema with a description on every field

**C5** - A reply that does not parse against the schema raises `LlmOutputInvalidError`; a provider error raises `LlmUnavailableError` (SR-02, Generate AC 2)
Proof: run unit | ✓ llm service generate object > tells invalid output apart from an outage

**C6** - Structured calls use `require_parameters` and `response-healing`; plain calls do not (SR-02, Generate AC 2)
Proof: run unit | ✓ openrouter factory > adds structured settings only for structured calls

**C7** - The assembled document keeps source titles, kinds and headings character for character in source order, whatever the bodies say (SR-02, Generate AC 3)
Proof: run unit | ✓ assemble > copies titles kinds and headings from the source in source order

**C8** - An item id left out by the model is absent from the document (SR-02, Generate AC 4)
Proof: run unit | ✓ assemble > drops items the model left out

**C9** - Unknown or repeated ids, or an invalid reply, trigger exactly one more model call with the same input (SR-03, Generate AC 5)
Proof: run unit | ✓ resume service structured generate > retries once on invalid output unknown id or duplicate id

**C10** - A second failure answers `LlmUnavailableError` and leaves `structured` and `model` unchanged (SR-03, Generate AC 6)
Proof: run unit | ✓ resume service structured generate > leaves the resume unchanged after two failed attempts

**C11** - A Master CV with no `## ` heading answers 400 "Structure the master CV with ## sections and ### items" with no LLM call (SR-04, Generate AC 7)
Proof: run unit | ✓ resume service structured generate > rejects a master cv without sections before calling the llm

**C12** - Create with an unstructured Master CV redirects to `?error=structure` and the editor shows the message (SR-04, Generate AC 7)
Proof: run unit | ✓ admin resumes structured > create maps an unstructured master cv to the structure error

**C13** - Leading `#{1,6} `, `- ` and `* ` are stripped from returned strings (SR-05, Generate AC 8)
Proof: run unit | ✓ assemble > strips heading and bullet prefixes from returned strings

**C14** - Non-empty Custom Instructions are wrapped in `<custom_instructions>` tags with inner tags removed (SR-06, Generate AC 9)
Proof: run unit | ✓ tailor input > wraps custom instructions in the delimiter and removes inner tags

**C15** - Empty Custom Instructions produce no `<custom_instructions>` tag (SR-06, Generate AC 10)
Proof: run unit | ✓ tailor input > adds no delimiter when custom instructions are empty

**C16** - No Personal Info Field value and no `profile.fullName` reach the model on Generate (SR-07, Generate AC 11)
Proof: run unit | ✓ resume service structured generate > sends no personal info and no full name to the model

**C17** - Migration `0003` adds `structured` NULL on new rows (SR-08, Store AC 1)
Proof: run int | ✓ tailored resumes structured column > new rows have a null structured document

**C18** - After `0004`, existing rows keep id, title, company, JD, instructions, header fields and recruiter links; `content` is gone; `model` is NULL (SR-08, Store AC 1-2)
Proof: run int | ✓ structured migration > keeps resume rows and links and drops content

**C19** - A created resume has `structured` NULL until its first successful generation (SR-08, Store AC 3)
Proof: run unit | ✓ resume service structured generate > keeps structured null until the first successful generation

**C20** - The `ResumeDocument` type is inferred from `ResumeDocumentSchema` and every bound rejects (SR-15, Store AC 4)
Proof: run unit | ✓ resume document schema > enforces every bound version kind and heading

**C21** - Generate and Save parse the document with `ResumeDocumentSchema` before writing (SR-15, Store AC 5)
Proof: run unit | ✓ resume service save > parses the document before writing

**C22** - A Save that fails the schema answers 400 naming the first failing path and stores nothing (SR-15, Store AC 6; SR-11, Edit AC 7)
Proof: run unit | ✓ resume service save > rejects an invalid document with the failing path and stores nothing

**C23** - An assembled document that fails the schema counts as a schema failure and is retried (SR-15, Store AC 7)
Proof: run unit | ✓ assemble > reports a document over the bounds as a schema failure

**C24** - Reading a valid stored document returns it parsed (SR-15, Store AC 8)
Proof: run unit | ✓ resume service get > returns the parsed stored document

**C25** - An invalid stored document logs `stored resume document invalid` with id and path, no content, and the editor shows the invalid-data message with Generate and no form (SR-15, Store AC 9)
Proof: run unit | ✓ admin resumes structured > shows the invalid data message for a corrupt stored document

**C26** - The editor shows per section title and text, and per item heading, text and one-bullet-per-line fields (SR-09, Edit AC 1)
Proof: run unit | ✓ admin resumes structured > editor shows the document as a form

**C27** - With `structured` NULL the editor shows "Not generated yet" and Generate, no form (SR-09, Edit AC 2)
Proof: run unit | ✓ admin resumes structured > editor shows not generated yet without a document

**C28** - Save stores the document from the form, ignoring blank bullet lines, and answers "Saved" (SR-10, Edit AC 3)
Proof: run unit | ✓ admin resumes structured > save stores the form document and answers saved

**C29** - Remove takes the item out of the returned form, and Save then stores it without the item (SR-10, Edit AC 4)
Proof: run int | ✓ resumes structured editing > removes an item and saves without it

**C30** - Move up / Move down swap with the neighbour in the same section and Save stores the order; edges are no-ops (SR-10, Edit AC 5)
Proof: run unit | ✓ form codec > moves items within their section and ignores moves past the edges

**C31** - A Save whose strings hold a Personal Info Field value answers 400 with the existing message and stores nothing (SR-11, Edit AC 6)
Proof: run unit | ✓ resume service save > rejects personal info in any document string

**C32** - The preview returns the rendered HTML of the posted form (SR-12, Edit AC 8)
Proof: run unit | ✓ admin resumes structured > preview renders the posted form

**C33** - After a successful Generate the swapped editor shows the new document in the form (SR-12, Edit AC 9)
Proof: run unit | ✓ admin resumes structured > generate swaps in the form with the new document

**C34** - The markdown renderer outputs `## title`, text, `### heading`, text and `- bullet` in stored order, no `##` for intro (SR-13, Outputs AC 1)
Proof: run unit | ✓ render resume markdown > renders sections items and bullets in stored order

**C35** - Print View body is the HTML of the rendered markdown with the Personal Header (SR-13, Outputs AC 2)
Proof: run unit | ✓ resume service outputs > print view renders the document

**C36** - The markdown download is the header lines followed by the rendered markdown (SR-13, Outputs AC 3)
Proof: run unit | ✓ resume service outputs > markdown download renders the document

**C37** - A recruiter chat linked to a resume sends the rendered markdown as Career Body (SR-14, Outputs AC 4)
Proof: run unit | ✓ recruiter chat service > sends the linked resume document rendered as markdown

**C38** - A linked resume with NULL or invalid `structured` falls back to the Master CV (SR-14, Outputs AC 5)
Proof: run unit | ✓ recruiter chat service > falls back to the master cv when the linked resume has no document

**C39** - Print View and download of a resume with `structured` NULL show the existing empty state (SR-13, Outputs AC 6)
Proof: run unit | ✓ resume service outputs > print and download show the empty state without a document

**C40** - Removing every item of a section with empty text drops the section on Save; a blank-only bullets field stores `bullets: []` (SR-10, edges)
Proof: run unit | ✓ form codec > drops empty sections and stores blank bullets as an empty list

---

## Handoff

**Settled mid-build:** Batch models - user: "use sonnet for phase 1, opus for phase 2"; Phase 3 model not stated yet.
**Dispatched:** Phase 1 batch worker (sonnet) at afe02fb, part 1 = T1 + T2 script (no paid run), returned; paid smoke run by orchestrator with user go-ahead ("Yes, run it"), passed; part 2 = T3-T8 sent to the same worker, returned at 9ada9ac; Phase 2 batch worker (opus) T9-T18 at 9ada9ac
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
Phase 2:  T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18
Phase 3:  T19 → T20 → T21 → T22
```
