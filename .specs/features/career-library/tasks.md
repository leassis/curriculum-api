# Career Library Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/career-library/design.md`
**Status**: Approved
**Approved**: 2026-11-23 - user: "approvo mas nao inicia a implementacao"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests create a throwaway Neon branch per run (needs `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` in `.env`/`.env.local`). Use `rtk proxy pnpm vitest ...` for raw output.

## Decisions made while writing tasks

- **Starts from `main` after `structured-resume` is merged** (spec assumption, AD-003). `validate_tasks.py --execute` runs on that branch, not on `feat/structured-resume`.
- **Two migration files, one feature.** `0005` creates `career_library` and adds `profile.summary` (T9); `0006` drops `profile.master_cv` and sets every `tailored_resumes.structured` and `model` to NULL (T25, last code task). Dropping `master_cv` first would break the type check of every task in between. Neither runs against production without the user's go-ahead.
- **Shared fixture.** `test/support/career.ts` exports `sampleLibrary()` (2 experiences, one current with location and stack; 1 project; 2 educations; 1 current certification; 1 course; 2 skill groups; 1 language; nothing in publication or honour) and `item(kind, overrides)`; every later test uses them. It replaces `test/support/resume-document.ts` in T25.
- **The import prompt is fixed text, not a test target beyond its example**: its example block is asserted to parse with `parseItemsMarkdown` so the prompt and the parser cannot drift.

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (projects unit/integration, no coverage threshold) - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/services/career/*` (pure) | unit | Every branch; 1:1 to spec ACs and edge cases; round-trip property | `test/unit/services/career/*.test.ts` | `pnpm test:unit` |
| `src/services/tailor/*` (pure) | unit | Every branch; 1:1 to Tailored ACs | `test/unit/services/tailor/*.test.ts` | `pnpm test:unit` |
| `src/llm/import-prompt.ts` | unit | Example parses; no PII placeholders | `test/unit/llm/import-prompt.test.ts` | `pnpm test:unit` |
| `src/services/*.service.ts` | unit, fakes + recording mock | 1:1 to spec ACs, every edge case | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| `src/config.ts`, `settings-keys.ts` | unit | New area resolves from env and override | `test/unit/config.test.ts`, `test/unit/services/settings.service.test.ts` | `pnpm test:unit` |
| `src/db/schema.ts` + migrations | integration | Table/column created, column dropped, documents nulled, rows kept | `test/integration/db/career-migration.test.ts`, `constraints.test.ts` | `pnpm test:int` |
| `src/repositories/career.repository.ts` | integration | Read, update, row lock under concurrent updates | `test/integration/repositories/career.repository.test.ts` | `pnpm test:int` |
| `src/admin/career/view.tsx` | unit (render) | Every state: counts, empty, rows, disabled edges, forms per kind | `test/unit/admin/career.test.tsx` | `pnpm test:unit` |
| `src/admin/{profile,resumes,settings}` routes | unit (test app) + integration (real DB) | Every touched route: happy + 400 + 503 | `test/unit/admin/*.test.tsx`, `test/integration/routes/*.test.ts` | both |
| `GLOSSARY.md`, `RUNNING.md`, `.env.example` | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks with unit tests only | `pnpm test:unit` |
| Full | Tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | Phase end, docs-only tasks | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order. 26 tasks → 4 batches (Phase 1 = 7, Phase 2 = 6, Phase 3 = 7, Phase 4 = 6), offered to sub-agents (memory: user delegates implementation).

### Phase 1: Pure career modules

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Model area, data, CareerService

```
T7 → T8 → T9 → T10 → T11 → T12 → T13
```

### Phase 3: Tailoring v2 and Career Body consumers

```
T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 4: Admin screens, drop the Master CV, docs

```
T20 → T21 → T22 → T23 → T24 → T25 → T26
```

---

## Task Breakdown

### T1: Career Item schema

**What**: `KINDS`, `KIND_META` (section, add label, ongoing label, fields, required), `CareerItemSchema` with per-kind required fields, bounds, year/month/end-date rules and no " · " in organisation/location, `normalizeItem`, `CareerLibrarySchema` (≤ 200), plus the fixture `test/support/career.ts`.
**Where**: `src/services/career/item.ts`
**Depends on**: None
**Reuses**: zod, bounds from `src/services/tailor/document.ts`
**Requirement**: CLIB-04

**Done when**:

- [x] Unit tests for each kind's required fields, every bound in spec Edge Cases, year 1950-2100, month 1-12, month without year, end before start, `current` clearing the end, fields a kind lacks emptied, 200-item limit
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): add the Career Item schema and kinds`

---

### T2: Display rules

**What**: `formatDate`, `dateRange` ("Present", "No expiry"), `metaLine` per kind, `groupByKind` in `KINDS` order.
**Where**: `src/services/career/display.ts`
**Depends on**: T1
**Reuses**: `KIND_META`
**Requirement**: CLIB-01

**Done when**:

- [x] Unit tests for every meta-line shape in Library AC 4-8, empty parts omitted with their separator, kinds in order with empty kinds kept
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): format dates and meta lines per kind`

---

### T3: Pure item operations

**What**: `addItem`, `replaceItem`, `moveItem` (neighbour of the same kind, no-op at edges), `removeItem`.
**Where**: `src/services/career/ops.ts`
**Depends on**: T2
**Reuses**: `CareerItem` type
**Requirement**: CLIB-03

**Done when**:

- [x] Unit tests: move skips items of other kinds, first-up and last-down and only-item are no-ops, remove and replace by id, unknown id answers `null`
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): add pure add, replace, move and remove`

---

### T4: Form codec

**What**: `itemFromForm(kind, body)` (Details split into text and `- ` bullets, Tech stack and skills split on commas, months from selects, `current` checkbox) and `formValues(item)` (the inverse).
**Where**: `src/services/career/form.ts`
**Depends on**: T3
**Reuses**: `KIND_META.fields`
**Requirement**: CLIB-02

**Done when**:

- [x] Unit tests for Library AC 9c, 9d and `formValues(itemFromForm(x))` stability per kind
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): map item forms to Career Items and back`

---

### T5: Library markdown renderer

**What**: `renderItemsMarkdown(items)`: `## section`, `### title`, italic meta line, text, `- ` bullets, `Stack: a, b`, skill line, language level; escapes a text first line that looks like a meta line.
**Where**: `src/services/career/markdown.ts`
**Depends on**: T4
**Reuses**: `display.ts`
**Requirement**: CLIB-11

**Done when**:

- [ ] Unit tests for Markdown AC 1-2 on `sampleLibrary()` (exact expected string)
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): render the library as markdown`

---

### T6: Library markdown parser

**What**: `parseItemsMarkdown(md, existing)` with line-numbered errors, id reuse by kind + title + organisation, schema check per item at its `###` line, and the round-trip property test over generated libraries.
**Where**: `src/services/career/markdown.ts` (modify)
**Depends on**: T5
**Reuses**: `CareerItemSchema`, `display.ts` date grammar
**Requirement**: CLIB-11

**Done when**:

- [ ] Unit tests for Markdown AC 3-7: order kept, unknown section, unrecognised date, item outside a section, field rule at its line, id reuse and new ids, round trip over ≥ 200 generated libraries
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): parse library markdown deterministically`

---

### T7: Career Body renderer

**What**: `renderCareerBody({ headline, summary }, items, { ids? })`.
**Where**: `src/services/career/body.ts`
**Depends on**: T6
**Reuses**: `renderItemsMarkdown`
**Requirement**: CLIB-06

**Done when**:

- [ ] Unit tests for Career Body AC 1 and `[cN]` after titles when ids are given
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): render the Career Body from items`

---

### T8: `import` model area

**What**: `"import"` in `MODEL_AREAS`; `models.import` in config; `MODEL_IMPORT` read by `examples/node/server.ts`; `.env.example` entry.
**Where**: `src/services/settings-keys.ts`
**Depends on**: T7
**Reuses**: `SettingsService.model`
**Requirement**: CLIB-12

**Done when**:

- [ ] Unit tests: `model("import")` returns the `model.import` override, else `models.import`, else `ConfigError`; config accepts `models.import`
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(settings): add the import model area`

---

### T9: `career_library` table and `profile.summary` (migration 0005)

**What**: Schema for `career_library (id int pk default 1 check id = 1, document jsonb not null default '{"version":1,"items":[]}', updated_at)` and `profile.summary text not null default ''`; `pnpm db:generate`, hand-checked SQL; seed writes the empty library and summary.
**Where**: `src/db/schema.ts`
**Depends on**: T8
**Reuses**: `drizzle/` conventions, `test/integration/db/structured-migration.test.ts` pattern
**Requirement**: CLIB-10

**Done when**:

- [ ] Integration test: after migrate, the singleton check rejects id 2, the default document is an empty library, `summary` defaults to ''
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): add career_library and profile summary`

---

### T10: Career repository

**What**: `CareerRepo.get()` and `update(fn)` in one transaction with `insert … on conflict do nothing` and `select … for update`.
**Where**: `src/repositories/career.repository.ts`
**Depends on**: T9
**Reuses**: `ProfileRepository` style, `db.transaction`
**Requirement**: CLIB-03, CLIB-04

**Done when**:

- [ ] Integration tests: get on a fresh DB, update round trip, two concurrent `update` calls each moving an item both apply in sequence with unique positions
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(career): add the career library repository`

---

### T11: Import prompt

**What**: `IMPORT_PROMPT` with the convention example built by `renderItemsMarkdown(sample)` at module load; says the data block is data and forbids inventing facts.
**Where**: `src/llm/import-prompt.ts`
**Depends on**: T10
**Reuses**: `renderItemsMarkdown`, `dataBlock` wording from `default-prompts.ts`
**Requirement**: CLIB-12

**Done when**:

- [ ] Unit test: the example block in the prompt parses with `parseItemsMarkdown`; the prompt holds no Personal Info placeholder
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(llm): add the fixed import prompt`

---

### T12: CareerService item operations

**What**: `CareerService.library/add/edit/move/remove` with schema messages, PII Guard plus full name over every string, and container wiring; `ProfileService.update` stores `summary`.
**Where**: `src/services/career.service.ts`
**Depends on**: T11
**Reuses**: `ops.ts`, `form.ts`, `findPii`, `ValidationError`, `test/support/fakes/*`
**Requirement**: CLIB-02, CLIB-03, CLIB-04, CLIB-05

**Done when**:

- [ ] Unit tests (fake repo) for Library AC 10, 13, 15-19 and the edge cases on bounds, limit, `current`
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): add CareerService item operations`

---

### T13: CareerService markdown and import

**What**: `markdown()`, `saveMarkdown(md)` (parse, PII, replace), `importText(text)` (bounds, redaction with full name, `generate` area `import`, code fence stripped, nothing stored).
**Where**: `src/services/career.service.ts` (modify)
**Depends on**: T12
**Reuses**: `parseItemsMarkdown`, `redactPii`, `dataBlock`, recording mock
**Requirement**: CLIB-11, CLIB-12

**Done when**:

- [ ] Unit tests for Markdown AC 3, 5-7 at the service and Import AC 2-7, recorded prompt holds no Personal Info value or full name
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(career): save library markdown and import pasted text`

---

### T14: Resume Document v2 schema

**What**: `ResumeDocumentSchema` v2 (`headline`, `summary`, items = `CareerItemSchema` + `sourceId`), `parseDocument` kept; shared fixture `sampleDocumentV2()` in `test/support/career.ts`.
**Where**: `src/services/tailor/document.ts`
**Depends on**: T13
**Reuses**: `CareerItemSchema`
**Requirement**: CLIB-07

**Done when**:

- [ ] Unit tests: v2 accepted, v1 rejected with path `version`, item rules apply, 100 000-char cap
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): define Resume Document v2`

---

### T15: Tailor output v2 and annotation

**What**: `TailorOutputSchema` `{ headline, summary, items: { source_id, text, bullets }[] }` with descriptions; `annotate(items)` → `c1..cn` in library order.
**Where**: `src/services/tailor/output.ts`
**Depends on**: T14
**Reuses**: v1 output descriptions
**Requirement**: CLIB-07

**Done when**:

- [ ] Unit tests: every field described in the JSON Schema; ids in library order
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): v2 output schema with per-call item ids`

---

### T16: Assembler v2

**What**: `assemble(library, ids, out)`: reject unknown/duplicate ids; copy typed fields; text and bullets from the model; `sourceId`; model order per kind; restore omitted experience/education in library order.
**Where**: `src/services/tailor/assemble.ts`
**Depends on**: T15
**Reuses**: `cleanText`, `cleanLine`, `index()` from v1
**Requirement**: CLIB-07

**Done when**:

- [ ] Unit tests for Tailored AC 3-6 (assembler side), including a model reply with a different title or date that is ignored
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tailor): assemble v2 documents from library items`

---

### T17: ResumeService.generate and get on v2

**What**: `generate` reads the library (400 when empty, full name check), body `renderCareerBody(profile, items, { ids })`, existing retry loop; `get` parses v2 and logs invalid documents.
**Where**: `src/services/resume.service.ts`
**Depends on**: T16
**Reuses**: `tailorInput`, `TAILOR_ATTEMPTS`, recording mock
**Requirement**: CLIB-07, CLIB-09

**Done when**:

- [ ] Unit tests for Tailored AC 2, 6, 7, 12 and no Personal Info or full name in the recorded call
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): generate v2 documents from the career library`

---

### T18: ResumeService item operations on a copy

**What**: `addItem/editItem/moveItem/removeItem/editHeader` on the stored v2 document (`sourceId: null` for added items; library never written); remove v1 `save`, `formOp`, `stripDocument`, `documentStrings`.
**Where**: `src/services/resume.service.ts` (modify)
**Depends on**: T17
**Reuses**: `career/ops.ts`, `career/form.ts`, PII Guard
**Requirement**: CLIB-08

**Done when**:

- [ ] Unit tests for Tailored AC 9-10 and a deleted library item leaving the tailored copy unchanged
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): edit tailored items without touching the library`

---

### T19: Print and download from v2

**What**: `printData` / `download` render the v2 document with `renderCareerBody`; delete `tailor/render.ts`.
**Where**: `src/services/resume.service.ts` (modify)
**Depends on**: T18
**Reuses**: `buildPrint`
**Requirement**: CLIB-09

**Done when**:

- [ ] Unit tests: print body and download equal `renderCareerBody(document)`
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(resumes): print and download v2 documents`

---

### T20: Chats use the Career Body

**What**: `PublicChatService` body from the library (`EMPTY_CV` when empty); `RecruiterChatService` body from the resume v2, else the library.
**Where**: `src/services/public-chat.service.ts`
**Depends on**: T19
**Reuses**: `renderCareerBody`, `CareerService.library`
**Requirement**: CLIB-06, CLIB-09

**Done when**:

- [ ] Unit tests for Career Body AC 2-4 and the recruiter fallback; integration tests in `public-chat.test.ts` and `recruiter-chat.test.ts` updated to seed the library
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(chats): send the Career Body rendered from items`

---

### T21: Career cards and item form

**What**: `CareerCards` and `ItemForm` (pure JSX) as `.specs/features/career-library/captures/education-certifications-courses.png`, `.specs/features/career-library/captures/skills-publications-honours.png`, `.specs/features/career-library/captures/header-experience.png` and `.specs/features/career-library/captures/project-form.png`, with a `url` prop; CSS in `src/admin/styles/admin.css` and `pnpm build:css`.
**Where**: `src/admin/career/view.tsx`
**Depends on**: T20
**Reuses**: `OpButton`, card styles, design system
**Requirement**: CLIB-01, CLIB-02, CLIB-03

**Done when**:

- [ ] Unit render tests for Library AC 2-3, 9, 9a-9b, 11, 14-15 markup and kind order
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): add career cards and item form`

---

### T22: Profile page with the Career Library

**What**: Profile form loses Master CV and gains Summary; cards below it; item routes, markdown editor routes and import route under `/admin/profile`.
**Where**: `src/admin/profile/routes.ts`
**Depends on**: T21
**Reuses**: `CareerCards`, `swapErrorsInto`, test app
**Requirement**: CLIB-01, CLIB-02, CLIB-03, CLIB-05, CLIB-11, CLIB-12

**Done when**:

- [ ] Unit route tests for every route: happy, 400 with message and form kept, 503 on import; integration test: add, edit, move, delete, markdown save persist
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(admin): edit the career library on the profile page`

---

### T23: Tailored Resume editor with cards

**What**: Resume editor shows the Header card (Profile name, headline; summary on expand) and `CareerCards` over the document; item and header routes under `/admin/resumes/:id`; remove `DocumentForm`, `FormSwap` and the form/preview-form routes.
**Where**: `src/admin/resumes/routes.ts`
**Depends on**: T22
**Reuses**: `CareerCards`, `ItemForm`
**Requirement**: CLIB-08

**Done when**:

- [ ] Unit route tests for each item and header route (happy, 400); integration test: an edit on a resume leaves `career_library` unchanged
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(admin): edit tailored resumes with career cards`

---

### T24: Import model on Settings

**What**: "Import model" field with the other model fields.
**Where**: `src/admin/settings/view.tsx`
**Depends on**: T23
**Reuses**: existing model fields
**Requirement**: CLIB-12

**Done when**:

- [ ] Unit test: Settings shows "Import model"; a saved value is used by the next Convert (route + recording mock)
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): set the import model in settings`

---

### T25: Drop the Master CV (migration 0006)

**What**: Drop `profile.master_cv`; `update tailored_resumes set structured = null, model = null`; remove `parse-cv.ts`, `tailor/form.ts`, `test/support/resume-document.ts` and every remaining `masterCv` reference in src, seed and test support.
**Where**: `drizzle/0006_*.sql`
**Depends on**: T24
**Reuses**: `structured-migration.test.ts` pattern
**Requirement**: CLIB-10

**Done when**:

- [ ] Integration test: after migrate, `master_cv` is gone, every `structured` and `model` is NULL, resume rows, inputs and recruiter links kept
- [ ] `grep -rn "masterCv\|master_cv" src test examples` finds only migration history
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full
**Commit**: `feat(db)!: drop the markdown master CV`

---

### T26: Glossary, running notes, handoff

**What**: GLOSSARY (Career Library, Career Item, Item kind, Tech stack; Master CV and Resume Document updated), `RUNNING.md` `MODEL_IMPORT`, STATE handoff marks `honest-assessment` spec stale.
**Where**: `GLOSSARY.md`
**Depends on**: T25
**Reuses**: domain-modeling conventions
**Requirement**: CLIB-10

**Done when**:

- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: none
**Gate**: build
**Commit**: `docs: describe the career library`

---

## Checks

**C1** - The Career Library cards come in the order Experience, Projects, Education, Certifications, Courses, Skills, Languages, Publications, Honours (CLIB-01, Library AC 1)
Proof: run unit | ✓ career cards > renders the cards in kind order

**C2** - The Education, Certifications and Courses cards look like the capture (CLIB-01, Library AC 1)
Proof: browser captures/education-certifications-courses.running.png

**C3** - The Skills card and the empty Publications and Honours cards look like the capture (CLIB-01, Library AC 1, 3)
Proof: browser captures/skills-publications-honours.running.png

**C4** - A card with items shows the count badge with the item count (CLIB-01, Library AC 2)
Proof: run unit | ✓ career cards > shows the item count next to a card with items

**C5** - An empty card shows "Nothing here yet." and no count badge (CLIB-01, Library AC 3)
Proof: run unit | ✓ career cards > shows nothing here yet and no badge for an empty kind

**C6** - An experience meta line is "organisation · location · dates" and a project "organisation · dates", empty parts dropped with their separator (CLIB-01, Library AC 4)
Proof: run unit | ✓ display > builds experience and project meta lines without empty parts

**C7** - Education, certification and course rows read "organisation · dates" (CLIB-01, Library AC 5)
Proof: run unit | ✓ display > builds education certification and course meta lines

**C8** - Skill groups have no meta line, languages show the level, publications and honours "organisation · dates" (CLIB-01, Library AC 6)
Proof: run unit | ✓ display > builds skill group language publication and honour meta lines

**C9** - Dates read "Jan 2023" with a month, "2003" without, and ranges "start – end" (CLIB-01, Library AC 7)
Proof: run unit | ✓ display > formats dates and ranges

**C10** - A current experience ends "Present" and a current certification "No expiry" (CLIB-01, Library AC 8)
Proof: run unit | ✓ display > ends current experience with present and current certification with no expiry

**C11** - "+ Add <kind>" shows an empty form for that kind at the end of its card (CLIB-02, Library AC 9)
Proof: run unit | ✓ admin profile career > add opens an empty form at the end of the card

**C12** - Add project shows the form in the capture (CLIB-02, Library AC 9a)
Proof: browser captures/project-form.running.png

**C13** - Each kind's form has only its fields, and the ongoing checkbox reads "I currently work here" for experience, "Ongoing" for project and "No expiry" for certification (CLIB-02, Library AC 9b)
Proof: run unit | ✓ career cards > item form shows the kind fields and its ongoing label

**C14** - Details lines starting "- " become bullets, other lines text, and the form shows them joined back (CLIB-02, Library AC 9c)
Proof: run unit | ✓ career form > splits details into text and bullets and joins them back

**C15** - Tech stack is split on commas, trimmed, empties dropped, and shown joined with ", " (CLIB-02, Library AC 9d)
Proof: run unit | ✓ career form > splits the tech stack on commas and joins it back

**C16** - Saving a valid form stores the item and re-renders the card with the new row and count (CLIB-02, Library AC 10)
Proof: run int | ✓ admin profile career routes > saves a new item and re-renders its card

**C17** - The pencil replaces the row with a form holding the item's fields, Save and Cancel (CLIB-02, Library AC 11)
Proof: run unit | ✓ admin profile career > edit replaces the row with a filled form

**C18** - Cancel shows the row unchanged (CLIB-02, Library AC 12)
Proof: run unit | ✓ admin profile career > cancel shows the row unchanged

**C19** - Move up/down swaps the item with its neighbour of the same kind and stores the order (CLIB-03, Library AC 13)
Proof: run unit | ✓ career ops > moves an item past its neighbour of the same kind

**C20** - The move is stored and re-rendered (CLIB-03, Library AC 13)
Proof: run int | ✓ admin profile career routes > stores a move and re-renders the card

**C21** - Move up is disabled on the first row and move down on the last row of a card (CLIB-03, Library AC 14)
Proof: run unit | ✓ career cards > disables move up on the first row and move down on the last

**C22** - The trash button confirms "Delete this item?" and delete removes the item (CLIB-03, Library AC 15)
Proof: run unit | ✓ admin profile career > delete asks delete this item and removes the item

**C23** - An empty required field answers 400 "<Field> is required" and keeps the form open with the values (CLIB-04, Library AC 16)
Proof: run unit | ✓ admin profile career > answers field is required and keeps the entered values

**C24** - Each kind's required fields are enforced (CLIB-04, Edge Cases)
Proof: run unit | ✓ career item schema > requires the fields of each kind

**C25** - An end date before the start answers 400 "End date is before start date" (CLIB-04, Library AC 17)
Proof: run unit | ✓ career service > rejects an end date before the start date

**C26** - A Personal Info value or the full name in any item field answers 400 with the PII Guard message and stores nothing (CLIB-04, Library AC 18)
Proof: run unit | ✓ career service > rejects personal info and the full name in item fields

**C27** - Headline and summary are stored on the Profile (CLIB-05, Library AC 19)
Proof: run int | ✓ admin profile routes > stores headline and summary

**C28** - A year outside 1950-2100 or a month outside 1-12 answers 400 "<Field> is out of range" (CLIB-04, Edge Cases)
Proof: run unit | ✓ career item schema > rejects years and months out of range

**C29** - A month without its year answers 400 "<Field> needs a year" (CLIB-04, Edge Cases)
Proof: run unit | ✓ career item schema > rejects a month without its year

**C30** - A current item is stored with no end date (CLIB-04, Edge Cases)
Proof: run unit | ✓ career item schema > clears the end date of a current item

**C31** - The 201st item answers 400 "The library is limited to 200 items" (CLIB-04, Edge Cases)
Proof: run unit | ✓ career service > rejects an item beyond 200

**C32** - Field length and count bounds answer 400 naming the field (CLIB-04, Edge Cases)
Proof: run unit | ✓ career item schema > rejects every field over its bound

**C33** - Moving the only item of a kind keeps it in place (CLIB-03, Edge Cases)
Proof: run unit | ✓ career ops > keeps the only item of a kind in place

**C34** - Two concurrent moves apply in sequence and positions stay unique (CLIB-03, Edge Cases)
Proof: run int | ✓ career repository > applies concurrent updates in sequence

**C35** - "Edit as markdown" shows the library rendered in the convention (CLIB-11, Markdown AC 1)
Proof: run unit | ✓ admin profile career > edit as markdown shows the rendered library

**C36** - The renderer writes sections, titles, italic meta lines, text, bullets, "Stack:" lines, skills and levels as the convention says (CLIB-11, Markdown AC 2)
Proof: run unit | ✓ library markdown > renders the sample library in the convention

**C37** - Saving markdown replaces the library with the parsed items in the markdown's order, without a model call (CLIB-11, Markdown AC 3)
Proof: run unit | ✓ career service > save markdown replaces the library in markdown order without the llm

**C38** - Parsing the rendering of any valid library gives the same items, fields, order and ids (CLIB-11, Markdown AC 4)
Proof: run unit | ✓ library markdown > round trips generated libraries

**C39** - A parsed item with the same kind, title and organisation keeps the existing id; others get new ids (CLIB-11, Markdown AC 5)
Proof: run unit | ✓ library markdown > reuses ids by kind title and organisation

**C40** - An unknown section, an unrecognised date or an item outside a section answers 400 "line <n>: <reason>" and stores nothing (CLIB-11, Markdown AC 6)
Proof: run unit | ✓ library markdown > reports the line of a convention error

**C41** - A field rule broken in markdown answers 400 "line <n>: <field message>" at the item's line (CLIB-11, Markdown AC 7)
Proof: run unit | ✓ library markdown > reports a field rule at the item line

**C42** - A rejected markdown save keeps the textarea text (CLIB-11, Markdown AC 6)
Proof: run unit | ✓ admin profile career > keeps the markdown text after a 400

**C43** - Cancel in the markdown editor shows the cards unchanged (CLIB-11, Markdown AC 8)
Proof: run unit | ✓ admin profile career > markdown cancel shows the cards unchanged

**C44** - "Import from text" shows a textarea with Convert and Cancel (CLIB-12, Import AC 1)
Proof: run unit | ✓ admin profile career > import shows a textarea with convert and cancel

**C45** - Personal Info values and the full name are replaced by "[redacted]" before the import call (CLIB-12, Import AC 2)
Proof: run unit | ✓ career service import > redacts personal info and the full name before the call

**C46** - Convert sends the text in a data block with the import prompt to the import model and puts the reply in the markdown editor (CLIB-12, Import AC 3)
Proof: run unit | ✓ career service import > sends the data block to the import model and returns its markdown

**C47** - Convert stores nothing (CLIB-12, Import AC 4)
Proof: run unit | ✓ career service import > stores nothing

**C48** - Empty pasted text answers 400 "Paste some text to import" (CLIB-12, Import AC 5)
Proof: run unit | ✓ career service import > rejects empty text

**C49** - Pasted text over 50 000 characters answers 400 "Text is limited to 50000 characters" (CLIB-12, Import AC 6)
Proof: run unit | ✓ career service import > rejects text over 50000 characters

**C50** - A failed import call answers 503 and keeps the pasted text (CLIB-12, Import AC 7)
Proof: run unit | ✓ admin profile career > import outage answers 503 and keeps the text

**C51** - Settings shows "Import model" and a saved value is used by the next Convert (CLIB-12, Import AC 8)
Proof: run unit | ✓ admin settings > import model is shown and used by the next convert

**C52** - The import model resolves from `model.import`, then `MODEL_IMPORT` (CLIB-12, Import AC 3)
Proof: run unit | ✓ settings service > resolves the import model from override then config

**C53** - The import prompt's example parses with the library parser (CLIB-12, Import AC 3)
Proof: run unit | ✓ import prompt > example parses with the library parser

**C54** - The Career Body is headline, summary, then the items in section order in the convention (CLIB-06, Career Body AC 1)
Proof: run unit | ✓ career body > renders headline summary and items in section order

**C55** - A Visitor question sends the Career Body rendered from the library (CLIB-06, Career Body AC 2)
Proof: run unit | ✓ public chat service > sends the career body rendered from the library

**C56** - An empty library sends the empty-CV body to the Public Chat (CLIB-06, Career Body AC 3)
Proof: run unit | ✓ public chat service > sends the empty cv body when the library is empty

**C57** - No Personal Info value or full name is in a rendered Career Body (CLIB-06, Career Body AC 4)
Proof: run unit | ✓ career service > keeps personal info and the full name out of the career body

**C58** - A stored document is `{ version: 2, headline, summary, items }` with the item fields of the spec (CLIB-07, Tailored AC 1)
Proof: run unit | ✓ resume document v2 > accepts the v2 shape and rejects v1

**C59** - Generate sends the items with `[cN]` ids and the Job Description, and nothing from the Personal Header (CLIB-07, Tailored AC 2)
Proof: run unit | ✓ resume service v2 generate > sends annotated items and no personal header

**C60** - Typed fields are copied from the library item even when the model returns others; text and bullets come from the model (CLIB-07, Tailored AC 3)
Proof: run unit | ✓ assemble v2 > copies typed fields from the library and bodies from the model

**C61** - Every built item carries the library id as `sourceId` (CLIB-07, Tailored AC 4)
Proof: run unit | ✓ assemble v2 > sets source id to the library item id

**C62** - Omitted experience and education items are restored with library text in library order after the model's items of that kind (CLIB-07, Tailored AC 5)
Proof: run unit | ✓ assemble v2 > restores omitted experience and education after the model items

**C63** - An unknown or duplicate id is rejected, retried once, and a second rejection answers 503 with the document unchanged (CLIB-07, Tailored AC 6)
Proof: run unit | ✓ resume service v2 generate > retries once then fails leaving the document unchanged

**C64** - Generate with an empty library answers 400 "Add Career Items to your profile before generating" without a model call (CLIB-07, Tailored AC 7)
Proof: run unit | ✓ resume service v2 generate > rejects an empty library before calling the llm

**C65** - The Tailored Resume editor shows the Header card and the item cards as the capture (CLIB-08, Tailored AC 8)
Proof: browser captures/header-experience.running.png

**C66** - An edit, move, add or delete on a Tailored Resume changes only its document; the Career Library is unchanged (CLIB-08, Tailored AC 9)
Proof: run int | ✓ admin resumes career routes > edits the resume copy and leaves the library unchanged

**C67** - An item added to a Tailored Resume has `sourceId` null (CLIB-08, Tailored AC 10)
Proof: run unit | ✓ resume service items > adds an item with a null source id

**C68** - Deleting a library item leaves the tailored item with that `sourceId` unchanged (CLIB-08, Edge Cases)
Proof: run unit | ✓ resume service items > keeps a tailored item whose library item was deleted

**C69** - Print View and download render the v2 document with the Career Body renderer (CLIB-09, Tailored AC 11)
Proof: run unit | ✓ resume service v2 print > renders print and download with the career body

**C70** - The Recruiter Chat sends the resume's Career Body, else the library's (CLIB-09, Tailored AC 11)
Proof: run unit | ✓ recruiter chat service > sends the resume career body or the library body

**C71** - A stored document that is not a valid v2 reads as not generated and logs `stored resume document invalid` with id and path (CLIB-09, Tailored AC 12)
Proof: run unit | ✓ resume service v2 get > treats an invalid document as not generated and logs it

**C72** - Migration 0005 creates the singleton `career_library` with an empty default document and `profile.summary` (CLIB-10)
Proof: run int | ✓ career migration > creates the singleton library and the profile summary

**C73** - Migration 0006 drops `master_cv`, nulls every `structured` and `model`, and keeps resume rows, inputs and recruiter links (CLIB-10)
Proof: run int | ✓ career migration > drops the master cv and discards v1 documents keeping rows

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** batch 1 (T1-T7) -> sonnet sub-agent, 2026-11-23
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11 → T12 → T13
Phase 3:  T14 → T15 → T16 → T17 → T18 → T19 → T20
Phase 4:  T21 → T22 → T23 → T24 → T25 → T26
```

Execution is strictly sequential. 26 tasks pack into 4 batches of whole phases (7, 6, 7, 6).
