# Recruiter Page Specification

**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"

**Depends on**: `recruiter-chat` and `admin-core` on `main`. Owns: `src/admin/chat-page.tsx`, `src/admin/chat-page-script.ts`, their tests, and the route wiring in `src/app.ts` and `src/admin/index.tsx`.

## Problem Statement

The Owner needs to test each Recruiter Link by talking to the chat. The page is for internal use only and is protected by the admin session. External recruiters do not use it; the Svelte frontend comes later.

## Goals

- [ ] Opening `/r/<token>` as the logged-in Owner lands on a chat page that streams answers, with the quota counted like any recruiter question.
- [ ] Without an admin session nothing of the chat is shown.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Page for external recruiters, Turnstile on this page | Svelte frontend, later |
| Persisting the page history | In memory only |
| Changing the admin cookie `Path` or any bypass of `requireAdmin` | Security decision: the admin cookie keeps `Path=/admin` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where the page lives | `GET /admin/chat/:token`, behind `requireAdmin` | The admin cookie has `Path=/admin`, so only `/admin/*` receives it; widening it would expose the admin session to other paths | y |
| `/r/:token` | Answers 303 to `/admin/chat/:token`; the admin middleware then redirects to login when there is no session | `/r/:token` never sees the admin cookie and so decides nothing; it shows nothing of the chat | y |
| Recruiter session without Turnstile | `POST /admin/chat/:token/session`, admin-only, reuses `signSession` with scope `recruiter` and the chat id; sets `curr_session` with `Path=<basePath>/api` | The admin session replaces the captcha; the cookie is the one the API already accepts, so quota, revocation, expiry, PII redaction and refund stay in `recruiterChat.ask` | y |
| JS delivery | `GET /admin/chat/page.js`, behind `requireAdmin`, same origin, no inline script | CSP `script-src 'self'` | y |
| Unknown token | Page answers 404 error fragment | Admin error handler | y |
| Revoked or expired link | The page loads; its first call (`GET /api/r/:token`) answers 410 and the page shows the message and disables the form | Reflects the API state | y |
| Token in logs | No code logs it; it appears only in URLs, as in any link | The token is a bearer secret | y |

**Open questions:** none.

---

## User Stories

### P1: Reach the page only as admin ⭐ MVP

**User Story**: As the Owner, I want `/r/:token` to open the chat only when I am logged in so that nobody else sees it.

**Why P1**: The page exposes a live chat.

**Acceptance Criteria**:

1. WHEN `GET /r/:token` is requested THEN the app SHALL answer 303 with `Location: <basePath>/admin/chat/:token` and an empty body.
2. WHEN `GET /admin/chat/:token` has no valid admin session THEN the app SHALL answer 303 to `<basePath>/admin/login` and the body SHALL hold nothing of the chat.
3. WHEN `GET /admin/chat/:token` has an admin session and the token exists THEN the app SHALL answer 200 HTML with a question form and a `<script src>` to `<basePath>/admin/chat/page.js` and no inline script.
4. IF the token is unknown THEN the page SHALL answer 404.
5. WHEN `GET /admin/chat/page.js` has no admin session THEN the app SHALL answer 303 to login; with one it SHALL answer 200 `text/javascript`.

**Independent Test**: Request without cookie → 303 login; with admin cookie → 200 HTML.

---

### P1: Recruiter session only with admin ⭐ MVP

**User Story**: As the Owner, I want the page to get a recruiter session from my admin session so that I do not solve a captcha to test my own link.

**Why P1**: The chat API needs a recruiter session.

**Acceptance Criteria**:

1. WHEN `POST /admin/chat/:token/session` has an admin session and an active chat THEN the app SHALL answer 204 and set `curr_session` (scope `recruiter`, `cid` = chat id, `Path=<basePath>/api`) without Turnstile.
2. IF there is no admin session THEN the app SHALL answer 303 to login and set no cookie.
3. IF the chat is revoked or expired THEN the app SHALL answer 410 and set no cookie; IF unknown, 404.
4. WHEN a question is posted to `/api/r/:token/chat` with that cookie THEN the quota SHALL decrement through `recruiterChat.ask` and `GET /api/r/:token` SHALL show the lower `remaining`.
5. WHEN the chat is revoked after the cookie was issued THEN the next question SHALL answer 410 `chat_revoked`.

**Independent Test**: Admin session → cookie → question → remaining drops by one.

---

### P1: Chat in the page ⭐ MVP

**User Story**: As the Owner, I want to type a question and read the streamed answer so that I see what the recruiter would.

**Why P1**: This is the page.

**Acceptance Criteria**:

1. WHEN the page loads THEN the script SHALL call `GET /api/r/:token`, show recruiter name, company and remaining questions, and request the session.
2. WHEN the Owner submits a question THEN the script SHALL post the in-memory history plus the question to `/api/r/:token/chat`, append the streamed text to the answer as it arrives, and update the remaining count from `X-Remaining`.
3. WHEN the API answers 410 `chat_revoked` or `chat_expired`, 429, 502 or any other error THEN the page SHALL show a specific message and keep the history.
4. All model text and names SHALL be written with `textContent`; the script SHALL not use `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`.
5. WHEN the API answers 401 THEN the script SHALL request a new session once and retry.

**Independent Test**: Fake DOM runs the script against a streaming fetch and an `<img onerror>` answer.

---

## Edge Cases

- A model answer containing `<img onerror=...>` appears as literal text.
- While an answer streams, the form is disabled.

## Requirement Traceability

| ID | Story | Status |
| -- | ----- | ------ |
| RPG-01 | Reach the page only as admin | Pending |
| RPG-02 | Recruiter session only with admin | Pending |
| RPG-03 | Chat in the page | Pending |

## Success Criteria

- [ ] The Owner opens `/r/<token>` after login and chats; logged out, nothing leaks.
