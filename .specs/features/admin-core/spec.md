# Admin Core Specification

**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"

**Depends on**: `foundation` merged (AD-003). Owns: `src/admin/login.tsx`, `src/admin/dashboard.tsx`, `src/admin/profile.tsx`, `src/admin/settings.tsx`, `src/admin/personal-info.tsx`, `src/security/admin-auth.ts`, `src/repositories/admin-login-attempt.repository.ts`, their tests.

## Problem Statement

The Owner needs to sign in and manage the Profile (name, headline, Master CV, prompts), Settings Overrides and Personal Info Fields without touching the database. Today everything is seeded by hand. Every save of a Career Body must be checked by the PII Guard, and login must resist brute force.

## Goals

- [x] The Owner edits CV, prompts, settings and personal info only through the admin.
- [x] A Master CV containing the Owner's email is rejected on save.
- [x] A 6th wrong password within 15 minutes is refused even when correct.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Auth guard, CSRF, layout, HTMX, HTML error mapping | Built in `foundation` (admin shell) |
| Printable master CV (`/admin/profile/print`) | `tailored-resumes` track (shared print view) |
| Chats and resumes pages | Their own tracks |
| GitHub OAuth, multiple admins, password change in UI | Q7: bcrypt hash from env; one Owner |
| Dashboard charts and per-day stats | Roadmap Phase 6 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Throttle window | Fixed 15-minute window per IP hash, 5 failures; success does not reset the count | Fixed window fits one atomic upsert (AD-004) | n |
| Failed-login delay | Every failed attempt waits 500 ms before answering | §5.3 "small artificial delay" | n |
| Masked value display | `••••••` (fixed length, leaks no length) | Mask must not reveal value length | n |
| Personal info ordering UI | Numeric `sortOrder` input per field, no drag-and-drop | No client framework (§5.3) | n |
| Settings form | One input per allowed key; empty input = remove override and show the config fallback as placeholder | Foundation `settingsService.set` semantics | n |
| Dashboard content | Counts: active Recruiter Chats, Tailored Resumes, public Questions today | §5.3 "counts, recent usage"; stats are Phase 6 | n |
| Personal info key rename | Not allowed; delete and re-create | Key is the PK and is referenced by `headerFields` | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Sign in and out ⭐ MVP

**User Story**: As the Owner, I want to sign in with my password and sign out so that only I can use the admin.

**Why P1**: Every admin page needs it.

**Acceptance Criteria**:

1. WHEN `GET /admin/login` is requested THEN the app SHALL render a form with one password field and a "Sign in" button.
2. WHEN `POST /admin/login` receives the password matching `adminPasswordHash` THEN the app SHALL set `curr_admin` (scope `admin`, 8 h) and answer 303 to `<basePath>/admin`.
3. IF the password does not match THEN the app SHALL wait 500 ms, record a failed attempt for the IP hash, and re-render the form with status 401 and the text "Invalid password".
4. IF the IP hash has 5 failed attempts in the current 15-minute window THEN `POST /admin/login` SHALL answer 429 with the text "Too many attempts. Try again later." without checking the password.
5. WHEN `POST /admin/logout` is requested THEN the app SHALL clear `curr_admin` and answer 303 to `<basePath>/admin/login`.
6. WHEN 10 failed logins from one IP arrive in parallel THEN `admin_login_attempts.count` SHALL equal 10.

**Independent Test**: Hash of `pw` in config → `pw` → 303 + cookie; `x` ×5 → 6th with `pw` → 429.

---

### P1: Edit the Profile ⭐ MVP

**User Story**: As the Owner, I want to edit my name, headline, Master CV and the three system prompts so that chats and tailoring use current content.

**Why P1**: The Master CV is the context of every chat.

**Acceptance Criteria**:

1. WHEN `GET /admin/profile` is requested THEN the app SHALL render a form prefilled with `fullName`, `headline`, `masterCv`, `publicSystemPrompt`, `recruiterSystemPrompt`, `tailorSystemPrompt`.
2. WHEN `POST /admin/profile` receives valid fields THEN the app SHALL save them via `profileService.update` and re-render the form with the text "Saved".
3. IF a prompt field is empty THEN the app SHALL answer 400 with the form and the text "<Field label> is required", and SHALL not save.
4. IF `masterCv` contains a Personal Info Field value THEN the app SHALL answer 400 with the text "Your <label> is in the body — keep contact data in Personal info" and SHALL not save.
5. WHEN the profile is saved THEN the next chat request SHALL use the new Master CV and prompts.

**Independent Test**: Save a CV containing the `EMAIL` field value → 400 with "Your Email is in the body…"; DB unchanged.

---

### P1: Manage Personal Info Fields ⭐ MVP

**User Story**: As the Owner, I want to add, edit, reorder, reveal and delete my personal fields with a visibility each so that the UI and print show the right contact data and the LLM never sees it.

**Why P1**: Contact data has no other source (nothing personal is hard-coded).

**Acceptance Criteria**:

1. WHEN `GET /admin/personal-info` is requested THEN the app SHALL list every field with key, label, visibility, sort order and the value shown as `••••••`.
2. The HTML of `GET /admin/personal-info` SHALL not contain any decrypted value.
3. WHEN `POST /admin/personal-info` receives a valid key, label, value, visibility and sort order THEN the app SHALL create the field and return the updated list fragment.
4. IF creation input is invalid (foundation FND-21 rules) THEN the app SHALL answer 400 with a fragment naming the invalid field.
5. WHEN `PUT /admin/personal-info/:key` receives label, visibility, sort order and an optional value THEN the app SHALL update them, keep the old value when value is empty, and return the updated row.
6. WHEN `DELETE /admin/personal-info/:key` is requested from the delete button THEN the button SHALL ask "Delete <label>?" via `hx-confirm`, and on confirm the app SHALL delete the field and return an empty fragment that removes the row.
7. WHEN `GET /admin/personal-info/:key/reveal` is requested THEN the app SHALL return a fragment with the decrypted value and `Cache-Control: no-store`.
8. IF `:key` does not exist THEN update, delete and reveal SHALL answer 404 with an error fragment.
9. WHEN no field exists THEN the list SHALL show the text "No personal info yet".

**Independent Test**: Create `EMAIL` → list shows `••••••`; reveal → shows value with `no-store`; delete → row gone.

---

### P1: Settings Overrides ⭐ MVP

**User Story**: As the Owner, I want to change model IDs and limits in the admin so that they apply without a redeploy.

**Why P1**: Roadmap Phase 2 "done when": changing a model in settings takes effect without redeploy.

**Acceptance Criteria**:

1. WHEN `GET /admin/settings` is requested THEN the app SHALL render one input per key `model.public`, `model.tailor`, `model.recruiter`, each `limits.*` of 01-curriculum-api.md §3, and a `print.pageSize` select (`A4`, `Letter`), showing the override value or, when empty, the config fallback as placeholder.
2. WHEN `POST /admin/settings` is saved THEN the app SHALL call `settingsService.set` per key and re-render with the text "Saved".
3. IF a `limits.*` value is not a positive integer THEN the app SHALL answer 400 naming that key and SHALL save no key from that submission.
4. WHEN `model.public` is changed THEN the next public chat call SHALL use the new model ID.

**Independent Test**: Set `model.public = x/y` → recording mock sees model `x/y` on the next chat; clear → config model again.

---

### P2: Dashboard

**User Story**: As the Owner, I want a landing page with current counts so that I see activity at a glance.

**Why P2**: Useful but nothing depends on it.

**Acceptance Criteria**:

1. WHEN `GET /admin` is requested THEN the app SHALL render the number of active, non-expired Recruiter Chats, the number of Tailored Resumes, and the sum of `public_usage.used` for `current_date`.
2. WHEN all counts are zero THEN the dashboard SHALL show `0` for each, not an empty state.

**Independent Test**: Insert 2 active chats, 1 revoked, 3 resumes, usage 4 today → dashboard shows 2, 3, 4.

---

## Edge Cases

- IF `POST /admin/login` is sent without a password field THEN the app SHALL treat it as a failed attempt.
- IF the profile row does not exist THEN `GET /admin/profile` SHALL render an empty form and `POST` SHALL create row `id = 1`.
- WHEN a Personal Info Field value changes THEN the PII Guard SHALL use the new value on the next save or LLM call.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ADM-01 | P1: Sign in and out (AC 1-3, 5) | Design | Verified |
| ADM-02 | P1: Sign in and out (AC 4, 6 throttle) | Design | Verified |
| ADM-03 | P1: Edit the Profile (AC 1-3, 5) | Design | Verified |
| ADM-04 | P1: Edit the Profile (AC 4 PII Guard on save) | Design | Verified |
| ADM-05 | P1: Manage Personal Info Fields (AC 1-4, 9) | Design | Verified |
| ADM-06 | P1: Manage Personal Info Fields (AC 5-8) | Design | Verified |
| ADM-07 | P1: Settings Overrides | Design | Verified |
| ADM-08 | P2: Dashboard | Design | Verified |

**Coverage:** 8 total, 8 mapped to tasks T1-T7 (see tasks.md)

---

## Sources

- `curriculum-specs/01-curriculum-api.md` §4.1, §5.3
- `curriculum-specs/03-ROADMAP.md` Phase 2
- `.specs/STATE.md` AD-004
- No screen captures: admin look is "simple, clean, readable; pixel font for headings only, no client framework" (§5.3). Criteria give outcomes, not layout.

---

## Success Criteria

- [x] Every Phase 2 "done when" item of the roadmap holds.
