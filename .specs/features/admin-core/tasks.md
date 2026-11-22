# Admin Core Tasks

**Design**: inline (no `design.md`): conforms to foundation design, AD-003 and AD-004. Decisions below.
**Status**: Approved - aprovado pelo usuário via prompt do orquestrador (2026-11-22)
**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests need `docker compose up -d` and `TEST_DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/curriculum_test`.

## Design decisions (inline)

- `AdminLoginAttemptRepository` exposes `AdminLoginAttemptRepo`: `failures(ipHash, windowStart)`, `recordFailure(ipHash, windowStart)` (one `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`), `counts()` (dashboard numbers; admin pages may not import repositories, so the query lives behind `AdminAuthService.dashboardCounts()`).
- `AdminAuthService(attempts, config, opts?: { sleep, now })`: `login(password, ip) -> "ok" | "invalid" | "throttled"`, `dashboardCounts()`. Fixed 15-minute window = floor(now / 900000) * 900000. Unknown IP hashes as `unknown`.
- Pages are Hono JSX routers filling the foundation stubs; the Profile PII Guard check runs in the profile route through `findPii` over `personalInfo.allValues()`.
- HTMX does not swap 4xx by default; `personal-info.tsx` serves `GET /admin/personal-info/ui.js` (same origin, CSP `script-src 'self'`) that enables swapping of error fragments.

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| `src/security/admin-auth.ts` | unit, fake repo | `test/unit/security/*.test.ts` | `pnpm test:unit` |
| `src/repositories/admin-login-attempt.repository.ts` | integration | `test/integration/repositories/*.test.ts` | `pnpm test:int` |
| `src/admin/*.tsx` | unit via `createTestApp` with fakes; integration where the DB matters | `test/unit/admin/*.test.tsx`, `test/integration/admin/*.test.ts` | both |

## Gate Check Commands

| Gate Level | Command |
| ---------- | ------- |
| Full | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

## Execution Plan

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

## Task Breakdown

### T1: Login attempt repository

**What**: `recordFailure` (atomic upsert), `failures`, `counts` on `AdminLoginAttemptRepository`; export `AdminLoginAttemptRepo`.
**Where**: `src/repositories/admin-login-attempt.repository.ts`
**Depends on**: None
**Reuses**: foundation repositories pattern, AD-004
**Requirement**: ADM-02, ADM-08

**Done when**:
- [x] Parallel failures sum exactly; windows and ip hashes are isolated
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(admin): add login attempt repository`
**Status**: done

---

### T2: Admin auth service

**What**: `AdminAuthService.login` (bcrypt compare, throttle, 500 ms delay) and `dashboardCounts`.
**Where**: `src/security/admin-auth.ts`
**Depends on**: T1
**Reuses**: `hashIp`, `bcryptjs`
**Requirement**: ADM-01, ADM-02

**Done when**:
- [x] Unit tests with a fake repo cover ok, invalid, missing password, throttle at 5, window rollover, delay
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(admin): add admin auth service with login throttle`
**Status**: done

---

### T3: Login and logout pages

**What**: `GET/POST /admin/login`, `POST /admin/logout`.
**Where**: `src/admin/login.tsx`
**Depends on**: T2
**Reuses**: `signSession`, `setAdminCookie`, `clearAdminCookie`, `Layout`
**Requirement**: ADM-01, ADM-02

**Done when**:
- [x] Unit tests cover AC 1-5 and the missing-password edge; integration proves the 6th attempt with the right password gets 429
- [x] Full gate passes

**Tests**: unit, integration
**Gate**: Full
**Commit**: `feat(admin): add login and logout pages`
**Status**: done

---

### T4: Profile page

**What**: `GET/POST /admin/profile` with required prompts and PII Guard on `masterCv`.
**Where**: `src/admin/profile.tsx`
**Depends on**: T3
**Reuses**: `ProfileService`, `findPii`, `PersonalInfoService.allValues`
**Requirement**: ADM-03, ADM-04

**Done when**:
- [x] Unit tests cover AC 1-4 and edge cases; integration proves DB unchanged on rejection and new CV read after save
- [x] Full gate passes

**Tests**: unit, integration
**Gate**: Full
**Commit**: `feat(admin): add profile page with pii guard on save`
**Status**: done

---

### T5: Settings page

**What**: `GET/POST /admin/settings`, all-or-nothing validation.
**Where**: `src/admin/settings.tsx`
**Depends on**: T4
**Reuses**: `SettingsService`, `settings-keys`
**Requirement**: ADM-07

**Done when**:
- [x] Unit tests cover AC 1-3; integration proves the next public LLM call uses the new model
- [x] Full gate passes

**Tests**: unit, integration
**Gate**: Full
**Commit**: `feat(admin): add settings page`
**Status**: done

---

### T6: Personal info page

**What**: list, create, update, delete, reveal with HTMX fragments.
**Where**: `src/admin/personal-info.tsx`
**Depends on**: T5
**Reuses**: `PersonalInfoService`
**Requirement**: ADM-05, ADM-06

**Done when**:
- [x] Unit tests cover AC 1-9
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(admin): add personal info page`
**Status**: done

---

### T7: Dashboard page

**What**: `GET /admin` with three counts.
**Where**: `src/admin/dashboard.tsx`
**Depends on**: T6
**Reuses**: `AdminAuthService.dashboardCounts`
**Requirement**: ADM-08

**Done when**:
- [x] Integration test shows 2 / 3 / 4 and zeros
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(admin): add dashboard page`
**Status**: done

---

## Checks

**C1** - A wrong password waits 500 ms, records a failure, answers 401 "Invalid password" (ADM-01 AC 3)
Proof: run unit | ✓ admin login > answers 401 Invalid password on a wrong password

**C2** - `GET /admin/login` renders one password field and a "Sign in" button (ADM-01 AC 1)
Proof: run unit | ✓ admin login > renders a password form

**C3** - The matching password sets `curr_admin` and answers 303 to `<basePath>/admin` (ADM-01 AC 2)
Proof: run unit | ✓ admin login > sets curr_admin and redirects on the right password

**C4** - Logout clears `curr_admin` and answers 303 to login (ADM-01 AC 5)
Proof: run unit | ✓ admin login > clears the cookie and redirects on logout

**C5** - A missing password field counts as a failed attempt (edge)
Proof: run unit | ✓ admin login > treats a missing password field as a failed attempt

**C6** - Every failed attempt waits 500 ms before answering (ADM-01 AC 3)
Proof: run unit | ✓ admin auth service > waits 500 ms before recording a failure

**C7** - 5 failures in the window throttle the IP hash without checking the password (ADM-02 AC 4)
Proof: run unit | ✓ admin auth service > refuses the sixth attempt even with the right password

**C8** - A new 15-minute window resets the throttle (ADM-02 AC 4)
Proof: run unit | ✓ admin auth service > starts a new window after 15 minutes

**C9** - `POST /admin/login` answers 429 "Too many attempts. Try again later." when throttled (ADM-02 AC 4)
Proof: run unit | ✓ admin login > answers 429 when the ip is throttled

**C10** - Against the real database the 6th attempt with the right password gets 429 (ADM-02 AC 4)
Proof: run int | ✓ admin login throttle > refuses the sixth attempt with the right password

**C11** - 10 parallel failed logins leave `count` = 10 (ADM-02 AC 6)
Proof: run int | ✓ admin login attempt repository > counts parallel failures atomically

**C12** - Windows and IP hashes are counted separately (ADM-02 AC 4)
Proof: run int | ✓ admin login attempt repository > isolates ip hashes and windows

**C13** - `GET /admin/profile` renders the form prefilled with all six fields (ADM-03 AC 1)
Proof: run unit | ✓ admin profile > prefills the form

**C14** - A valid POST saves through `profileService.update` and shows "Saved" (ADM-03 AC 2)
Proof: run unit | ✓ admin profile > saves valid fields and shows Saved

**C15** - An empty prompt answers 400 "<Field label> is required" and saves nothing (ADM-03 AC 3)
Proof: run unit | ✓ admin profile > rejects an empty prompt without saving

**C16** - A Master CV containing a Personal Info value answers 400 with the label message and saves nothing (ADM-04 AC 4)
Proof: run unit | ✓ admin profile > rejects a master cv containing a personal info value

**C17** - In the database the rejected save leaves the profile unchanged (ADM-04 AC 4)
Proof: run int | ✓ admin profile with database > keeps the profile unchanged when the pii guard rejects

**C18** - After a save the next read of the profile returns the new CV and prompts (ADM-03 AC 5)
Proof: run int | ✓ admin profile with database > serves the saved master cv and prompts to the next read

**C19** - Without a profile row the GET renders an empty form and the POST creates row 1 (edge)
Proof: run int | ✓ admin profile with database > creates profile row 1 on first save

**C20** - A changed Personal Info value is used by the guard on the next save (edge)
Proof: run unit | ✓ admin profile > uses the new personal info value on the next save

**C21** - Settings renders one input per key with the override or the config fallback as placeholder (ADM-07 AC 1)
Proof: run unit | ✓ admin settings > renders every key with override or fallback

**C22** - Saving calls `settingsService.set` per key and shows "Saved"; an empty input removes the override (ADM-07 AC 2)
Proof: run unit | ✓ admin settings > saves each key and shows Saved

**C23** - A non-positive-integer limit answers 400 naming the key and saves no key (ADM-07 AC 3)
Proof: run unit | ✓ admin settings > rejects an invalid limit and saves nothing

**C24** - Changing `model.public` makes the next public LLM call use it; clearing returns to config (ADM-07 AC 4)
Proof: run int | ✓ admin settings with database > applies the model override to the next public call

**C25** - The personal info list shows key, label, visibility, sort order and `••••••` (ADM-05 AC 1)
Proof: run unit | ✓ admin personal info > lists fields with a masked value

**C26** - The list HTML never contains a decrypted value (ADM-05 AC 2)
Proof: run unit | ✓ admin personal info > never renders a decrypted value in the list

**C27** - POST creates a field and returns the updated list fragment (ADM-05 AC 3)
Proof: run unit | ✓ admin personal info > creates a field and returns the list

**C28** - Invalid creation answers 400 with a fragment naming the field (ADM-05 AC 4)
Proof: run unit | ✓ admin personal info > rejects invalid input naming the field

**C29** - An empty list shows "No personal info yet" (ADM-05 AC 9)
Proof: run unit | ✓ admin personal info > shows an empty state

**C30** - PUT updates metadata, keeps the old value when value is empty, returns the row (ADM-06 AC 5)
Proof: run unit | ✓ admin personal info > updates a field and keeps the value when empty

**C31** - The delete button asks "Delete <label>?" and DELETE returns an empty fragment (ADM-06 AC 6)
Proof: run unit | ✓ admin personal info > deletes a field after confirmation

**C32** - Reveal returns the decrypted value with `Cache-Control: no-store` (ADM-06 AC 7)
Proof: run unit | ✓ admin personal info > reveals the value with no-store

**C33** - Update, delete and reveal of a missing key answer 404 with an error fragment (ADM-06 AC 8)
Proof: run unit | ✓ admin personal info > answers 404 for a missing key

**C34** - The dashboard shows 2 active chats, 3 resumes and usage 4 (ADM-08 AC 1)
Proof: run int | ✓ admin dashboard > shows active chats, resumes and usage today

**C35** - All zero counts render `0` (ADM-08 AC 2)
Proof: run int | ✓ admin dashboard > shows zero for each count when empty

**C36** - The whole gate is green
Proof: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** pending
