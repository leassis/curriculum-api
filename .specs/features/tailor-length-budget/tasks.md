# Tailor Length Budget Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (no design.md) - see "Design notes" below
**Status**: Approved
**Approved**: 2026-11-28 - user: "Approve"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit test/unit/services/tailor/length.test.ts test/unit/services/tailor/budget.test.ts test/unit/services/tailor/fit.test.ts test/unit/services/settings.service.test.ts test/unit/services/resume.service.test.ts test/unit/llm/default-prompts.test.ts test/unit/admin/resumes.test.tsx test/unit/admin/settings.test.tsx --reporter=verbose`
**Run int**: `pnpm vitest run --project integration test/integration/db/target-pages-migration.test.ts test/integration/services/settings.service.test.ts --reporter=verbose`

---

## Design notes

- `src/services/tailor/length.ts`: `estimatePages(doc, pageSize)` - line-based: each block (headline, summary paragraph, item title, meta line, text paragraph, bullet, skills line) costs `ceil(chars / charsPerLine)` lines plus measured spacing; headings cost fixed lines; a fixed allowance covers the Personal Header (only its line count, never its values). Constants come from the spec's `## Measurement`; Letter scales by printable area.
- `src/services/tailor/budget.ts`: `bulletCaps(library, targetPages, pageSize)` → `Map<itemId, cap>` for experiences, per spec AC P1.2-3.
- Experience bullet budget (spec leaves it open): `targetPages × 2,340 characters` (× 0.965 for Letter) less the library's printed characters outside experience bullets (titles, meta lines, text, skills, other kinds' bullets); the mean bullet length is taken over every library bullet.
- `src/services/tailor/fit.ts`: `fitToBudget(doc, caps, targetPages, pageSize)` → `{ doc, estimate }`, per spec AC P1.4-7.
- `resume.service.generate` passes caps and target into `tailorInput`, and runs `fitToBudget` on the finished document before storing it. Pure functions stay in `services/tailor/`; views receive the estimate as a prop.

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: `CLAUDE.md` (layering, tests use the recording mock model), `vitest.config.ts` (unit and integration projects).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Tailor pure logic (`services/tailor/*`) | unit | All branches; 1:1 to spec ACs; every edge case | `test/unit/services/tailor/*.test.ts` | `pnpm test:unit` |
| Services (`services/*.service.ts`) | unit | ACs the service owns; validation errors | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| Settings service with DB | integration | Key read/write paths | `test/integration/services/*.test.ts` | `pnpm test:int` |
| Migration | integration | Existing rows get the default; check constraint | `test/integration/db/*-migration.test.ts` | `pnpm test:int` |
| Admin views and routes | unit | Rendered states and form handling | `test/unit/admin/*.test.tsx` | `pnpm test:unit` |
| Prompts | unit | Rule text present | `test/unit/llm/*.test.ts` | `pnpm test:unit` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test:unit` |
| Full | After tasks with integration tests | `pnpm test` |
| Build | Every commit (CLAUDE.md gate) | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

### Phase 1: Pure budget logic

```
T1 → T2 → T3
```

### Phase 2: Target pages storage

```
T4 → T5
```

### Phase 3: Generation

```
T6 → T7 → T8
```

### Phase 4: Admin

```
T9 → T10
```

---

## Task Breakdown

### T1: Add the page estimate

**What**: `estimatePages(doc, pageSize)` with the constants in the spec's `## Measurement`.
**Where**: `src/services/tailor/length.ts`
**Depends on**: None
**Reuses**: `ResumeDocument` from `document.ts`
**Requirement**: LEN-06

**Done when**:

- [x] A document of N one-line bullets estimates within the measured lines per page; a Letter estimate is the A4 one scaled by printable area; an empty document estimates the header allowance only
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(tailor): estimate a resume's printed pages`
**Status**: done

---

### T2: Compute bullet caps per experience

**What**: `bulletCaps(library, targetPages, pageSize)` - recency ranking, weights 1/0.8/0.6/0.4/0.2/0, cap ≤ library bullet count, 120-char mean when the library has no bullets.
**Where**: `src/services/tailor/budget.ts`
**Depends on**: T1
**Reuses**: `estimatePages` constants
**Requirement**: LEN-02, LEN-06

**Done when**:

- [x] Tests cover ranking (current first, then end year and month), the weights, the sixth role at 0, the library-count ceiling, and the 120-char fallback
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(tailor): compute bullet caps from the page budget`
**Status**: done

---

### T3: Fit the assembled document to the budget

**What**: `fitToBudget(doc, caps, targetPages, pageSize)` - trims to caps, then drops project bullets, then experience bullets oldest to newest, until it fits; keeps every experience; returns the estimate.
**Where**: `src/services/tailor/fit.ts`
**Depends on**: T2
**Reuses**: `estimatePages`
**Requirement**: LEN-03

**Done when**:

- [x] Tests cover cap trimming, fewer bullets than a cap, the cut order, every experience kept, and an over-minimum document returned with its estimate
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(tailor): cut bullets until the resume fits its target`
**Status**: done

---

### T4: Add the target pages column

**What**: `tailored_resumes.target_pages` integer not null default 2, check between 1 and 3, as its own migration (`pnpm db:generate`). Must land on `main` before any other schema branch.
**Where**: `src/db/schema.ts`
**Depends on**: None
**Reuses**: existing `check(...)` pattern on `tailored_resumes`
**Requirement**: LEN-04

**Done when**:

- [x] Migration test: an existing row gets 2; inserting 4 violates the check
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: integration
**Gate**: build
**Commit**: `feat(db): add target pages to tailored resumes`
**Status**: done

---

### T5: Add the print.targetPages setting

**What**: `TARGET_PAGES_KEY = "print.targetPages"` in `SETTINGS_KEYS`, `settings.targetPages()` returning the override or 2, and rejection of values outside 1-3.
**Where**: `src/services/settings.service.ts`
**Depends on**: T4
**Reuses**: `pageSize()` and its validation
**Requirement**: LEN-04

**Done when**:

- [x] Tests: unset → 2; "3" → 3; "4" rejected with a validation error, stored value kept
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: integration
**Gate**: build
**Commit**: `feat(settings): add a default target pages setting`
**Status**: done

---

### T6: Store target pages on resumes

**What**: `create` sets `targetPages` from `settings.targetPages()`; `updateOptions` accepts and validates 1-3.
**Where**: `src/services/resume.service.ts`
**Depends on**: None (Phase 2 before it)
**Reuses**: `updateOptions` validation pattern
**Requirement**: LEN-04

**Done when**:

- [ ] Tests: create takes the setting; update to 3 stored; 0 rejected with the stored value kept
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(resumes): store target pages per resume`

---

### T7: Budget the tailor call

**What**: `generate` computes caps, states the target pages and each experience's cap by item id in `tailorInput`, and stores the document `fitToBudget` returns.
**Where**: `src/services/resume.service.ts`
**Depends on**: T6
**Reuses**: `annotate` ids, recording mock model
**Requirement**: LEN-01, LEN-03

**Done when**:

- [ ] Tests: the recorded input contains "Target length: 2 pages" and "c1: at most N bullets"; a 9-role, 43-bullet reply returning every bullet is stored at ≤ 2 estimated pages with every role kept
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(tailor): pass the length budget to the model and enforce it`

---

### T8: Tell the tailor to respect the caps

**What**: Replace "to save space, compress its bullets" with a rule to keep within the target length and each role's bullet cap, a role may keep zero bullets.
**Where**: `src/llm/default-prompts.ts`
**Depends on**: T7
**Reuses**: existing tailor prompt test
**Requirement**: LEN-01

**Done when**:

- [ ] Test asserts the new rule text and that "Never drop or merge a role" stays
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `fix(llm): tell the tailor to keep within the length budget`

---

### T9: Show target pages and the estimate in the resume editor

**What**: Editor gets a target pages select (1/2/3), saved through the options form, and "~X.Y of N pages" with an over-target warning when a document exists.
**Where**: `src/admin/resumes/view.tsx` (props) with its route passing `targetPages` and the estimate
**Depends on**: None (Phases 1-3 before it)
**Reuses**: options form and existing view props
**Requirement**: LEN-04, LEN-05

**Done when**:

- [ ] Tests: select shows the stored value; saving 3 posts it; "~2.3 of 2 pages" and the warning at 2.3/2; no estimate without a document; no warning at 1.8/2
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(admin): show target pages and the page estimate on a resume`

---

### T10: Add target pages to the Settings page

**What**: Settings page field for `print.targetPages` (1/2/3, empty = default 2), rejecting other values.
**Where**: `src/admin/settings/routes.ts`
**Depends on**: T9
**Reuses**: the `print.pageSize` field
**Requirement**: LEN-04

**Done when**:

- [ ] Tests: field renders with the fallback 2; saving 1 stores it; 5 shows an error
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: unit
**Gate**: build
**Commit**: `feat(admin): add the target pages default to Settings`

---

## Checks

**C1** - The tailor input states "Target length: 2 pages" and each experience's cap as "cN: at most K bullets" (LEN-01, P1 AC 1)
Proof: run unit | ✓ states the target pages and bullet caps in the tailor input

**C2** - Experiences rank current first, then by latest end year and month, with weights 1, 0.8, 0.6, 0.4, 0.2 and 0 for the sixth and older (LEN-02, P1 AC 2)
Proof: run unit | ✓ weights experiences by recency

**C3** - No cap exceeds the role's library bullet count (LEN-02, P1 AC 3)
Proof: run unit | ✓ never caps above the library bullet count

**C4** - Bullets past a role's cap are dropped from the end (LEN-03, P1 AC 4)
Proof: run unit | ✓ keeps only the first cap bullets of an experience

**C5** - Over budget, project bullets go first, then experience bullets oldest to newest (LEN-03, P1 AC 5)
Proof: run unit | ✓ drops project bullets first, then experiences oldest to newest

**C6** - Every experience is kept, with zero bullets at the least (LEN-03, P1 AC 6)
Proof: run unit | ✓ keeps every experience whatever the budget

**C7** - A document still over target with no bullets left is returned with its estimate (LEN-03, P1 AC 7)
Proof: run unit | ✓ returns an over-minimum document with its estimate

**C8** - A 9-role, 43-bullet reply returning every bullet is stored at ≤ 2 estimated pages (LEN-03, Independent Test)
Proof: run unit | ✓ stores a long reply cut to the target pages

**C9** - A new resume takes `print.targetPages`, 2 when unset (LEN-04, P2 AC 1)
Proof: run unit | ✓ creates a resume with the default target pages

**C10** - Saving target pages 3 stores it (LEN-04, P2 AC 2)
Proof: run unit | ✓ stores target pages from the options

**C11** - Target pages 0 or 4 is rejected for a resume and for the setting, stored value kept (LEN-04, P2 AC 3)
Proof: run unit | ✓ rejects target pages outside 1 to 3

**C12** - `print.targetPages` "4" is rejected by the settings service against the DB (LEN-04, P2 AC 3)
Proof: run int | ✓ rejects a target pages override outside 1 to 3

**C13** - The migration gives existing resumes target pages 2 and rejects 4 (LEN-04, P2 AC 4)
Proof: run int | ✓ gives existing resumes target pages 2

**C14** - The editor shows "~2.3 of 2 pages" for a 2.3-page estimate at target 2 (LEN-05, P3 AC 1)
Proof: run unit | ✓ shows the page estimate against the target

**C15** - The editor warns when the estimate exceeds the target, not at 1.8 of 2 (LEN-05, P3 AC 2)
Proof: run unit | ✓ warns only when the estimate exceeds the target

**C16** - No estimate shows without a Resume Document (LEN-05, P3 AC 3)
Proof: run unit | ✓ shows no estimate before the first generation

**C17** - The library with no bullets uses a 120-char mean bullet length (LEN-06, edge case)
Proof: run unit | ✓ uses 120 characters when the library has no bullets

**C18** - A Letter estimate is the A4 estimate scaled by printable area (LEN-06, edge case)
Proof: run unit | ✓ scales the estimate for Letter

**C19** - Fewer bullets than a cap are all kept (LEN-03, edge case)
Proof: run unit | ✓ keeps every bullet under the cap

**C20** - The Settings page saves and validates `print.targetPages` (LEN-04, P2 AC 3)
Proof: run unit | ✓ saves the target pages default in Settings

**C21** - The tailor prompt keeps "Never drop or merge a role" and adds the budget rule (LEN-01)
Proof: run unit | ✓ tailor prompt asks to keep within the length budget

---

## Handoff

**Settled mid-build:** user: "nao implemente codigo... mas continue" then "Restaurar spec + medir" - no code in this session; spec, tasks and measurement only, uncommitted.
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5
Phase 3:  T6 ------→ T7 ------→ T8
Phase 4:  T9 ------→ T10
```
