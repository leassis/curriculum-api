# Recruiter Page Tasks

**Design**: inline (no `design.md`). Decisions below.
**Status**: Approved - aprovado pelo usuário via prompt do orquestrador (2026-11-22)
**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. Integration tests need `TEST_DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/curriculum_test_c`.

## Design decisions (inline)

- The page and its session endpoint live under `/admin/chat/:token` so the existing `curr_admin` cookie (`Path=/admin`) reaches them and `requireAdmin` guards them. The admin cookie Path is not widened and no route bypasses `requireAdmin`.
- `/r/:token` (top level, in `src/app.ts`) only answers 303 to `<basePath>/admin/chat/:token`.
- `POST /admin/chat/:token/session` calls `recruiterChat.requireActive` and sets `curr_session` through `signSession` + `setSessionCookie` (scope `recruiter`, `Path=<basePath>/api`). Only the admin session replaces Turnstile; all other rules stay in `recruiterChat.ask` via `/api/r/:token/chat`.
- The script is a string served at `/admin/chat/page.js` (same pattern as `chats.js`); the token and base path reach it as `data-` attributes of `<main>`.
- When the Svelte frontend takes `/r/:token`, only the redirect in `src/app.ts` is replaced; the internal page stays.

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| `src/admin/chat-page.tsx`, `src/app.ts` | unit via `recruiterApp` with fakes | `test/unit/admin/*.test.tsx` | `pnpm test:unit` |
| `src/admin/chat-page-script.ts` | unit, fake DOM in `node:vm` | `test/unit/admin/*.test.ts` | `pnpm test:unit` |

## Gate Check Commands

| Gate Level | Command |
| ---------- | ------- |
| Full | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

## Execution Plan

```
T1 → T2
```

## Task Breakdown

### T1: Admin-only page, session endpoint and redirect

**What**: `/r/:token` 303, `GET /admin/chat/:token`, `GET /admin/chat/page.js`, `POST /admin/chat/:token/session`.
**Where**: `src/admin/chat-page.tsx`, `src/admin/index.tsx`, `src/app.ts`
**Depends on**: None
**Reuses**: `recruiterChat.requireActive`, `signSession`, `setSessionCookie`, `Layout`, `requireAdmin`
**Requirement**: RPG-01, RPG-02

**Done when**:
- [x] Tests for this layer cover its checks
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(admin): add admin-only recruiter chat page and session`
**Status**: done

---

### T2: Page script

**What**: The external script: opening, session, streaming, history, error messages, 401 retry, `textContent` only.
**Where**: `src/admin/chat-page-script.ts`
**Depends on**: T1
**Reuses**: `/api/r/:token` routes
**Requirement**: RPG-03

**Done when**:
- [x] Tests for this layer cover its checks
- [x] Full gate passes

**Tests**: unit
**Gate**: Full
**Commit**: `feat(admin): add recruiter chat page script`
**Status**: done

---

## Checks

**C1** - `/r/:token` only redirects (RPG-01 AC 1)
Proof: run unit | ✓ recruiter page access > redirects the recruiter link to the admin chat page and shows nothing

**C2** - No admin session goes to login with nothing of the chat (RPG-01 AC 2)
Proof: run unit | ✓ recruiter page access > redirects to the admin login without an admin session and shows nothing of the chat

**C3** - Admin session gets the page with an external script (RPG-01 AC 3)
Proof: run unit | ✓ recruiter page access > serves the page with a form and an external script to an admin session

**C4** - Unknown token is 404 (RPG-01 AC 4)
Proof: run unit | ✓ recruiter page access > answers 404 for an unknown token

**C5** - The script is served only to an admin session (RPG-01 AC 5)
Proof: run unit | ✓ recruiter page access > serves the script only to an admin session

**C6** - The recruiter session is issued only with admin (RPG-02 AC 1)
Proof: run unit | ✓ recruiter page session > issues a recruiter session cookie for the chat to an admin session

**C7** - No admin session means no cookie (RPG-02 AC 2)
Proof: run unit | ✓ recruiter page session > answers 303 and sets no cookie without an admin session

**C8** - Unusable chats get no cookie (RPG-02 AC 3)
Proof: run unit | ✓ recruiter page session > answers 410 or 404 and sets no cookie for a revoked, expired or unknown chat

**C9** - Quota decrements through the page session (RPG-02 AC 4)
Proof: run unit | ✓ recruiter page session > counts a question through the page session and lowers the remaining

**C10** - Revocation reaches the next question (RPG-02 AC 5)
Proof: run unit | ✓ recruiter page session > answers 410 chat_revoked on the next question after a revoke

**C11** - The script loads the opening and starts the session (RPG-03 AC 1)
Proof: run unit | ✓ recruiter page script > loads the opening and requests the session

**C12** - Streamed text is appended and history is sent (RPG-03 AC 2)
Proof: run unit | ✓ recruiter page script > streams the answer into the page and sends the history

**C13** - Errors show a message and keep history (RPG-03 AC 3)
Proof: run unit | ✓ recruiter page script > shows a specific message for 410, 429 and 502 and keeps the history

**C14** - Model text is literal (RPG-03 AC 4, edge)
Proof: run unit | ✓ recruiter page script > renders model text and names as literal text

**C15** - A 401 triggers one new session and a retry (RPG-03 AC 5)
Proof: run unit | ✓ recruiter page script > requests a new session once after a 401 and retries

**C16** - The script has no HTML-injecting API (RPG-03 AC 4)
Proof: run unit | ✓ recruiter page script > uses no html-injecting api

## Handoff

- **Dispatched:** none
