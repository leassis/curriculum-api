# Owner Notes Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (no `design.md`): extends `tailored-resumes`, `resume-custom-instructions`, `career-library`; decisions below.
**Status**: Approved
**Approved**: 2026-11-24 - user: "Approve, don't build"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests create a throwaway Neon branch per run (`NEON_API_KEY`, `NEON_PROJECT_ID`, `TEST_PARENT_BRANCH_ID` are in `.env.local`). Use `rtk proxy pnpm vitest ...` for raw output. Branch: `feat/owner-notes`.

## Design decisions (inline)

- **Columns** (one migration `drizzle/0008_*.sql` from `pnpm db:generate`, T1): `tailoredResumes.jobLink`, `recruiterName`, `notes`; `profile.additionalInformation`, `lookingForwardNext`; each `text().notNull().default("")`.
- **Resume Tracking Fields** (the spec's Job Link, Recruiter Name, Notes): `ResumeInsert` gains the three as `string`; `ResumePatch` as optional. `ResumeService` gets one private `checkTracking(input: Partial<Tracking>)`: trims each, rejects a non-empty Job Link whose `new URL()` fails or whose protocol is not `http:`/`https:` with `ValidationError("Job link must start with http:// or https://")`, and over-length values with `ValidationError("<Label> is limited to <N> characters")` (labels "Job link", "Recruiter name", "Notes"). `create` stores them (`''` when absent). `updateOptions(id, headerKeys, customInstructions?, tracking?)` validates all before writing anything and patches only the fields that are present. `Resume` exposes `jobLink`, `recruiterName`, `notes`.
- **Routes**: `POST /admin/resumes` reads the three with the existing `first(...)` helper; `PUT /admin/resumes/:id` reads each with `optionalText` so an absent field is `undefined` and keeps its stored value. A `ValidationError` reaches the existing handler (400).
- **Views**: New resume form gets "Job link" (`type="url"`), "Recruiter name", "Notes" (textarea) after Company. Editor shows the three inside `#resume-form` so Save's `hx-include` carries them; a non-empty Job Link also renders as `<a href target="_blank" rel="noopener noreferrer">`. List gets a "Recruiter" `<th>`/`<td>` after Company.
- **Profile sections**: `src/services/career/body.ts` exports `PROFILE_SECTIONS` headings and a pure `appendSections(body, sections: { heading: string; text: string }[])` that appends `\n\n## <heading>\n\n<trimmed text>` for each non-empty text, in order, and returns `body` unchanged when all are empty.
- **Profile form**: `FIELDS` in `src/admin/profile/view.tsx` gains `additionalInformation` ("Additional information") and `lookingForwardNext` ("Looking forward next"), both long, optional, tab `career`, after Summary; `EMPTY` and `currentValues` in `routes.ts` carry both. The `POST /admin/profile` handler trims both, then rejects in order: over 5000 characters, a Personal Info Field value (`findPii`, same message as the summary), the full name (case-insensitive) with "Your full name is in the additional information — the Candidate is never named in prompts" / "… in looking forward next — …". Rules stay in the route like the summary's PII check today; unit tests reach it through the test app.
- **Chats**: public chat and both recruiter paths (`ask` and `test`) load the library once; when it has items, the body is `appendSections(<today's body>, [Additional information, Looking forward next])`; when empty, today's `EMPTY_CV`. A linked resume's markdown stays the base of `ask`'s body.
- **Tailor**: `generate` body is `appendSections(renderCareerBody(...), [Additional information])` only; `containsFullName` also scans `additionalInformation`. `markdownOf`, `printData` and `download` are untouched, so none of the five fields reach print or download.
- **Glossary**: **Job Link**, **Recruiter Name** (of a Tailored Resume; not the Recruiter Chat's), **Resume Notes**, **Additional Information**, **Looking Forward Next**.

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (projects unit/integration, no coverage threshold) - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/db/schema.ts` + migration | integration | Columns exist, default `''` for existing and new rows | `test/integration/db/owner-notes-migration.test.ts` | `pnpm test:int` |
| `src/repositories/*.repository.ts` | integration | Insert and update store the values; update without them keeps them | `test/integration/repositories/*.test.ts` | `pnpm test:int` |
| `src/services/*.service.ts`, `src/services/career/body.ts` | unit, fake repos + recording mock model | 1:1 to spec ACs and every edge case | `test/unit/services/**/*.test.ts` | `pnpm test:unit` |
| `src/admin/*/routes.ts` | unit via test app with fakes | Every touched route: happy + 400 paths | `test/unit/admin/*.test.tsx` | `pnpm test:unit` |
| `src/admin/*/view.tsx` | unit (rendered HTML) | Every new field, label, link and column | `test/unit/admin/*.test.tsx` | `pnpm test:unit` |
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

Phases run in order; tasks inside a phase run in order. 12 tasks: two batches (Phases 1-2, Phases 3-5); the sub-agent offer comes before Execute.

### Phase 1: Data

```
T1 → T2
```

### Phase 2: Resume Tracking Fields

```
T2 → T3 → T4 → T5
```

### Phase 3: Profile fields

```
T1 → T6 → T7
```

### Phase 4: Prompts

```
T7 → T8 → T9 → T10 → T11
```

### Phase 5: Docs

```
T11 → T12
```

---

## Task Breakdown

### T1: Add the five columns and migration

**What**: Add `jobLink`, `recruiterName`, `notes` to `tailoredResumes` and `additionalInformation`, `lookingForwardNext` to `profile` (`text().notNull().default("")`); generate `drizzle/0008_*.sql` with `pnpm db:generate`.
**Where**: `src/db/schema.ts`
**Depends on**: None
**Reuses**: `test/integration/db/assessment-migration.test.ts` pattern
**Requirement**: OWN-02, OWN-12, OWN-24

**Done when**:

- [x] Migration adds the five columns with default `''` in schema `curriculum_api`
- [x] Integration tests C31, C32 pass; profile `upsert` stores both profile fields (C33)
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`
- [x] Test count: existing integration tests + 3 pass (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): add owner notes columns to tailored_resumes and profile`

---

### T2: Resume repository stores the tracking fields

**What**: `ResumeInsert` gains `jobLink`, `recruiterName`, `notes`; `ResumePatch` gains them as optional; `insert`/`update` pass them through.
**Where**: `src/repositories/resume.repository.ts`
**Depends on**: T1
**Reuses**: existing `insert`/`update`
**Requirement**: OWN-02, OWN-04, OWN-05

**Done when**:

- [x] Integration test C34 passes
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`
- [x] Test count: T1 count + 1 pass

**Tests**: integration
**Gate**: full
**Commit**: `feat(resumes): persist tracking fields in the repository`

---

### T3: Resume service validates and stores the tracking fields

**What**: `checkTracking` (trim, http(s) URL, lengths); `ResumeInput` gains the three; `create` stores them; `updateOptions` takes optional `tracking` and keeps absent fields; `Resume` exposes them.
**Where**: `src/services/resume.service.ts`
**Depends on**: T2
**Reuses**: `checkInstructions` shape, `ValidationError`
**Requirement**: OWN-02, OWN-04, OWN-05, OWN-08, OWN-09, OWN-10

**Done when**:

- [x] Unit tests C2, C4, C5, C8, C9, C10 (service) pass
- [x] Every existing `resume service` test passes unchanged
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): validate and save job link, recruiter name and notes`

---

### T4: Resume routes accept the tracking fields

**What**: `POST /admin/resumes` and `PUT /admin/resumes/:id` read `jobLink`, `recruiterName`, `notes` and pass them to the service.
**Where**: `src/admin/resumes/routes.ts`
**Depends on**: T3
**Reuses**: `first`, `optionalText` helpers
**Requirement**: OWN-02, OWN-04, OWN-05, OWN-08, OWN-09

**Done when**:

- [ ] Unit tests C11, C12, C13 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): accept resume tracking fields on create and save`

---

### T5: Resume views show the tracking fields

**What**: New resume form inputs, editor inputs inside `#resume-form`, Job Link anchor, "Recruiter" list column.
**Where**: `src/admin/resumes/view.tsx`
**Depends on**: T4
**Reuses**: existing `field`/`input` classes, `ResumeRow`
**Requirement**: OWN-01, OWN-03, OWN-06, OWN-07

**Done when**:

- [ ] Unit tests C1, C3, C6, C7 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): show job link, recruiter name and notes on resumes`

---

### T6: `appendSections` for profile sections

**What**: Pure `appendSections(body, sections)` and the two section headings in `body.ts`.
**Where**: `src/services/career/body.ts`
**Depends on**: T1
**Reuses**: `renderCareerBody`
**Requirement**: OWN-17, OWN-20, OWN-27, OWN-30

**Done when**:

- [ ] Unit tests C35, C36 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): append profile sections to a career body`

---

### T7: Profile form fields and their validation

**What**: Two new career-tab fields in `FIELDS`, carried by `EMPTY`/`currentValues`, trimmed and checked (length, PII, full name) on `POST /admin/profile`.
**Where**: `src/admin/profile/routes.ts` (with the two `FIELDS` entries in `view.tsx`, one cohesive change: the route iterates `FIELDS`)
**Depends on**: T6
**Reuses**: `findPii`, `reject`
**Requirement**: OWN-11, OWN-12, OWN-13, OWN-14, OWN-15, OWN-16, OWN-23, OWN-24, OWN-25, OWN-26

**Done when**:

- [ ] Unit tests C14-C19, C26-C29 pass
- [ ] Every existing `admin profile` test passes unchanged
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): add additional information and looking forward next to the profile`

---

### T8: Public chat sends the profile sections

**What**: Public chat body appends both sections when the library has items.
**Where**: `src/services/public-chat.service.ts`
**Depends on**: T7
**Reuses**: `appendSections`
**Requirement**: OWN-17, OWN-20, OWN-27, OWN-30

**Done when**:

- [ ] Unit tests C20, C30 (public), C37 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(chat): send additional information and looking forward next to the public chat`

---

### T9: Recruiter chat sends the profile sections

**What**: `ask` (with and without a linked resume) and `test` append both sections when the library has items.
**Where**: `src/services/recruiter-chat.service.ts`
**Depends on**: T8
**Reuses**: `appendSections`
**Requirement**: OWN-18, OWN-20, OWN-28, OWN-30, OWN-10

**Done when**:

- [ ] Unit tests C21, C30 (recruiter), C38, C39 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(chat): send profile sections to recruiter chats`

---

### T10: Tailor sends Additional information only

**What**: `generate` body appends the Additional information section only; full-name check covers it.
**Where**: `src/services/resume.service.ts`
**Depends on**: T9
**Reuses**: `appendSections`, `containsFullName`
**Requirement**: OWN-19, OWN-20, OWN-21, OWN-29

**Done when**:

- [ ] Unit tests C22, C23, C24 (tailor), C40 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): send additional information to the tailor`

---

### T11: Print and download carry none of the new fields

**What**: Tests pinning that print view and markdown download contain no tracking field, Additional information or Looking forward next; code change only if one fails.
**Where**: `test/unit/admin/print.test.tsx`
**Depends on**: T10
**Reuses**: `admin print` test setup
**Requirement**: OWN-10, OWN-22, OWN-29

**Done when**:

- [ ] Unit tests C25, C41 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `test(print): keep owner notes out of print and download`

---

### T12: Glossary terms

**What**: Add the five terms to `GLOSSARY.md`.
**Where**: `GLOSSARY.md`
**Depends on**: T11
**Reuses**: existing glossary format
**Requirement**: OWN-10, OWN-22

**Done when**:

- [ ] Five entries with definition and _Avoid_ line
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: none
**Gate**: build
**Commit**: `docs(glossary): define owner notes terms`

---

## Checks

**C1** - The New resume form has optional "Job link" (`jobLink`), "Recruiter name" (`recruiterName`) and textarea "Notes" (`notes`) (OWN-01, AC 1)
Proof: run unit | ✓ admin resumes tracking fields > shows job link, recruiter name and notes on the new resume form

**C2** - Create stores the trimmed values, `''` for absent ones (OWN-02, AC 2)
Proof: run unit | ✓ resume service tracking fields > stores trimmed tracking fields on create and empty ones when absent

**C3** - The editor shows the three stored values inside the resume form (OWN-03, AC 3)
Proof: run unit | ✓ admin resumes tracking fields > shows the stored tracking fields in the editor form

**C4** - Save stores trimmed values and leaves document, model and Assessment unchanged (OWN-04, AC 4)
Proof: run unit | ✓ resume service tracking fields > updates tracking fields without touching the document, model or assessment

**C5** - Save without a field keeps its stored value (OWN-05, AC 5)
Proof: run unit | ✓ resume service tracking fields > keeps a tracking field that the save omits

**C6** - A non-empty Job Link renders as an anchor with that href, `target="_blank"`, `rel="noopener noreferrer"` (OWN-06, AC 6)
Proof: run unit | ✓ admin resumes tracking fields > links the job link in a new tab with noopener noreferrer

**C7** - The list has a "Recruiter" column after "Company" with each Recruiter Name (OWN-07, AC 7)
Proof: run unit | ✓ resumes list > shows a Recruiter column after Company

**C8** - A non-http(s) Job Link is rejected with "Job link must start with http:// or https://" and nothing stored (OWN-08, AC 8)
Proof: run unit | ✓ resume service tracking fields > rejects a job link that is not http or https and stores nothing

**C9** - Over-length Job Link (2001), Recruiter Name (201) and Notes (10001) are rejected with "<Label> is limited to <N> characters", nothing stored; exact limits pass (OWN-09, AC 9)
Proof: run unit | ✓ resume service tracking fields > rejects over-length tracking fields and accepts the exact limits

**C10** - Generate's recorded LLM request contains none of the three values (OWN-10, AC 10)
Proof: run unit | ✓ resume service tracking fields > never sends tracking fields to the tailor model

**C11** - `POST /admin/resumes` passes the three fields to the stored resume (OWN-02, AC 2)
Proof: run unit | ✓ admin resumes tracking fields > creates a resume with the posted tracking fields

**C12** - `PUT /admin/resumes/:id` saves posted fields and keeps omitted ones (OWN-04, OWN-05, AC 4-5)
Proof: run unit | ✓ admin resumes tracking fields > saves posted tracking fields and keeps omitted ones

**C13** - An invalid Job Link on create or save answers 400 with the message (OWN-08, AC 8)
Proof: run unit | ✓ admin resumes tracking fields > answers 400 for an invalid job link on create and save

**C14** - The career tab has a textarea "Additional information" named `additionalInformation` with the stored value (OWN-11, AC 11)
Proof: run unit | ✓ admin profile owner notes > shows additional information on the career tab

**C15** - Saving the career tab stores the trimmed Additional Information (OWN-12, AC 12)
Proof: run unit | ✓ admin profile owner notes > stores trimmed additional information

**C16** - Saving the AI tab keeps the stored Additional Information and Looking Forward Next (OWN-13, OWN-25, AC 13, 25)
Proof: run unit | ✓ admin profile owner notes > keeps both texts when the ai tab is saved

**C17** - Additional Information with a Personal Info Field value answers 400 with "Your <label> is in the body — keep contact data in Personal info" and saves nothing (OWN-14, AC 14)
Proof: run unit | ✓ admin profile owner notes > rejects additional information containing a personal info value

**C18** - Additional Information with the full name in another case answers 400 with the full-name message and saves nothing (OWN-15, AC 15)
Proof: run unit | ✓ admin profile owner notes > rejects additional information containing the full name

**C19** - Additional Information of 5001 characters answers 400 with "Additional information is limited to 5000 characters"; 5000 saves (OWN-16, AC 16)
Proof: run unit | ✓ admin profile owner notes > limits additional information to 5000 characters

**C20** - The public chat body ends with `## Additional information`, a blank line and the text (OWN-17, AC 17)
Proof: run unit | ✓ public chat service owner notes > ends the body with the additional information section

**C21** - The recruiter chat body ends with the Additional information section, unlinked and linked to a resume (OWN-18, AC 18)
Proof: run unit | ✓ recruiter chat service owner notes > ends the body with additional information with and without a linked resume

**C22** - The tailor body ends with the Additional information section (OWN-19, AC 19)
Proof: run unit | ✓ resume service owner notes > ends the tailor body with the additional information section

**C23** - With both texts empty, public, recruiter and tailor bodies equal today's (OWN-20, AC 20)
Proof: run unit | ✓ resume service owner notes > sends today's tailor body when additional information is empty

**C24** - Generate refuses with the full-name error and no LLM call when Additional Information holds the full name (OWN-21, AC 21)
Proof: run unit | ✓ resume service owner notes > refuses to generate when additional information contains the full name

**C25** - Print view, markdown download and stored Resume Document contain neither profile text (OWN-22, OWN-29, AC 22, 29)
Proof: run unit | ✓ admin print > keeps profile texts out of print and download

**C26** - The career tab has a textarea "Looking forward next" named `lookingForwardNext` with the stored value (OWN-23, AC 23)
Proof: run unit | ✓ admin profile owner notes > shows looking forward next on the career tab

**C27** - Saving the career tab stores the trimmed Looking Forward Next (OWN-24, AC 24)
Proof: run unit | ✓ admin profile owner notes > stores trimmed looking forward next

**C28** - Looking Forward Next with a Personal Info Field value or the full name answers 400 with its message and saves nothing (OWN-26, AC 26)
Proof: run unit | ✓ admin profile owner notes > rejects looking forward next containing personal info or the full name

**C29** - Looking Forward Next of 5001 characters answers 400 with "Looking forward next is limited to 5000 characters"; 5000 saves (OWN-26, AC 26)
Proof: run unit | ✓ admin profile owner notes > limits looking forward next to 5000 characters

**C30** - With Looking Forward Next empty, public and recruiter bodies have no `## Looking forward next` section (OWN-30, OWN-20, AC 30, 20)
Proof: run unit | ✓ public chat service owner notes > sends today's body when both texts are empty

**C31** - After the migration an existing resume reads the three tracking fields as `''` (Edge case 3)
Proof: run int | ✓ owner notes columns > reads tracking fields of an existing resume as empty

**C32** - After the migration the existing profile reads both texts as `''` (Edge case 3)
Proof: run int | ✓ owner notes columns > reads both profile texts of an existing profile as empty

**C33** - Profile upsert stores both profile texts (OWN-12, OWN-24, AC 12, 24)
Proof: run int | ✓ ProfileRepository > upsert stores additional information and looking forward next

**C34** - Resume insert and update store the tracking fields; update without them keeps them (OWN-02, OWN-04, OWN-05)
Proof: run int | ✓ resume repository > stores and updates the tracking fields

**C35** - `appendSections` appends `## <heading>`, blank line, trimmed text for each non-empty section, in order (OWN-17, OWN-27)
Proof: run unit | ✓ career body > appends non-empty sections in order

**C36** - `appendSections` returns the body unchanged when every section is empty or whitespace (OWN-20, OWN-30, Edge case 1)
Proof: run unit | ✓ career body > returns the body unchanged when every section is empty

**C37** - The public chat body ends with `## Looking forward next` after the Additional information section; an empty library sends today's empty-CV body with neither (OWN-27, Edge case 2)
Proof: run unit | ✓ public chat service owner notes > puts looking forward next last and leaves both out for an empty library

**C38** - The recruiter chat body (`ask` unlinked and linked, and `test`) ends with the Looking forward next section; an empty library sends today's empty-CV body (OWN-28, Edge case 2)
Proof: run unit | ✓ recruiter chat service owner notes > ends the body with looking forward next and leaves both out for an empty library

**C39** - A recruiter chat linked to a resume with tracking fields sends none of them to the model (OWN-10, AC 10)
Proof: run unit | ✓ recruiter chat service owner notes > never sends a linked resume's tracking fields

**C40** - The tailor body never contains the Looking forward next section or text (OWN-29, AC 29)
Proof: run unit | ✓ resume service owner notes > never sends looking forward next to the tailor

**C41** - Print view and markdown download contain none of the three tracking fields (OWN-10, AC 10)
Proof: run unit | ✓ admin print > keeps tracking fields out of print and download

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none. Paused after approval: user "Approve, don't build". Next: `validate_tasks.py owner-notes --execute` on `feat/owner-notes`, then the sub-agent offer (2 batches).
**Dispatched:** Batch A (Phases 1-2, T1-T5) worker at HEAD 83750d5 - sent 2026-11-24
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2
Phase 2:  T3 → T4 → T5
Phase 3:  T6 → T7
Phase 4:  T8 → T9 → T10 → T11
Phase 5:  T12
```

Execution is strictly sequential.
