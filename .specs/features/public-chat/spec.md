# Public Chat Specification

**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"

**Depends on**: `foundation` merged (AD-003). Owns: `src/routes/public.ts`, `src/services/public-chat.service.ts`, `src/repositories/public-usage.repository.ts`, their tests. `requireSession` comes from `foundation` (FND-14).

## Problem Statement

Any Visitor should be able to ask an AI about the Owner's career without the Owner paying for abuse or leaking personal data. The Public Chat answers from the Master CV with the cheapest model. It is gated by Turnstile and a session cookie, and limited per hashed IP per day by a single atomic statement.

## Goals

- [ ] A Visitor passes the captcha, asks up to the daily limit, and gets streamed answers.
- [ ] Under 20 parallel requests with limit 5, exactly 5 are answered.
- [ ] No Personal Info Field value appears in any prompt the recording mock model receives.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| `requireActiveRecruiterChat` | `recruiter-chat` track (`requireSession` is in `foundation`) |
| Server-stored chat history | Q9: client sends history |
| Vercel Firewall rule, OpenRouter spend limit | Platform configuration, documented in Phase 5 |
| The Svelte chat UI | Frontend not created now |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Day boundary for the per-IP limit | Database `current_date` in UTC | One clock (the DB) for the atomic statement | y (default, orchestrator) |
| Profile not seeded | `GET /api/public/profile` and `POST /api/public/chat` answer 404 `{ "error": "not_found" }` | `profileService.get()` throws `NotFoundError` (foundation) | y (default, orchestrator) |
| Session cookie reuse | A valid `public` session is reused for its whole TTL; the per-IP limit is the quota, not the session | 01-curriculum-api.md §6 | y (default, orchestrator) |
| Message roles accepted | `user` and `assistant` only; any other role → 400 | A client-sent `system` role would be prompt injection | y (default, orchestrator) |
| Empty Master CV | Chat still runs; the prompt tells the model the CV is empty | Owner may test before filling the CV | y (default, orchestrator) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Start a public session ⭐ MVP

**User Story**: As a Visitor, I want to pass the captcha once and get a session so that I can ask questions without solving it per question.

**Why P1**: The chat refuses requests without this session.

**Acceptance Criteria**:

1. WHEN `POST /api/public/session` receives `{ "turnstileToken": "<t>" }` and Turnstile verifies it THEN the app SHALL answer 204 and set `curr_session` with scope `public` and TTL `sessionTtlMinutes`.
2. IF Turnstile rejects the token THEN the app SHALL answer 403 `{ "error": "captcha_failed" }` and SHALL not set a cookie.
3. IF the body has no `turnstileToken` string THEN the app SHALL answer 400 `{ "error": "validation_error" }`.
4. WHEN the app calls Turnstile THEN it SHALL send the client IP from the foundation IP helper as `remoteip`.

**Independent Test**: Mock siteverify `success: true` → 204 + cookie; `success: false` → 403, no `Set-Cookie`.

---

### P1: Ask a question and get a streamed answer ⭐ MVP

**User Story**: As a Visitor, I want to ask about the Owner's career and see the answer stream in so that I get a fast, honest answer grounded in the CV.

**Why P1**: This is the product.

**Acceptance Criteria**:

1. IF `POST /api/public/chat` has no valid `curr_session` with scope `public` THEN the app SHALL answer 401 `{ "error": "unauthorized" }` and SHALL not touch the usage counter.
2. IF the body is not `{ messages: [{ role, content }] }` with 1..`maxHistoryMessages` items, the last item's role is not `user`, any role is outside `user|assistant`, or the last `content` is empty or longer than `maxQuestionChars` characters THEN the app SHALL answer 400 `{ "error": "validation_error" }` and SHALL not touch the usage counter.
3. WHEN a valid request arrives THEN the app SHALL increment `public_usage` for `(ipHash, current_date)` with one `INSERT … ON CONFLICT … WHERE used < limit RETURNING used` statement.
4. IF that statement returns no row THEN the app SHALL answer 429 `{ "error": "limit_reached" }` and SHALL not call the LLM.
5. WHEN the counter is incremented THEN the app SHALL call `llmService.stream` with area `public`, system prompt = `publicSystemPrompt` followed by the Master CV, the request messages, and `maxOutputTokens = publicMaxOutputTokens`.
6. WHEN the LLM starts streaming THEN the app SHALL answer 200 `text/plain; charset=utf-8` streaming the answer, with headers `X-Remaining: <limit - used>` and `Cache-Control: no-store`.
7. IF `llmService.stream` throws `LlmUnavailableError` THEN the app SHALL decrement that `public_usage` row by 1 and answer 502 `{ "error": "llm_unavailable" }`.
8. IF `llmService.stream` throws `PiiLeakError` THEN the app SHALL decrement that `public_usage` row by 1 and answer 500 `{ "error": "internal_error" }`.
9. The daily limit SHALL be `settingsService.limit("publicQuestionsPerIpPerDay")`, so a Settings Override applies to the next request.
10. The `public_usage` row SHALL store the IP hash only; no column, log line or error SHALL contain the raw IP.

**Independent Test**: Seed profile, session cookie, mock model answering "hi" → 200 stream "hi", `X-Remaining: 4`; 5 more → the 6th is 429.

---

### P1: Limit holds under concurrency ⭐ MVP

**User Story**: As the Owner, I want the per-IP limit to hold under parallel requests so that a script cannot exceed it by racing.

**Why P1**: The limit is the cost guard.

**Acceptance Criteria**:

1. WHEN 20 valid requests from one IP arrive in parallel with limit 5 THEN exactly 5 SHALL answer 200 and 15 SHALL answer 429, and `public_usage.used` SHALL equal 5.
2. WHEN the day changes THEN the same IP SHALL get a fresh quota (a new `(ipHash, day)` row).

**Independent Test**: Repository integration test against the Compose DB with `Promise.all` of 20 calls.

---

### P1: Public profile and contact ⭐ MVP

**User Story**: As a Visitor, I want to see the Owner's name, headline and public contact links so that I know whose CV this is and how to reach them.

**Why P1**: The site shows this next to the chat; contact data comes from here and never from the model (§4.1).

**Acceptance Criteria**:

1. WHEN `GET /api/public/profile` is requested THEN the app SHALL answer 200 `{ fullName, headline, contact: [{ key, label, value }] }` where `contact` is `personalInfoService.contactFor("public")`.
2. The response SHALL not include any Personal Info Field with visibility `recruiter` or `print`.
3. The response SHALL carry `Cache-Control: no-store`.

**Independent Test**: Fields `GITHUB` (public), `EMAIL` (recruiter), `ADDRESS` (print) → response lists `GITHUB` only.

---

### P1: No personal data reaches the model ⭐ MVP

**User Story**: As the Owner, I want proof that public chat never sends my personal data to the LLM so that I can trust the deployment.

**Why P1**: Mandatory test in 01-curriculum-api.md §9.

**Acceptance Criteria**:

1. WHEN any public chat test runs with Personal Info Fields defined THEN the recording mock model SHALL have received no prompt containing any of their values.
2. WHEN a Visitor message contains a Personal Info Field value THEN the prompt the mock receives SHALL contain `[redacted]` in its place.
3. The system prompt SHALL not contain `profile.fullName`.

**Independent Test**: Run the public chat suite and assert on the mock's recorded prompts.

---

### P1: History size is bounded (added by Verifier) ⭐ MVP

**Acceptance Criteria**:

1. IF the total code points of all request messages exceed `maxQuestionChars * maxHistoryMessages` THEN the app SHALL answer 400 `{ "error": "validation_error" }` and SHALL not touch the usage counter.

---

## Edge Cases

- `maxQuestionChars` counts Unicode code points of the last message only; earlier history messages are not bounded one by one (an assistant reply may exceed it) but the total is bounded by PUB-09, and the history size is capped by `maxHistoryMessages`.
- IF the request body is not JSON THEN the app SHALL answer 400 `{ "error": "validation_error" }`.
- IF the session cookie is valid but has scope `recruiter` THEN `POST /api/public/chat` SHALL answer 401 `{ "error": "unauthorized" }`.
- WHEN the limit Settings Override is lowered below today's `used` for an IP THEN that IP's next request SHALL answer 429.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PUB-01 | P1: Start a public session | Design | Pending |
| PUB-02 | P1: Ask a question (AC 1-2 auth, validation) | Design | Pending |
| PUB-03 | P1: Ask a question (AC 3-4, 9-10 counter) | Design | Pending |
| PUB-04 | P1: Ask a question (AC 5-6 streaming) | Design | Pending |
| PUB-05 | P1: Ask a question (AC 7-8 decrement on failure) | Design | Pending |
| PUB-06 | P1: Limit holds under concurrency | Design | Pending |
| PUB-07 | P1: Public profile and contact | Design | Pending |
| PUB-08 | P1: No personal data reaches the model | Design | Pending |
| PUB-09 | P1: History size is bounded | Verify | Pending |

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️ (tasks not written yet)

---

## Sources

- `curriculum-specs/01-curriculum-api.md` §4.1, §5.1, §6, §7, §9
- `curriculum-specs/03-ROADMAP.md` Phase 1
- `.specs/features/foundation/spec.md` - services, `llmService`, session and IP helpers this track calls

---

## Success Criteria

- [ ] Concurrency test passes 10 runs in a row.
- [ ] Zero Personal Info Field values in recorded prompts across the suite.

---

## Addendum 2026-11-22: prompt hardening (branch feat/prompt-hardening)

Approved ACs above are unchanged. Visitor messages reach the model inside `<<<VISITOR_MESSAGE_START/END>>>` blocks (runs of 3+ `<`/`>` stripped). The default public prompt treats delimited text as data, never infers from an adjacent skill, gives no score or fit verdict, and refuses a whole-CV, verbatim, system-prompt or other-person request with the fixed text "I can only answer questions about this candidate's CV." Proof: `test/unit/prompt-hardening.test.ts`, `test/unit/llm/default-prompts.test.ts`.
