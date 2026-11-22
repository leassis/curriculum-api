# Recruiter Chat Specification

**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"

**Depends on**: `foundation` merged (AD-003). Owns: `src/routes/recruiter.ts`, `src/admin/chats.tsx`, `src/services/recruiter-chat.service.ts`, `src/repositories/recruiter-chat.repository.ts`, `src/middleware/require-active-recruiter-chat.ts`, their tests. `requireSession` comes from `foundation` (FND-14).

## Problem Statement

The Owner wants to give each Recruiter a private link that answers questions with a stronger model, using the Master CV or a Tailored Resume plus a short Job Description. Each link has a question quota and optional expiry, and can be revoked with immediate effect. Recruiter identity and the Owner's personal data must never reach the LLM.

## Goals

- [ ] A link created in admin works end to end, stops at its quota, and a revoke blocks the very next question.
- [ ] A session for chat A never works for chat B.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Creating and editing Tailored Resumes | `tailored-resumes` track; this track only reads `tailored_resumes.content` and lists titles |
| Notifications when a link is used, per-recruiter stats | Roadmap Phase 6 |
| Recruiter chat page (`/r/:token` SPA) | Frontend not created now |
| Reactivating a revoked chat | Not in source; revoke is final, the Owner creates a new link |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Link shown after create | `<request origin>/r/<token>` | Site and API share one origin (00-OVERVIEW §3); no extra config field | n |
| Reset on a revoked chat | Sets `used = 0`, status stays `revoked` | Source: reset only resets `used` | n |
| `jobDescriptionShort` max length | 2000 characters | "short" JD; bounds prompt cost | n |
| `maxQuestions` bounds | Integer 1..100; default `limits.recruiterQuestionsDefault` | Positive, bounded cost | n |
| Session/token mismatch status | 403 `{ "error": "forbidden" }` | Authenticated but not for this chat | n |
| Expired is computed, not stored | `status` stays `active`; expiry checked against `expires_at` in SQL | Single source of truth, no job | n |
| Linked resume with empty content | Falls back to the Master CV | Empty context answers nothing | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Manage recruiter chats in admin ⭐ MVP

**User Story**: As the Owner, I want to create, list, revoke, reset and delete Recruiter Chats so that I control who can ask and how much.

**Why P1**: Links only exist through this.

**Acceptance Criteria**:

1. WHEN `GET /admin/chats` is requested THEN the app SHALL list each chat with recruiter name, company, `used/max`, status (`active`, `revoked` or `expired`), expiry, last used, and buttons Copy link, Revoke, Reset, Delete.
2. WHEN no chat exists THEN the list SHALL show the text "No recruiter chats yet".
3. WHEN `POST /admin/chats` receives a recruiter name, optional company, optional Job Description, `maxQuestions`, optional `expiresAt` and optional Tailored Resume id THEN the app SHALL create the chat with a 24-character base64url token and render the full Recruiter Link with a Copy button.
4. IF recruiter name is empty, Job Description exceeds 2000 characters, `maxQuestions` is outside 1..100, `expiresAt` is in the past, or the Tailored Resume id does not exist THEN the app SHALL answer 400 with a fragment naming the field and SHALL not create the chat.
5. The create form SHALL offer every Tailored Resume by title, plus "Master CV" as the default.
6. WHEN `PATCH /admin/chats/:id/revoke` is requested THEN the app SHALL set status `revoked` and return the updated `<tr>`.
7. WHEN `PATCH /admin/chats/:id/reset` is requested THEN the app SHALL set `used = 0` and return the updated `<tr>`.
8. WHEN `DELETE /admin/chats/:id` is confirmed via `hx-confirm` "Delete chat for <recruiter name>?" THEN the app SHALL delete the chat and return an empty fragment that removes the `<tr>`.
9. IF `:id` does not exist THEN revoke, reset and delete SHALL answer 404 with an error fragment.

**Independent Test**: Create → link shown; revoke → row shows `revoked`; reset → `0/10`; delete → row gone.

---

### P1: Open a recruiter link ⭐ MVP

**User Story**: As a Recruiter, I want my link to greet me and show my remaining questions and the Owner's contact so that I know the chat is mine and how to reach the Owner.

**Why P1**: The page needs this before the first question.

**Acceptance Criteria**:

1. WHEN `GET /api/r/:token` is requested for an active, non-expired chat THEN the app SHALL answer 200 `{ recruiterName, company, remaining, status: "active", contact }` with `contact = personalInfoService.contactFor("recruiter")`.
2. IF the token is unknown THEN the app SHALL answer 404 `{ "error": "not_found" }`.
3. IF the chat is revoked THEN the app SHALL answer 410 `{ "error": "chat_revoked" }`; IF it is expired THEN 410 `{ "error": "chat_expired" }`.
4. The response SHALL not include any Personal Info Field with visibility `print`.
5. Every `/api/r/*` response SHALL carry `Cache-Control: no-store` and `X-Robots-Tag: noindex`.

**Independent Test**: Active → 200 with `contact` listing public + recruiter fields; revoke → 410 `chat_revoked`.

---

### P1: Start a recruiter session ⭐ MVP

**User Story**: As a Recruiter, I want to pass the captcha once for my link so that I can ask my questions.

**Why P1**: The chat refuses requests without this session.

**Acceptance Criteria**:

1. WHEN `POST /api/r/:token/session` receives a Turnstile token that verifies, for an active non-expired chat THEN the app SHALL answer 204 and set `curr_session` with scope `recruiter` and `cid` = the chat id.
2. IF Turnstile rejects the token THEN the app SHALL answer 403 `{ "error": "captcha_failed" }` and set no cookie.
3. IF the chat is unknown, revoked or expired THEN the app SHALL answer 404 / 410 as in "Open a recruiter link" and set no cookie.

**Independent Test**: Mock siteverify true → 204 + cookie with `cid`; revoked chat → 410, no cookie.

---

### P1: Ask within quota, revocation is immediate ⭐ MVP

**User Story**: As the Owner, I want each Recruiter question to be checked and counted in the database so that quota, expiry and revocation apply to the very next question.

**Why P1**: Roadmap Phase 3 "done when".

**Acceptance Criteria**:

1. IF `POST /api/r/:token/chat` has no valid `curr_session` with scope `recruiter` THEN the app SHALL answer 401 `{ "error": "unauthorized" }`.
2. IF the session `cid` differs from the id of the chat behind `:token` THEN the app SHALL answer 403 `{ "error": "forbidden" }` and SHALL not touch any counter.
3. IF the body fails the same validation as the public chat THEN the app SHALL answer 400 `{ "error": "validation_error" }` and SHALL not touch the counter.
4. WHEN a valid request arrives THEN the app SHALL increment `used` with one `UPDATE … WHERE status = 'active' AND used < max_questions AND (expires_at IS NULL OR expires_at > now()) RETURNING` statement.
5. IF that statement returns no row THEN the app SHALL answer 410 `chat_revoked`, 410 `chat_expired` or 429 `limit_reached`, re-reading the chat to choose, and SHALL not call the LLM.
6. WHEN the chat is revoked after a session was issued THEN the next question SHALL answer 410 `{ "error": "chat_revoked" }`.
7. WHEN 20 valid requests for one chat with `maxQuestions = 5` arrive in parallel THEN exactly 5 SHALL answer 200 and `used` SHALL equal 5.
8. WHEN the counter is incremented THEN the app SHALL call `llmService.stream` with area `recruiter`, system prompt = `recruiterSystemPrompt` + (linked Tailored Resume content if non-empty, else Master CV) + `jobDescriptionShort`, and `maxOutputTokens = recruiterMaxOutputTokens`.
9. WHEN the LLM streams THEN the app SHALL answer 200 `text/plain; charset=utf-8` with `X-Remaining: <max - used>` and `Cache-Control: no-store`, and SHALL set `last_used_at`.
10. IF `llmService.stream` throws `LlmUnavailableError` THEN the app SHALL decrement `used` by 1 and answer 502 `{ "error": "llm_unavailable" }`.
11. WHEN the linked Tailored Resume is deleted THEN the chat SHALL keep working with the Master CV as context.

**Independent Test**: Quota 2 → two 200s, third 429; new chat → revoke → next question 410 `chat_revoked`.

---

### P1: No recruiter identity or personal data reaches the model ⭐ MVP

**User Story**: As the Owner, I want proof that recruiter chats send neither my personal data nor the recruiter's name or company to the LLM.

**Why P1**: Mandatory test in 01-curriculum-api.md §9 and rule §4.1.4.

**Acceptance Criteria**:

1. WHEN any recruiter chat test runs THEN the recording mock model SHALL have received no prompt containing a Personal Info Field value, the chat's `recruiterName` or its `company`.
2. WHEN a Recruiter message contains a Personal Info Field value THEN the prompt the mock receives SHALL contain `[redacted]` in its place.

**Independent Test**: Recruiter "Jane Roe" at "Acme" → mock prompts contain neither string.

---

## Edge Cases

- WHEN `expiresAt` passes between session creation and a question THEN that question SHALL answer 410 `chat_expired`.
- WHEN a revoked chat is reset THEN `used` SHALL be 0 and the next question SHALL still answer 410 `chat_revoked`.
- WHEN a chat is deleted THEN its link SHALL answer 404 and an existing session for it SHALL get 404 on the next question.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REC-01 | P1: Manage recruiter chats (AC 1-5 list, create) | Design | Verified |
| REC-02 | P1: Manage recruiter chats (AC 6-9 revoke, reset, delete) | Design | Verified |
| REC-03 | P1: Open a recruiter link | Design | Verified |
| REC-04 | P1: Start a recruiter session | Design | Verified |
| REC-05 | P1: Ask within quota (AC 1-3 auth, scope, validation) | Design | Verified |
| REC-06 | P1: Ask within quota (AC 4-7 atomic counter, revoke) | Design | Verified |
| REC-07 | P1: Ask within quota (AC 8-11 context, stream, failure) | Design | Verified |
| REC-08 | P1: No recruiter identity or personal data reaches the model | Design | Verified |

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️ (tasks not written yet)

---

## Sources

- `curriculum-specs/01-curriculum-api.md` §2.1 (recruiter example), §4, §4.1, §5.2, §5.3 (chats rows), §6, §9
- `curriculum-specs/03-ROADMAP.md` Phase 3, Phase 4 (link to tailored resume)
- No screen captures; admin criteria give outcomes, not layout.

---

## Success Criteria

- [ ] Roadmap Phase 3 "done when" holds via route tests.
