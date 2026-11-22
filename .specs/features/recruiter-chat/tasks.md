# Recruiter Chat Tasks

**Design**: inline (no `design.md`): conforms to foundation design and AD-002/AD-003. Decisions below.
**Status**: Approved - aprovado pelo usuário via prompt do orquestrador (2026-11-22)
**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests need `docker compose up -d` and `TEST_DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/curriculum_test`.

## Design decisions (inline)

- `RecruiterChatRepo` interface implemented by `RecruiterChatRepository`; the container constructor of `RecruiterChatService` is unchanged (AD-003). Routes and admin import only services; types are re-exported from service/repository types files already allowed (type-only imports).
- Expiry is never stored: the repository selects `expired` computed from `expires_at <= now()`; status `revoked` wins over `expired`.
- `acquire` is one `UPDATE ... WHERE status='active' AND used < max_questions AND (expires_at IS NULL OR expires_at > now()) RETURNING`; on no row the service re-reads the chat to pick 404, `chat_revoked`, `chat_expired` or `limit_reached`. Any failure after `acquire` releases the question.
- LLM call: `system` = `recruiterSystemPrompt` + the Job Description block, `body` (the `<cv>` block) = linked resume content, else the Master CV. The recruiter name and company are never passed.
- Order on `/chat`: session (401), chat by token (404), `cid` match (403), body validation (400), then the counter.
- The Recruiter Link is `<request origin>/r/<token>` (no `basePath`: the site shares the origin). The create form is an HTMX post whose success fragment carries the link and triggers a refresh of the list rows.
- Reset on a revoked chat leaves it revoked.

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| `src/repositories/recruiter-chat.repository.ts` | integration | `test/integration/repositories/*.test.ts` | `pnpm test:int` |
| `src/services/recruiter-chat.service.ts` | unit, fake repo and recording model | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| `src/routes/recruiter.ts`, `src/middleware/*` | unit via `createTestApp` with fakes | `test/unit/routes/*.test.ts` | `pnpm test:unit` |
| `src/admin/chats.tsx` | unit via `createTestApp` with fakes | `test/unit/admin/*.test.tsx` | `pnpm test:unit` |
| whole flow | integration with the real DB | `test/integration/routes/*.test.ts` | `pnpm test:int` |

## Gate Check Commands

| Gate Level | Command |
| ---------- | ------- |
| Full | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

## Execution Plan

```
T1 → T2 → T3 → T5
T2 → T4 → T5
```

## Task Breakdown

### T1: Recruiter chat repository

**What**: `RecruiterChatRepo` + `RecruiterChatRepository`: list, find, insert, revoke, reset, delete, the atomic `acquire`, `release`, `touch`, resume lookups.
**Where**: `src/repositories/recruiter-chat.repository.ts`
**Depends on**: None
**Reuses**: foundation services, public-chat route patterns and admin shell
**Requirement**: REC-01, REC-06

**Done when**:
- [x] Tests for this layer cover its checks
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(recruiter): add recruiter chat repository`
**Status**: done

---

### T2: Recruiter chat service

**What**: Create with validation, revoke/reset/delete, open, authorize, `ask` with context, quota and refund.
**Where**: `src/services/recruiter-chat.service.ts`
**Depends on**: T1
**Reuses**: foundation services, public-chat route patterns and admin shell
**Requirement**: REC-01..REC-08

**Done when**:
- [x] Tests for this layer cover its checks
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(recruiter): add recruiter chat service`
**Status**: done

---

### T3: Recruiter routes

**What**: `GET /api/r/:token`, `POST .../session`, `POST .../chat`, `requireActiveRecruiterChat`, no-store and noindex.
**Where**: `src/routes/recruiter.ts`, `src/middleware/require-active-recruiter-chat.ts`
**Depends on**: T2
**Reuses**: foundation services, public-chat route patterns and admin shell
**Requirement**: REC-03..REC-08

**Done when**:
- [x] Tests for this layer cover its checks
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(recruiter): add recruiter link, session and chat routes`
**Status**: done

---

### T4: Admin chats

**What**: List, create with link, revoke, reset, delete.
**Where**: `src/admin/chats.tsx`
**Depends on**: T2
**Reuses**: foundation services, public-chat route patterns and admin shell
**Requirement**: REC-01, REC-02

**Done when**:
- [x] Tests for this layer cover its checks
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(recruiter): add admin chat management`
**Status**: done

---

### T5: Database proof

**What**: The flow through the app on the real database.
**Where**: `test/integration/routes/recruiter-chat.test.ts`
**Depends on**: T3, T4
**Reuses**: foundation services, public-chat route patterns and admin shell
**Requirement**: REC-05..REC-08

**Done when**:
- [x] Tests for this layer cover its checks
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `test(recruiter): prove the flow on the real database`
**Status**: done

---

## Checks

**C1** - A created chat has a 24-character base64url token and the default quota (REC-01 AC 3)
Proof: run unit | ✓ recruiter chat service > creates a chat with a 24-character base64url token and the default quota

**C2** - Invalid name, JD, quota, expiry or resume id is refused naming the field (REC-01 AC 4)
Proof: run unit | ✓ recruiter chat service > rejects invalid input naming the field and creates nothing

**C3** - Status is computed as active, revoked or expired (REC-01 AC 1)
Proof: run unit | ✓ recruiter chat service > computes status active, revoked and expired

**C4** - Unknown ids are NotFound on revoke, reset and delete (REC-02 AC 9)
Proof: run unit | ✓ recruiter chat service > answers not found for an unknown or malformed id on revoke, reset and delete

**C5** - Reset sets used 0 and a revoked chat stays revoked (REC-02 AC 7, edge)
Proof: run unit | ✓ recruiter chat service > resets used to zero and keeps a revoked chat revoked

**C6** - Opening returns the recruiter contact and no print field (REC-03 AC 1, 4)
Proof: run unit | ✓ recruiter chat service > opens an active chat with the recruiter contact and no print field

**C7** - Opening answers not found, revoked and expired (REC-03 AC 2, 3)
Proof: run unit | ✓ recruiter chat service > answers not found, chat_revoked and chat_expired when opening

**C8** - A session for another chat is Forbidden (REC-05 AC 2)
Proof: run unit | ✓ recruiter chat service > refuses a session that belongs to another chat

**C9** - The LLM call has area recruiter, prompt, resume, JD and token limit (REC-07 AC 8)
Proof: run unit | ✓ recruiter chat service > calls the llm with area recruiter, the prompt, the resume, the job description and the output limit

**C10** - Empty or missing resume content falls back to the Master CV (REC-07 AC 11)
Proof: run unit | ✓ recruiter chat service > falls back to the master cv when the resume is missing or empty

**C11** - Revoked, expired, over quota and deleted chats never call the LLM (REC-06 AC 5)
Proof: run unit | ✓ recruiter chat service > answers revoked, expired or limit reached without calling the llm

**C12** - LlmUnavailable decrements used (REC-07 AC 10)
Proof: run unit | ✓ recruiter chat service > gives the question back when the llm is unavailable

**C13** - Remaining and last_used_at follow each answer (REC-07 AC 9)
Proof: run unit | ✓ recruiter chat service > sets last used and reports the remaining questions

**C14** - The prompt holds no personal data, recruiter name or company (REC-08 AC 1)
Proof: run unit | ✓ recruiter chat service > never puts personal data, the recruiter name or the company in the prompt

**C15** - The repository round-trips and lists newest first (REC-01 AC 1)
Proof: run int | ✓ recruiter chat repository > inserts, finds by token and by id, and lists newest first

**C16** - Expiry is computed in SQL from expires_at (REC-06 AC 4)
Proof: run int | ✓ recruiter chat repository > flags a chat as expired from its expires_at in SQL

**C17** - The atomic UPDATE counts only active, under-quota, unexpired chats (REC-06 AC 4, 5)
Proof: run int | ✓ recruiter chat repository > acquire counts a question only while active, under quota and unexpired

**C18** - 20 parallel acquires grant exactly the quota (REC-06 AC 7)
Proof: run int | ✓ recruiter chat repository > acquire never exceeds max_questions under 20 parallel calls

**C19** - Release never goes below zero (REC-07 AC 10)
Proof: run int | ✓ recruiter chat repository > release gives one back and never goes below zero

**C20** - Revoke, reset, touch and delete report a missing chat (REC-02 AC 6-9)
Proof: run int | ✓ recruiter chat repository > revokes, resets, touches and deletes, reporting a missing chat

**C21** - Resume content and titles are read; deleting the resume nulls the link (REC-07 AC 11, REC-01 AC 5)
Proof: run int | ✓ recruiter chat repository > reads the linked resume content and lists resume titles

**C22** - GET /api/r/:token answers 200 with the opening (REC-03 AC 1, 4)
Proof: run unit | ✓ recruiter link > answers 200 with name, company, remaining, status and the recruiter contact

**C23** - Unknown token is 404 not_found (REC-03 AC 2)
Proof: run unit | ✓ recruiter link > answers 404 not_found for an unknown token

**C24** - Revoked and expired links are 410 (REC-03 AC 3)
Proof: run unit | ✓ recruiter link > answers 410 chat_revoked and 410 chat_expired

**C25** - Every /api/r/* response is no-store and noindex (REC-03 AC 5)
Proof: run unit | ✓ recruiter link > sends no-store and noindex on every response

**C26** - Session cookie has scope recruiter and cid (REC-04 AC 1)
Proof: run unit | ✓ recruiter session > sets a recruiter curr_session cookie carrying the chat id

**C27** - Captcha rejection is 403 with no cookie (REC-04 AC 2)
Proof: run unit | ✓ recruiter session > answers 403 captcha_failed and sets no cookie when turnstile rejects

**C28** - Unusable chats get 404/410 and no cookie (REC-04 AC 3)
Proof: run unit | ✓ recruiter session > answers 404 or 410 and sets no cookie for an unknown, revoked or expired chat

**C29** - No or wrong-scope session is 401 (REC-05 AC 1)
Proof: run unit | ✓ recruiter chat > answers 401 without a recruiter session

**C30** - Another chat's session is 403 and no counter moves (REC-05 AC 2)
Proof: run unit | ✓ recruiter chat > answers 403 forbidden for another chat's session and touches no counter

**C31** - Invalid body is 400 and no counter moves (REC-05 AC 3)
Proof: run unit | ✓ recruiter chat > answers 400 validation_error for an invalid body and touches no counter

**C32** - Answer is text/plain with X-Remaining and no-store (REC-07 AC 9)
Proof: run unit | ✓ recruiter chat > streams text/plain with X-Remaining and no-store

**C33** - Quota 2 gives 200, 200, 429 (REC-06 AC 5)
Proof: run unit | ✓ recruiter chat > answers 429 limit_reached on the third question with a quota of 2

**C34** - Revoke blocks the next question (REC-06 AC 6)
Proof: run unit | ✓ recruiter chat > answers 410 chat_revoked on the next question after a revoke

**C35** - Expiry after the session is 410 chat_expired (REC-06 AC 5, edge)
Proof: run unit | ✓ recruiter chat > answers 410 chat_expired when the expiry passes after the session

**C36** - LLM failure is 502 and used goes back (REC-07 AC 10)
Proof: run unit | ✓ recruiter chat > answers 502 llm_unavailable and gives the question back

**C37** - Deleted chat is 404 for link and session (edge)
Proof: run unit | ✓ recruiter chat > answers 404 for a deleted chat, link and session alike

**C38** - Chat falls back to the Master CV after the resume is deleted (REC-07 AC 11)
Proof: run unit | ✓ recruiter chat > keeps working with the master cv after the linked resume is deleted

**C39** - The recording model never sees PII, recruiter name or company (REC-08 AC 1)
Proof: run unit | ✓ recruiter pii > sends no personal info, recruiter name or company to the model

**C40** - A typed personal value arrives as [redacted] (REC-08 AC 2)
Proof: run unit | ✓ recruiter pii > redacts a personal info value typed by the recruiter

**C41** - List shows every column and the four buttons (REC-01 AC 1)
Proof: run unit | ✓ admin chats > lists each chat with name, company, used over max, status, expiry, last used and its buttons

**C42** - An expired chat shows expired (REC-01 AC 1)
Proof: run unit | ✓ admin chats > shows expired for a chat past its expiry

**C43** - Empty list says No recruiter chats yet (REC-01 AC 2)
Proof: run unit | ✓ admin chats > shows the empty state

**C44** - Form offers each resume and Master CV by default (REC-01 AC 5)
Proof: run unit | ✓ admin chats > offers every tailored resume by title and Master CV as the default

**C45** - Create shows the full link and a Copy button (REC-01 AC 3)
Proof: run unit | ✓ admin chats > creates a chat and shows the full recruiter link with a copy button

**C46** - Invalid create is 400 naming the field (REC-01 AC 4)
Proof: run unit | ✓ admin chats > answers 400 naming the field and creates nothing

**C47** - Revoke returns the updated row (REC-02 AC 6)
Proof: run unit | ✓ admin chats > revokes a chat and returns the updated row

**C48** - Reset returns the row with 0/max (REC-02 AC 7)
Proof: run unit | ✓ admin chats > resets used to zero and returns the updated row

**C49** - Delete confirms by name and returns an empty fragment (REC-02 AC 8)
Proof: run unit | ✓ admin chats > deletes a chat after confirmation and returns an empty fragment

**C50** - Unknown ids give a 404 error fragment (REC-02 AC 9)
Proof: run unit | ✓ admin chats > answers 404 with an error fragment on revoke, reset and delete for unknown ids

**C51** - 20 parallel questions with quota 5 give exactly 5 answers (REC-06 AC 7)
Proof: run int | ✓ recruiter chat with database > answers exactly 5 of 20 parallel requests

**C52** - Revoke blocks the very next question on Postgres, reset keeps it revoked (REC-06 AC 6, edge)
Proof: run int | ✓ recruiter chat with database > blocks the very next question after a revoke

**C53** - Expiry after the session is 410 on Postgres (REC-06 AC 5, edge)
Proof: run int | ✓ recruiter chat with database > answers 410 chat_expired when the expiry passes after the session

**C54** - Deleting the linked resume keeps the chat working on Postgres (REC-07 AC 11)
Proof: run int | ✓ recruiter chat with database > keeps working with the master cv after the linked resume is deleted

**C55** - Deleted chat is 404 on Postgres (edge)
Proof: run int | ✓ recruiter chat with database > answers 404 for a deleted chat's link and session

**C56** - Cross-chat session is 403 with counters untouched on Postgres (REC-05 AC 2)
Proof: run int | ✓ recruiter chat with database > refuses a session for another chat without touching a counter

**C57** - No PII or recruiter identity reaches the model on Postgres (REC-08 AC 1, 2)
Proof: run int | ✓ recruiter chat with database > sends no personal info, recruiter name or company to the model

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** none - no screen; no captures cited.
