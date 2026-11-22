# Public Chat Tasks

**Design**: inline (no `design.md`): conforms to foundation design and AD-002/AD-003. Decisions below.
**Status**: Approved - aprovado pelo usuário via prompt do orquestrador (2026-11-22)
**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests need `docker compose up -d` and `TEST_DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/curriculum_test`.

## Design decisions (inline)

- `PublicUsageRepository` exposes `PublicUsageRepo`: `acquire(ipHash, limit) -> { used, day } | null` (one `INSERT ... ON CONFLICT (ip_hash, day) DO UPDATE SET used = used + 1 WHERE used < limit RETURNING used, day`, day = `current_date` of the DB) and `release(ipHash, day)` (`used = greatest(used - 1, 0)` on that exact row).
- `PublicChatService.ask(ipHash, messages) -> { stream, remaining }`: loads the profile first (404 leaves the counter alone), acquires, calls `llm.stream` with `system = publicSystemPrompt`, `body = masterCv` (the LLM service appends it as the CV block; an empty CV becomes a stated-empty notice), releases on `LlmUnavailableError` or `PiiLeakError` and rethrows. The limit and max tokens come from `settings.limit`.
- `publicRouter` (zod parsing in handlers, errors thrown as foundation `DomainError`s): `POST /session`, `GET /profile`, `POST /chat` behind `requireSession("public")`. The route hashes the IP (`unknown` when absent) with `config.ipHashSalt`; the stream is encoded with `TextEncoderStream`. `GET /profile` reads `services.profile` and `services.personalInfo` (the container's `PublicChatService` constructor stays as foundation wrote it).

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| `src/repositories/public-usage.repository.ts` | integration | `test/integration/repositories/*.test.ts` | `pnpm test:int` |
| `src/services/public-chat.service.ts` | unit, fake repo and recording model | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| `src/routes/public.ts` | unit via `createTestApp` with fakes; integration with the real DB | `test/unit/routes/*.test.ts`, `test/integration/routes/*.test.ts` | both |

## Gate Check Commands

| Gate Level | Command |
| ---------- | ------- |
| Full | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

## Execution Plan

```
T1 → T2 → T3 → T4 → T5
```

## Task Breakdown

### T1: Usage repository

**What**: `acquire` (atomic upsert with `WHERE used < limit`) and `release` on `PublicUsageRepository`; export `PublicUsageRepo`.
**Where**: `src/repositories/public-usage.repository.ts`
**Depends on**: None
**Reuses**: foundation repositories pattern
**Requirement**: PUB-03, PUB-05, PUB-06

**Done when**:
- [x] Parallel acquires grant exactly the limit; a new day is a fresh quota; release never goes below zero; only the hash is stored
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(public): add atomic usage repository`
**Status**: done

---

### T2: Public chat service

**What**: `ask` with profile load, acquire, `llm.stream`, release on LLM failure.
**Where**: `src/services/public-chat.service.ts`
**Depends on**: T1
**Reuses**: `LlmService`, `SettingsService.limit`
**Requirement**: PUB-03, PUB-04, PUB-05

**Done when**:
- [x] Unit tests with a fake repo and the recording model cover the service checks
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(public): add public chat service`
**Status**: done

---

### T3: Session and profile routes

**What**: `POST /api/public/session` and `GET /api/public/profile`.
**Where**: `src/routes/public.ts`
**Depends on**: T2
**Reuses**: `verifyTurnstile`, `signSession`, `setSessionCookie`, `clientIp`
**Requirement**: PUB-01, PUB-07

**Done when**:
- [x] Unit tests cover session AC 1-4 and the profile AC 1-3
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(public): add session and profile routes`
**Status**: done

---

### T4: Chat route

**What**: `POST /api/public/chat` behind `requireSession("public")`, validation, streaming and headers.
**Where**: `src/routes/public.ts`
**Depends on**: T3
**Reuses**: `PublicChatService`, `requireSession`
**Requirement**: PUB-02, PUB-04

**Done when**:
- [x] Unit tests cover chat route checks and the missing-profile mapping
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(public): add streamed chat route`
**Status**: done

---

### T5: Concurrency and PII proofs

**What**: Integration tests through the app on the real DB, and PII recording-mock suite.
**Where**: `test/integration/routes/public-chat.test.ts`, `test/unit/routes/public-pii.test.ts`
**Depends on**: T4
**Reuses**: `createTestApp`, `createRecordingModel`
**Requirement**: PUB-06, PUB-08

**Done when**:
- [x] 20 parallel requests give exactly 5 accepted; no Personal Info value in any recorded prompt
- [x] Full gate passes

**Tests**: unit, integration
**Gate**: Full
**Commit**: `test(public): prove limit under concurrency and pii safety`
**Status**: done

---

## Checks

**C1** - Turnstile success answers 204 and sets `curr_session` scope public with the configured TTL (PUB-01 AC 1)
Proof: run unit | ✓ public session > sets a public curr_session cookie when turnstile verifies the token

**C2** - Turnstile rejection answers 403 captcha_failed with no cookie (PUB-01 AC 2)
Proof: run unit | ✓ public session > answers 403 captcha_failed and sets no cookie when turnstile rejects

**C3** - A body without a `turnstileToken` string answers 400 validation_error (PUB-01 AC 3)
Proof: run unit | ✓ public session > answers 400 validation_error without a turnstileToken string

**C4** - Turnstile receives the client ip as `remoteip` (PUB-01 AC 4)
Proof: run unit | ✓ public session > sends the client ip as remoteip to turnstile

**C5** - No session answers 401 and the counter stays untouched (PUB-02 AC 1)
Proof: run unit | ✓ public chat route > answers 401 without a session and leaves the counter untouched

**C6** - A recruiter-scope session answers 401 on chat (edge)
Proof: run unit | ✓ public chat route > answers 401 for a recruiter session

**C7** - Invalid bodies answer 400 validation_error and leave the counter untouched (PUB-02 AC 2)
Proof: run unit | ✓ public chat route > answers 400 validation_error for invalid bodies and leaves the counter untouched

**C8** - A non-JSON body answers 400 validation_error (edge)
Proof: run unit | ✓ public chat route > answers 400 validation_error for a body that is not json

**C9** - The valid request streams text/plain with X-Remaining and no-store (PUB-04 AC 6)
Proof: run unit | ✓ public chat route > streams the answer with X-Remaining and no-store

**C10** - 429 limit_reached after the limit, with no LLM call (PUB-03 AC 4)
Proof: run unit | ✓ public chat service > refuses with limit_reached and does not call the llm once the limit is used

**C11** - The LLM gets area public, the prompt, the CV, the messages and the max output tokens (PUB-04 AC 5)
Proof: run unit | ✓ public chat service > calls the llm with area public, the system prompt, the cv, the messages and max output tokens

**C12** - An empty Master CV tells the model the CV is empty (assumption)
Proof: run unit | ✓ public chat service > tells the model the cv is empty

**C13** - LlmUnavailableError releases the use and answers 502 llm_unavailable (PUB-05 AC 7)
Proof: run unit | ✓ public chat service > releases the use when the llm is unavailable

**C14** - PiiLeakError releases the use and answers 500 internal_error (PUB-05 AC 8)
Proof: run unit | ✓ public chat service > releases the use when the pii guard blocks the call

**C15** - A Settings Override of the limit applies to the next request (PUB-03 AC 9)
Proof: run unit | ✓ public chat service > applies a settings override of the limit to the next request

**C16** - Lowering the limit below today's used answers 429 (edge)
Proof: run unit | ✓ public chat service > refuses when the limit is lowered below today's use

**C17** - A missing profile answers not_found and does not touch the counter (assumption)
Proof: run unit | ✓ public chat service > answers not_found without touching the counter when the profile is missing

**C18** - The HTTP mapping of a missing profile is 404 not_found on chat and profile (assumption)
Proof: run unit | ✓ public chat route > answers 404 not_found when the profile is not seeded

**C19** - The usage row stores the hashed IP, never the raw one (PUB-03 AC 10)
Proof: run unit | ✓ public chat service > stores the ip hash and never the raw ip

**C20** - The `public_usage` table has only the hash, day and used columns (PUB-03 AC 10)
Proof: run int | ✓ public usage repository > stores the ip hash only

**C21** - 20 parallel acquires with limit 5 grant exactly 5 and used is 5 (PUB-06 AC 1)
Proof: run int | ✓ public usage repository > grants exactly the limit under 20 parallel acquires

**C22** - A new day gives the same IP a fresh quota (PUB-06 AC 2)
Proof: run int | ✓ public usage repository > gives a new day a fresh quota

**C23** - Release gives one use back and never goes below zero (PUB-05)
Proof: run int | ✓ public usage repository > releases one use and never goes below zero

**C24** - 20 parallel chat requests with limit 5: 5 answer 200, 15 answer 429, used is 5 (PUB-06 AC 1)
Proof: run int | ✓ public chat with database > answers exactly 5 of 20 parallel requests

**C25** - Profile lists only public contact fields, with no-store (PUB-07)
Proof: run unit | ✓ public profile > lists only public contact fields with no-store

**C26** - No Personal Info value reaches the recorded prompts across the suite (PUB-08 AC 1)
Proof: run unit | ✓ public chat pii > sends no personal info value to the model

**C27** - A Visitor message containing a value is redacted in the prompt (PUB-08 AC 2)
Proof: run unit | ✓ public chat pii > redacts a personal value typed by the visitor

**C28** - The system prompt never contains the full name (PUB-08 AC 3)
Proof: run unit | ✓ public chat pii > keeps the full name out of the system prompt

**C29** - The same PII proof against the real database and app (PUB-08 AC 1)
Proof: run int | ✓ public chat with database > sends no personal info value to the model
