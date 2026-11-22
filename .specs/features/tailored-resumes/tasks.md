# Tailored Resumes Tasks

**Design**: inline (no `design.md`): conforms to foundation design and AD-002/AD-003. Decisions below.
**Status**: Approved - aprovado pelo usuário via prompt do orquestrador (2026-11-22)
**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests need `docker compose up -d` and `TEST_DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/curriculum_test`.

## Design decisions (inline)

- `ResumeRepo` interface (`list`, `find`, `insert`, `update`, `delete`) implemented by `ResumeRepository`; the container constructor of `ResumeService` is unchanged (AD-003). Admin files import only services; types are re-exported from `resume.service.ts`.
- `ResumeService` validates ids (UUID regex, else `NotFoundError`), rejects empty title or Job Description with `ValidationError("Title is required")` / `("Job Description is required")`, and builds print data and the download text. Slug: NFKD, strip marks, lowercase, non-alphanumerics to `-`, fallback `resume`.
- Generate: `llm.generate({ area: "tailor", system: tailorSystemPrompt, body: masterCv, input: jobDescription, maxOutputTokens: 4000 })`. The model sees only the Career Body, the prompt and the Job Description.
- `renderMarkdown` disables the marked `html` and `tag` tokenizers (raw HTML becomes escaped text), then sanitizes by tag allowlist; `<a>` keeps only an `http`, `https` or `mailto` href.
- Print page is a standalone HTML document (not `Layout`), its button is wired by `GET /admin/print/print.js` because the admin CSP is `script-src 'self'`.

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| `src/lib/markdown.ts` | unit | `test/unit/lib/*.test.ts` | `pnpm test:unit` |
| `src/repositories/resume.repository.ts` | integration | `test/integration/repositories/*.test.ts` | `pnpm test:int` |
| `src/services/resume.service.ts` | unit, fake repo and recording model | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| `src/admin/resumes.tsx`, `src/admin/print.tsx` | unit via `createTestApp` with fakes; integration with the real DB | `test/unit/admin/*.test.tsx`, `test/integration/routes/*.test.ts` | both |

## Gate Check Commands

| Gate Level | Command |
| ---------- | ------- |
| Full | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

## Execution Plan

```
T1 → T3
T2 → T3
T3 → T4 → T5 → T6 → T7
```

## Task Breakdown

### T1: Markdown renderer

**What**: `renderMarkdown(md)`: marked with raw HTML tokenizers disabled, then an allowlist sanitizer.
**Where**: `src/lib/markdown.ts`
**Depends on**: None
**Reuses**: foundation services and admin shell
**Requirement**: RES-05

**Done when**:
- [x] Raw HTML is text, only allowlisted tags and http/https/mailto hrefs survive
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(resumes): add sanitized markdown renderer`
**Status**: done

---

### T2: Resume repository

**What**: `ResumeRepo` + `ResumeRepository`: list newest first, find, insert, update, delete.
**Where**: `src/repositories/resume.repository.ts`
**Depends on**: None
**Reuses**: foundation services and admin shell
**Requirement**: RES-01

**Done when**:
- [x] Round trips including NULL and array `headerFields`; delete of a resume linked to a recruiter chat nulls the link
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(resumes): add resume repository`
**Status**: done

---

### T3: Resume service

**What**: CRUD with validation, `generate`, `save` with PII Guard and header normalization, print data, download text.
**Where**: `src/services/resume.service.ts`
**Depends on**: T1, T2
**Reuses**: foundation services and admin shell
**Requirement**: RES-01..RES-08

**Done when**:
- [x] Unit tests with a fake repo and the recording model cover the service checks
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(resumes): add resume service`
**Status**: done

---

### T4: List, create, delete routes

**What**: `GET/POST /admin/resumes`, `DELETE /admin/resumes/:id`, 404 for bad ids.
**Where**: `src/admin/resumes.tsx`
**Depends on**: T3
**Reuses**: foundation services and admin shell
**Requirement**: RES-01

**Done when**:
- [ ] Unit tests cover list, empty state, create 303/400, delete, 404
- [ ] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(resumes): add list, create and delete routes`
**Status**: pending

---

### T5: Editor, generate, preview, save

**What**: `GET /admin/resumes/:id`, `POST .../generate`, `POST .../preview`, `PUT /admin/resumes/:id`.
**Where**: `src/admin/resumes.tsx`
**Depends on**: T4
**Reuses**: foundation services and admin shell
**Requirement**: RES-02..RES-06

**Done when**:
- [ ] Unit tests cover editor, generate success and failures, preview XSS, save and PII refusal
- [ ] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(resumes): add editor, generate, preview and save`
**Status**: pending

---

### T6: Print and download

**What**: `GET /admin/resumes/:id/print`, `GET /admin/profile/print`, `GET /admin/resumes/:id/download.md`, print script.
**Where**: `src/admin/print.tsx`
**Depends on**: T5
**Reuses**: foundation services and admin shell
**Requirement**: RES-07, RES-08

**Done when**:
- [ ] Unit tests cover header selection, headers, page size, banner, empty and download
- [ ] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(resumes): add print view and markdown download`
**Status**: pending

---

### T7: Database proof

**What**: Whole flow through the app on the real DB.
**Where**: `test/integration/routes/resumes.test.ts`
**Depends on**: T6
**Reuses**: foundation services and admin shell
**Requirement**: RES-01..RES-08

**Done when**:
- [ ] Create, generate, edit, print, download, delete on Postgres; delete with a linked recruiter chat succeeds
- [ ] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `test(resumes): prove the flow on the real database`
**Status**: pending

---

## Checks

**C1** - Raw `<script>` becomes text and `**x**` still renders `<strong>x</strong> (RES-05 AC 3)
Proof: run unit | ✓ markdown > turns a script tag into text and keeps the markdown around it

**C2** - `<img onerror>` and `<div onclick>` leave no tag or attribute outside the allowlist (RES-05 AC 3)
Proof: run unit | ✓ markdown > leaves no element or attribute outside the allowlist

**C3** - `javascript:` and `data:` hrefs lose the link, safe hrefs stay (RES-05 AC 3)
Proof: run unit | ✓ markdown > keeps only http, https and mailto links

**C4** - Allowlisted markdown renders to its tags (RES-04 AC 2)
Proof: run unit | ✓ markdown > renders headings, lists, emphasis, code and quotes

**C5** - The repository lists resumes newest first (RES-01 AC 1)
Proof: run int | ✓ resume repository > lists newest first

**C6** - Insert with empty content, find, update and delete round trip (RES-01 AC 3)
Proof: run int | ✓ resume repository > inserts, finds, updates and deletes a resume

**C7** - `headerFields` keeps NULL and a key array (RES-04 AC 4)
Proof: run int | ✓ resume repository > stores null and array header fields

**C8** - Delete succeeds and the chat link becomes NULL (RES-01 edge)
Proof: run int | ✓ resume repository > deletes a resume linked to a recruiter chat and nulls the link

**C9** - Empty title or Job Description is refused naming the field (RES-01 AC 4)
Proof: run unit | ✓ resume service > rejects an empty title or job description naming the field and creates nothing

**C10** - Unknown or non-UUID ids are NotFound (RES-01 AC 6)
Proof: run unit | ✓ resume service > answers not found for an unknown or malformed id

**C11** - The tailor call has the specified area, prompt, inputs and limit (RES-02 AC 1)
Proof: run unit | ✓ resume service > calls the llm with area tailor, the tailor prompt, the master cv, the job description and 4000 tokens

**C12** - Success stores content and model (RES-02 AC 2)
Proof: run unit | ✓ resume service > saves the generated markdown and the model id

**C13** - LlmUnavailableError leaves content unchanged and propagates (RES-02 AC 4)
Proof: run unit | ✓ resume service > keeps the content when the llm is unavailable

**C14** - Empty Master CV answers Fill the master CV first with no LLM call (RES-02 AC 5)
Proof: run unit | ✓ resume service > refuses to generate with an empty master cv and does not call the llm

**C15** - Recording model never sees a Personal Info value or the full name (RES-03 AC 6)
Proof: run unit | ✓ resume service pii > sends no personal info value or full name to the model

**C16** - Save refuses with the label message and stores nothing (RES-06 AC 5)
Proof: run unit | ✓ resume service > refuses to save content containing a personal info value

**C17** - All fields selected is NULL; unknown keys dropped (RES-04 AC 4)
Proof: run unit | ✓ resume service > stores null when every field is selected and drops unknown keys

**C18** - Header fields follow headerFields and sortOrder; NULL means all (RES-07 AC 1)
Proof: run unit | ✓ resume service > builds the print header from the selected fields in sort order

**C19** - A deleted header field is skipped without error (RES-07 edge)
Proof: run unit | ✓ resume service > skips a header field that no longer exists

**C20** - Download text format (RES-08 AC 7)
Proof: run unit | ✓ resume service > builds the download text with name, header lines and content

**C21** - Slug is filesystem-safe (RES-08 AC 7)
Proof: run unit | ✓ resume service > slugs the title for the download filename

**C22** - List page rows (RES-01 AC 1)
Proof: run unit | ✓ admin resumes > lists resumes newest first with links, company, model and date

**C23** - No tailored resumes yet (RES-01 AC 2)
Proof: run unit | ✓ admin resumes > shows the empty state

**C24** - POST creates and 303s to the edit page (RES-01 AC 3)
Proof: run unit | ✓ admin resumes > creates a resume and redirects with 303

**C25** - 400 fragment names the field (RES-01 AC 4)
Proof: run unit | ✓ admin resumes > answers 400 naming the empty field and creates nothing

**C26** - Delete removes the row and the button carries hx-confirm Delete <title>? (RES-01 AC 5)
Proof: run unit | ✓ admin resumes > deletes a resume and asks for confirmation

**C27** - Every id route is 404 (RES-01 AC 6)
Proof: run unit | ✓ admin resumes > answers 404 on every id route for unknown or malformed ids

**C28** - Editor content (RES-04 AC 1)
Proof: run unit | ✓ admin resumes > renders the editor with fields, checkboxes and buttons

**C29** - Generate success fragment (RES-02 AC 2)
Proof: run unit | ✓ admin resumes > generate returns the editor fragment with the new content

**C30** - hx-indicator, hx-disabled-elt and conditional hx-confirm (RES-02 AC 3)
Proof: run unit | ✓ admin resumes > generate button has an indicator, is disabled while running and confirms replacement

**C31** - 502 text, content unchanged (RES-02 AC 4)
Proof: run unit | ✓ admin resumes > generate answers 502 with the failure text and keeps the content

**C32** - 400 text without LLM call (RES-02 AC 5)
Proof: run unit | ✓ admin resumes > generate answers 400 with the master cv text

**C33** - Preview of script plus bold is only strong (RES-05 AC 3)
Proof: run unit | ✓ admin resumes > preview returns sanitized html

**C34** - PUT saves and answers Saved (RES-04 AC 4)
Proof: run unit | ✓ admin resumes > saves content and header fields and answers Saved

**C35** - PUT 400 message, nothing saved (RES-06 AC 5)
Proof: run unit | ✓ admin resumes > refuses to save content with a personal info value

**C36** - Resume print page (RES-07 AC 1)
Proof: run unit | ✓ admin print > prints the name, the selected header fields in order and the sanitized body

**C37** - Profile print page (RES-07 AC 2)
Proof: run unit | ✓ admin print > prints the master cv with all personal info fields

**C38** - Print headers, no LLM (RES-07 AC 3)
Proof: run unit | ✓ admin print > sends no-store and noindex and never calls the llm

**C39** - @page size (RES-07 AC 4)
Proof: run unit | ✓ admin print > sets the page size to A4 and to Letter with the override

**C40** - Print page structure (RES-07 AC 5)
Proof: run unit | ✓ admin print > uses no table, hides the print button in print and loads its script from self

**C41** - PII banner (RES-07 AC 6)
Proof: run unit | ✓ admin print > warns on screen when the body contains a personal info value

**C42** - Empty print (RES-07 edge)
Proof: run unit | ✓ admin print > shows This resume is empty for an empty content

**C43** - Download response (RES-08 AC 7)
Proof: run unit | ✓ admin print > downloads markdown with the attachment filename and header lines

**C44** - Full flow on Postgres (RES-01..08)
Proof: run int | ✓ resumes with database > creates, generates, edits, prints, downloads and deletes on the real database

**C45** - Delete through the app succeeds (RES-01 edge)
Proof: run int | ✓ resumes with database > deletes a resume linked to a recruiter chat

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** none - no screen; no captures cited.
