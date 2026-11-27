# Short Job Description Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline - see "Decisions made while writing tasks" (no new pattern; follows `honest-assessment`)
**Status**: Approved
**Approved**: 2026-11-27 - user: "Aprovo"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests use one Testcontainers `postgres:18-alpine` per run (needs Docker). Use `rtk proxy pnpm vitest ...` for raw output.

## Decisions made while writing tasks

- **Branch** `feat/short-job-description` from `main`. Migration `0009` is generated there and serialized on `main`; it never runs against production without the user's go-ahead.
- **One home for the rule**: `src/services/tailor/short-description.ts` holds `SHORT_JD_MAX_CHARS = 2000`, the code-owned instruction `SHORT_JD_RULES` and the pure `shortJobDescription(raw)` (trim, blank → null, truncate). `recruiter-chat.service.ts` keeps exporting `MAX_JOB_DESCRIPTION_CHARS`, now set from `SHORT_JD_MAX_CHARS`, so both limits cannot drift.
- **Instruction reaches the model twice**: the `job_description_short` field description in `TailorOutputSchema`, and `SHORT_JD_RULES` appended to the tailor system prompt after `TAILOR_ASSESSMENT_RULES`. The stored `tailorSystemPrompt` is untouched.
- **`finish()`** returns `jobDescriptionShort: string | null` next to `doc` and `assessment`; a long or blank value never makes it return `ok: false`.
- **Autofill rule runs on the server**: pure `decideAutofill()` in `src/admin/chats/autofill.ts`; the form posts its current Job Description and Company plus two hidden inputs holding the last autofilled values to `POST /admin/chats/autofill`, which answers with the fields, hidden inputs and notices as out-of-band swaps. "Replace" posts the same endpoint with `replace=jobDescriptionShort` or `replace=company`.
- **Resume context lookup**: `RecruiterChatRepo.resumeContext(id)` returns `{ company, jobDescriptionShort } | null`; `RecruiterChatService.resumeContext(id)` throws `NotFoundError("Tailored Resume not found")` for an unknown or non-UUID id. Admin routes reach it only through the service (architecture check).
- **Paid run**: none planned. A real-model look at the summary quality runs only if the user asks in chat.

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (projects unit/integration, no coverage threshold) - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/services/tailor/*` (pure) | unit | Every branch; 1:1 to ACs; each bound at and past its limit | `test/unit/services/tailor/*.test.ts` | `pnpm test:unit` |
| `src/services/*.service.ts` | unit, fakes + recording mock | 1:1 to ACs; success, failure and validation paths | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| `src/repositories/*` | integration | Key query paths, missing row | `test/integration/repositories/*.test.ts` | `pnpm test:int` |
| `src/db/schema.ts` + migration | integration | Column type, nullability, default | `test/integration/db/*-migration.test.ts` | `pnpm test:int` |
| `src/admin/*/autofill.ts` (pure) | unit | Every branch of the rule; edge cases | `test/unit/admin/*.test.ts` | `pnpm test:unit` |
| `src/admin/*/view.tsx` | unit (render) | Every state and notice text, escaping | `test/unit/admin/*.test.tsx` | `pnpm test:unit` |
| `src/admin/*/routes.ts` | unit (test app) | Happy + edge + error paths per route | `test/unit/admin/*.test.tsx` | `pnpm test:unit` |
| `GLOSSARY.md` | none | - (build gate only) | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test:unit` |
| Full | After tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | After phase completion or docs-only tasks | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

### Phase 1: Tailor output

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Resume editor

```
T5 → T6 → T7 → T8
```

### Phase 3: New chat autofill

```
T8 → T9 → T10 → T11 → T12 → T13
T10 → T13
```

### Phase 4: Domain docs

```
T13 → T14
```

---

## Task Breakdown

### T1: Add `job_description_short` column

**What**: Nullable `jobDescriptionShort: text()` on `tailoredResumes` and migration `0009` from `pnpm db:generate`.
**Where**: `src/db/schema.ts`
**Depends on**: None
**Reuses**: `test/integration/db/assessment-migration.test.ts` pattern
**Requirement**: SJD-09

**Done when**:

- [x] Column is `text`, nullable, no default; a new row reads NULL
- [x] `drizzle/0009_*.sql` and journal committed
- [x] Integration test `short-jd migration > adds a nullable job_description_short that starts NULL` passes
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add tailored_resumes.job_description_short`

---

### T2: Short Job Description rules and normaliser

**What**: `SHORT_JD_MAX_CHARS`, `SHORT_JD_RULES` and `shortJobDescription(raw): string | null`.
**Where**: `src/services/tailor/short-description.ts` (new)
**Depends on**: T1
**Reuses**: `cleanLine` style from `src/services/tailor/document.ts`
**Requirement**: SJD-02, SJD-03, SJD-04, SJD-06, SJD-07

**Done when**:

- [x] Rules text names every kept and dropped item of SJD-02/03, `- ` bullets, the Job Description's language and the 2000-character cap
- [x] Truncation cuts at the last line break or sentence end at or before code point 2000, else at 2000; exactly 2000 stays whole; blank → null
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(tailor): add short job description rules and normaliser`

---

### T3: Add `job_description_short` to the tailor output schema

**What**: Required, described string field in `TailorOutputSchema`.
**Where**: `src/services/tailor/output.ts`
**Depends on**: T2
**Reuses**: existing field descriptions
**Requirement**: SJD-01, SJD-04

**Done when**:

- [ ] Field is required; its description says it is the Job Description cut to what a recruiter chat needs, at most 2000 characters
- [ ] `test/support/resumes.ts` tailor-output helper returns a default value for it
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(tailor): request a short job description in the tailor output`

---

### T4: `finish()` returns the normalised short

**What**: `finish()` adds `jobDescriptionShort` from `shortJobDescription(out.job_description_short)`.
**Where**: `src/services/tailor/finish.ts`
**Depends on**: T3
**Reuses**: T2
**Requirement**: SJD-06, SJD-07

**Done when**:

- [ ] Long value comes back truncated with `ok: true`; blank comes back `null` with `ok: true`
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(tailor): carry the short job description through finish`

---

### T5: Store the short on generation

**What**: `generate()` appends `SHORT_JD_RULES` to the system prompt and stores `jobDescriptionShort` on success; `Resume` exposes it.
**Where**: `src/services/resume.service.ts`
**Depends on**: T4
**Reuses**: recording mock model, `test/support/fakes`
**Requirement**: SJD-01, SJD-05, SJD-08

**Done when**:

- [ ] Recorded system prompt ends with the rules after the assessment rules; stored `tailorSystemPrompt` unchanged
- [ ] Success overwrites an earlier value; a failed generation (all attempts rejected) leaves it as it was
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(resumes): store the short job description on generation`

---

### T6: Validate and save the short in resume options

**What**: `updateOptions()` accepts `jobDescriptionShort`: trims, blank → NULL, over 2000 code points → `ValidationError` naming the limit; `MAX_JOB_DESCRIPTION_CHARS` set from `SHORT_JD_MAX_CHARS`.
**Where**: `src/services/resume.service.ts`
**Depends on**: T5
**Reuses**: `checkTracking` pattern
**Requirement**: SJD-11, SJD-12

**Done when**:

- [ ] 2000 accepted, 2001 rejected with stored value kept, blank stores NULL
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(resumes): let the owner edit the short job description`

---

### T7: Editor textarea

**What**: Textarea "Short Job Description (max 2000 characters)" inside `#resume-form`, right after the Job Description disclosure, holding the stored value.
**Where**: `src/admin/resumes/view.tsx`
**Depends on**: T6
**Reuses**: existing field markup
**Requirement**: SJD-10

**Done when**:

- [ ] Renders the stored value escaped, empty for NULL, positioned after the Job Description
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): show the short job description in the resume editor`

---

### T8: Save route carries the short

**What**: `PUT /admin/resumes/:id` passes `jobDescriptionShort` to `updateOptions()`; a `ValidationError` answers 400.
**Where**: `src/admin/resumes/routes.ts`
**Depends on**: T7
**Reuses**: `optionalText`
**Requirement**: SJD-11, SJD-12, SJD-13

**Done when**:

- [ ] Saved value shows on reload; 2001 characters answers 400 with the limit message
- [ ] Print page and `.md` download of a resume with a short do not contain it
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): save the short job description from resume options`

---

### T9: Repository resume context

**What**: `RecruiterChatRepo.resumeContext(id)` returning `{ company, jobDescriptionShort } | null`, and the fake.
**Where**: `src/repositories/recruiter-chat.repository.ts`
**Depends on**: T8
**Reuses**: `resumeExists` query style; `test/support/recruiter-chat.fake.ts`
**Requirement**: SJD-14, SJD-18, SJD-19

**Done when**:

- [ ] Returns both values for a resume, NULLs as null, null for a missing id
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(chats): read a tailored resume's company and short job description`

---

### T10: Service resume context

**What**: `RecruiterChatService.resumeContext(id)`; unknown or non-UUID id → `NotFoundError("Tailored Resume not found")`.
**Where**: `src/services/recruiter-chat.service.ts`
**Depends on**: T9
**Reuses**: `UUID` check
**Requirement**: SJD-14, SJD-18

**Done when**:

- [ ] Found, missing and malformed ids covered
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(chats): expose resume context to the admin`

---

### T11: Autofill rule

**What**: Pure `decideAutofill({ current, lastFilled, source, replace })` → `{ value, lastFilled, notice: "kept" | "no-source" | null }`.
**Where**: `src/admin/chats/autofill.ts` (new)
**Depends on**: T10
**Reuses**: none
**Requirement**: SJD-14, SJD-15, SJD-16, SJD-17, SJD-18, SJD-19

**Done when**:

- [ ] Empty (incl. whitespace-only) → fill; equal to lastFilled → fill; other text → keep + `kept`; `replace` → fill; null source → keep + `no-source` for Job Description, keep + no notice for Company
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): add the new chat autofill rule`

---

### T12: Autofill markup

**What**: `AutofillFragment` (fields, hidden `lastJobDescriptionShort` / `lastCompany`, notices in an `aria-live="polite"` region, "Replace" buttons) and the Resume select's `hx-post` to `/admin/chats/autofill` on change.
**Where**: `src/admin/chats/view.tsx`
**Depends on**: T11
**Reuses**: existing form markup
**Requirement**: SJD-16, SJD-17, SJD-18, SJD-21

**Done when**:

- [ ] Notice texts match the spec character for character; Replace buttons post `replace=<field>`; notice region is `aria-live="polite"`
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): render autofill fields and notices in the chat form`

---

### T13: Autofill route

**What**: `POST /admin/chats/autofill`: "Master CV" (empty id) keeps fields and clears notices; a resume id runs `decideAutofill` for both fields; unknown resume shows "Tailored Resume not found".
**Where**: `src/admin/chats/routes.ts`
**Depends on**: T12, T10
**Reuses**: `test/support/test-app.ts`
**Requirement**: SJD-14, SJD-15, SJD-16, SJD-17, SJD-18, SJD-19, SJD-20, SJD-22

**Done when**:

- [ ] Every spec criterion of the chat-form story and its edge cases has a route test
- [ ] Creating a chat after autofill stores the field text; changing the resume's short afterwards leaves the chat's value unchanged
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): autofill the new chat form from the chosen resume`

---

### T14: Glossary term

**What**: **Short Job Description** entry (definition from Q24, _Avoid_: summary, short JD, JD short) and a note on Job Description.
**Where**: `GLOSSARY.md`
**Depends on**: T13
**Reuses**: existing entries
**Requirement**: SJD-01

**Done when**:

- [ ] Entry added; Build gate passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: none
**Gate**: build

**Commit**: `docs(glossary): define Short Job Description`

---

## Checks

**C1** - The tailor output schema requires a described `job_description_short` string (SJD-01, AC 1)
Proof: run unit | ✓ tailor output schema > requires and describes job_description_short

**C2** - The tailor call's system prompt ends with `SHORT_JD_RULES`, after the assessment rules, while the stored prompt is unchanged (SJD-01, AC 1; SJD-02, AC 2)
Proof: run unit | ✓ resume generate > appends the short job description rules to the system prompt

**C3** - The rules name every kept item: role, seniority, company, area, location/remote/time zone, required qualifications one per bullet, nice-to-haves apart, short responsibilities (SJD-02, AC 2)
Proof: run unit | ✓ short job description rules > name every kept section

**C4** - The rules name every dropped item: marketing, benefits, EEO/diversity, application instructions, repetition, contact details, names, URLs (SJD-03, AC 3)
Proof: run unit | ✓ short job description rules > name every dropped item

**C5** - The rules ask for plain text, `- ` bullets, the Job Description's language and at most 2000 characters (SJD-04, AC 4)
Proof: run unit | ✓ short job description rules > fix format, language and the 2000 cap

**C6** - A successful generation stores the returned short, replacing an earlier value (SJD-05, AC 5)
Proof: run unit | ✓ resume generate > stores the short job description and replaces an earlier one

**C7** - A 2100-character short is stored cut at the last line break or sentence end at or before 2000 (SJD-06, AC 6)
Proof: run unit | ✓ shortJobDescription > cuts at the last line or sentence end before 2000

**C8** - A short with no boundary before 2000 is cut at code point 2000; a short of exactly 2000 is kept whole (SJD-06, AC 6)
Proof: run unit | ✓ shortJobDescription > hard-cuts at 2000 and keeps exactly 2000 whole

**C9** - A long short does not fail `finish()` (SJD-06, AC 6)
Proof: run unit | ✓ finish > returns ok with a truncated short job description

**C10** - A blank short is stored as NULL and `finish()` still returns ok (SJD-07, AC 7)
Proof: run unit | ✓ finish > returns ok with null for a blank short job description

**C11** - A failed generation leaves the stored short unchanged (SJD-08, AC 8)
Proof: run unit | ✓ resume generate > keeps the short job description when generation fails

**C12** - The new column is nullable and a new resume reads NULL (SJD-09, AC 9)
Proof: run int | ✓ short-jd migration > adds a nullable job_description_short that starts NULL

**C13** - The editor shows "Short Job Description (max 2000 characters)" with the stored value, empty for NULL, after the Job Description (SJD-10, AC 1)
Proof: run unit | ✓ resume editor > shows the short job description textarea after the job description

**C14** - "Save options" stores the trimmed value, and NULL when blank (SJD-11, AC 2)
Proof: run unit | ✓ resume updateOptions > stores the trimmed short job description and null when blank

**C15** - The save route stores the field and the editor shows it on reload (SJD-11, AC 2)
Proof: run unit | ✓ PUT /admin/resumes/:id > saves the short job description

**C16** - Saving 2001 code points answers 400 naming the 2000 limit and keeps the stored value (SJD-12, AC 3)
Proof: run unit | ✓ PUT /admin/resumes/:id > rejects a short job description over 2000 characters

**C17** - The print page and `.md` download do not contain the short (SJD-13, AC 4)
Proof: run unit | ✓ resume print and download > leave out the short job description

**C18** - Picking a resume with an empty Job Description field fills it with the resume's short (SJD-14, AC 1)
Proof: run unit | ✓ POST /admin/chats/autofill > fills an empty job description

**C19** - Picking a resume while the field holds the last autofilled value replaces it (SJD-15, AC 2)
Proof: run unit | ✓ POST /admin/chats/autofill > replaces the last autofilled job description

**C20** - Picking a resume while the field holds other text keeps it and shows "Not filled: the field has your own text." with "Replace" (SJD-16, AC 3)
Proof: run unit | ✓ POST /admin/chats/autofill > keeps owner text and shows the not filled notice

**C21** - "Replace" fills the field with the resume's short and removes the notice (SJD-17, AC 4)
Proof: run unit | ✓ POST /admin/chats/autofill > replace fills the field and clears the notice

**C22** - A resume with NULL short keeps the field and shows "This resume has no short description yet. Regenerate it to get one." (SJD-18, AC 5)
Proof: run unit | ✓ POST /admin/chats/autofill > shows the no short description notice

**C23** - The Company field follows the same rule, with no notice when the resume has no company (SJD-19, AC 6)
Proof: run unit | ✓ POST /admin/chats/autofill > applies the rule to company

**C24** - "Master CV" leaves both fields as they are and removes notices (SJD-20, AC 7)
Proof: run unit | ✓ POST /admin/chats/autofill > master cv keeps fields and clears notices

**C25** - Notices render inside an `aria-live="polite"` region (SJD-21, AC 8)
Proof: run unit | ✓ chat autofill fragment > renders notices in a polite live region

**C26** - A created chat keeps the field's text even after the resume's short changes (SJD-22, AC 9)
Proof: run unit | ✓ POST /admin/chats > stores a snapshot of the job description

**C27** - A cleared (whitespace-only) field counts as empty and is filled (Edge case 1)
Proof: run unit | ✓ decideAutofill > treats a whitespace-only field as empty

**C28** - An unknown resume keeps both fields and shows "Tailored Resume not found" (Edge case 2)
Proof: run unit | ✓ POST /admin/chats/autofill > shows tailored resume not found for an unknown resume

**C29** - Each `decideAutofill` branch returns the spec's outcome: fill, keep + kept, replace, no-source (SJD-14..19)
Proof: run unit | ✓ decideAutofill > covers fill, keep, replace and no source

**C30** - A failed autofill request shows in the form's status line and leaves both fields (Edge case 4)
Proof: walk - stop the dev server's DB, pick a resume, see the error in the status line with both fields unchanged

---

## Handoff

**Settled mid-build:** 2026-11-27 - user: "nao implementa ainda" (specs and tasks approved; Execute not started)
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8
Phase 3:  T9 → T10 → T11 → T12 → T13
Phase 4:  T14
```

Execution is strictly sequential.
