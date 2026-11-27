# Recruiter Chat Edit Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline - see "Decisions made while writing tasks"
**Status**: Approved
**Approved**: 2026-11-27 - user: "Aprovo"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests use one Testcontainers `postgres:18-alpine` per run (needs Docker).

## Decisions made while writing tasks

- **Starts after `short-job-description` is merged** (spec dependency). Branch `feat/recruiter-chat-edit` from `main`. No schema change.
- **Shared validation**: the create checks in `RecruiterChatService.create()` move to one private `checkInput()` used by both `create()` and `update()`, so the field messages are identical (RCE-07).
- **Atomic max check**: `RecruiterChatRepo.update(id, patch)` runs `UPDATE … WHERE id = $1 AND used <= $maxQuestions RETURNING *`; no row → the service re-reads the chat: missing → `NotFoundError("Recruiter Chat not found")`, present → `ValidationError` on `maxQuestions` "must be at least the questions already used (N)" with the current `used`.
- **One form component**: `ChatForm` in `view.tsx` renders both "New chat" and "Edit chat" (`mode`, `chat?`); edit mode starts with empty hidden last-autofilled inputs, so stored text counts as the Owner's (RCE-12).
- **Routes**: `GET /admin/chats/:id/edit` and `GET /admin/chats/new` swap `#chat-form`; `PUT /admin/chats/:id` saves, triggers `chats-changed`, answers with the New chat form and "Saved" in the status line.

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md`, `vitest.config.ts` - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/repositories/recruiter-chat.repository.ts` | integration | Update paths: saved, below used, missing | `test/integration/repositories/recruiter-chat.repository.test.ts` | `pnpm test:int` |
| `src/services/recruiter-chat.service.ts` | unit, fakes | 1:1 to ACs; every validation message | `test/unit/services/recruiter-chat.service.test.ts` | `pnpm test:unit` |
| `src/admin/chats/view.tsx` | unit (render) | Both form modes, Edit action per row | `test/unit/admin/chats.test.tsx` | `pnpm test:unit` |
| `src/admin/chats/routes.ts` | unit (test app) | Happy + edge + error per route | `test/unit/admin/chats.test.tsx` | `pnpm test:unit` |
| Recruiter route after an edit | integration | Next question uses saved values, same token | `test/integration/routes/recruiter-chat.test.ts` | `pnpm test:int` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test:unit` |
| Full | After tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | After the last task | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

---

## Execution Plan

### Phase 1: Data and rules

```
T1 → T2
```

### Phase 2: Admin UI

```
T2 → T3 → T4 → T5
```

### Phase 3: End to end

```
T5 → T6
```

---

## Task Breakdown

### T1: Repository update with the max-questions guard

**What**: `RecruiterChatRepo.update(id, patch)` updating recruiter name, company, Job Description, resume, max questions and expiry only when `used <= maxQuestions`; fake updated.
**Where**: `src/repositories/recruiter-chat.repository.ts`
**Depends on**: None
**Reuses**: `revoke` / `reset` update style; `test/support/recruiter-chat.fake.ts`
**Requirement**: RCE-03, RCE-04, RCE-06

**Done when**:

- [x] Saves the six fields and returns the row; token, used, status unchanged
- [x] Returns null when `used` > new max, and for a missing id
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(chats): add a guarded recruiter chat update to the repository`

---

### T2: Service update

**What**: `RecruiterChatService.update(id, input)` with shared `checkInput()`, the below-used message, empty expiry → null, not-found message; status never changed.
**Where**: `src/services/recruiter-chat.service.ts`
**Depends on**: T1
**Reuses**: create's validation, moved to `checkInput()`
**Requirement**: RCE-03, RCE-04, RCE-06, RCE-07, RCE-08, RCE-09, RCE-10

**Done when**:

- [x] Every create validation answers the same message on update; below-used names N; revoked and expired chats save with status kept
- [x] Existing create tests still pass unchanged
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(chats): update a recruiter chat in place`

---

### T3: Shared chat form and Edit action

**What**: `ChatForm` with "New chat" and "Edit chat" modes (Save, Cancel), and an "Edit" action on each table row.
**Where**: `src/admin/chats/view.tsx`
**Depends on**: T2
**Reuses**: current New chat form and `AutofillFragment`
**Requirement**: RCE-01, RCE-12

**Done when**:

- [x] Edit mode holds the chat's six values, the resume selected, the expiry in `datetime-local` format, empty hidden last-autofilled inputs
- [x] New chat mode renders as before
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): render the chat form in edit mode`

---

### T4: Edit, cancel and save routes

**What**: `GET /admin/chats/:id/edit`, `GET /admin/chats/new`, `PUT /admin/chats/:id`.
**Where**: `src/admin/chats/routes.ts`
**Depends on**: T3
**Reuses**: create route's body parsing and error handling
**Requirement**: RCE-01, RCE-02, RCE-03, RCE-06, RCE-07, RCE-10

**Done when**:

- [x] Save answers the New chat form, "Saved" and `HX-Trigger: chats-changed`; errors answer 400/404 with the message in the status line
- [x] Edit of a deleted chat shows "Recruiter Chat not found" and keeps the New chat form
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): edit a recruiter chat from the chats page`

---

### T5: Autofill in the edit form

**What**: The autofill route accepts the edit form's fields, so a resume pick in edit mode follows the same rule; stored values count as the Owner's text.
**Where**: `src/admin/chats/routes.ts`
**Depends on**: T4
**Reuses**: `decideAutofill`, `POST /admin/chats/autofill`
**Requirement**: RCE-11, RCE-12

**Done when**:

- [x] Edit form with a stored Job Description + resume pick → "Not filled…" with Replace; Replace fills it
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(admin): autofill the edit chat form from the chosen resume`

---

### T6: Recruiter sees the edit on the next question

**What**: Integration test: create a chat, ask, edit its Job Description and resume, ask again with the same token.
**Where**: `test/integration/routes/recruiter-chat.test.ts`
**Depends on**: T5
**Reuses**: `test/support/recruiter-chat.ts`, recording mock model
**Requirement**: RCE-04, RCE-05

**Done when**:

- [ ] Second recorded model call carries the new Job Description data block; the same token works; earlier messages unchanged
- [ ] Build gate passes: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

**Tests**: integration
**Gate**: build

**Commit**: `test(chats): prove an edit reaches the next recruiter question`

---

## Checks

**C1** - "Edit" on a row shows "Edit chat" with the chat's six values, Save and Cancel, in place of the New chat form (RCE-01, AC 1)
Proof: run unit | ✓ GET /admin/chats/:id/edit > shows the edit form filled with the chat

**C2** - "Cancel" shows the empty New chat form and leaves the chat unchanged (RCE-02, AC 2)
Proof: run unit | ✓ GET /admin/chats/new > shows the empty new chat form

**C3** - "Save" stores the six fields, refreshes the table, shows "Saved" and the New chat form (RCE-03, AC 3)
Proof: run unit | ✓ PUT /admin/chats/:id > saves, refreshes rows and shows the new chat form

**C4** - A save keeps token, used, status and messages (RCE-04, AC 4)
Proof: run int | ✓ recruiter chat repository update > keeps token, used and status

**C5** - The recruiter's next question uses the saved Job Description and resume, with the same token (RCE-05, AC 5)
Proof: run int | ✓ recruiter chat edit > next question uses the saved job description

**C6** - Max questions below used answers 400 "must be at least the questions already used (N)" and changes nothing (RCE-06, AC 6)
Proof: run unit | ✓ recruiter chat update > rejects max questions below used

**C7** - The guard runs in the UPDATE: with `used` raised after the form opened, the save is refused (RCE-06, AC 6)
Proof: run int | ✓ recruiter chat repository update > refuses a max below the current used

**C8** - Empty name, Job Description over 2000, max outside 1-100, past expiry and unknown resume answer the create messages (RCE-07, AC 7)
Proof: run unit | ✓ recruiter chat update > rejects each invalid field with the create message

**C9** - An empty expiry stores no expiry (RCE-08, AC 8)
Proof: run unit | ✓ recruiter chat update > clears the expiry

**C10** - Revoked and expired chats save with their status kept (RCE-09, AC 9)
Proof: run unit | ✓ recruiter chat update > edits revoked and expired chats without changing status

**C11** - Saving a deleted chat answers 404 "Recruiter Chat not found" (RCE-10, AC 10)
Proof: run unit | ✓ PUT /admin/chats/:id > answers 404 for a deleted chat

**C12** - A resume pick in the edit form follows the New chat autofill rule (RCE-11, AC 1)
Proof: run unit | ✓ POST /admin/chats/autofill > applies the rule in the edit form

**C13** - Stored Job Description counts as Owner text: a pick shows "Not filled: the field has your own text." with Replace (RCE-12, AC 2)
Proof: run unit | ✓ edit chat form > treats stored values as owner text

**C14** - Saving unchanged values stores the same values and shows "Saved" (Edge case 1)
Proof: run unit | ✓ PUT /admin/chats/:id > saves unchanged values

**C15** - Opening Edit for a deleted chat shows "Recruiter Chat not found" and keeps the New chat form (Edge case 2)
Proof: run unit | ✓ GET /admin/chats/:id/edit > shows not found for a deleted chat

**C16** - Max equal to used is accepted, and the next question gets the limit-reached answer (Edge case 3)
Proof: run unit | ✓ recruiter chat update > accepts max equal to used and the next ask hits the limit

---

## Handoff

**Settled mid-build:** 2026-11-27 - user: "nao implementa ainda" (specs and tasks approved; Execute not started)
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2
Phase 2:  T3 → T4 → T5
Phase 3:  T6
```

Execution is strictly sequential.
