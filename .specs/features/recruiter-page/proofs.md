# recruiter-page proofs

**HEAD**: a133ca8
**Tree**: clean
**Shell**: /bin/sh
**Result**: 19 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ recruiter page access > redirects the recruiter link to the admin chat page and shows nothing` | pass |
| C2 | `run unit / ✓ recruiter page access > redirects to the admin login without an admin session and shows nothing o` | pass |
| C3 | `run unit / ✓ recruiter page access > serves the page with a form and an external script to an admin session` | pass |
| C4 | `run unit / ✓ recruiter page access > answers 404 for an unknown token` | pass |
| C5 | `run unit / ✓ recruiter page access > serves the script only to an admin session` | pass |
| C6 | `run unit / ✓ recruiter page session > issues a recruiter session cookie for the chat to an admin session` | pass |
| C7 | `run unit / ✓ recruiter page session > answers 303 and sets no cookie without an admin session` | pass |
| C8 | `run unit / ✓ recruiter page session > answers 410 or 404 and sets no cookie for a revoked, expired or unknown ` | pass |
| C9 | `run unit / ✓ recruiter page session > counts a question through the page session and lowers the remaining` | pass |
| C10 | `run unit / ✓ recruiter page session > answers 410 chat_revoked on the next question after a revoke` | pass |
| C11 | `run unit / ✓ recruiter page script > loads the opening and requests the session` | pass |
| C12 | `run unit / ✓ recruiter page script > streams the answer into the page and sends the history` | pass |
| C13 | `run unit / ✓ recruiter page script > shows a specific message for 410, 429 and 502 and keeps the history` | pass |
| C14 | `run unit / ✓ recruiter page script > renders model text and names as literal text` | pass |
| C15 | `run unit / ✓ recruiter page script > requests a new session once after a 401 and retries` | pass |
| C16 | `run unit / ✓ recruiter page script > uses no html-injecting api` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
stderr | test/unit/routes/recruiter.test.ts > recruiter chat > answers 502 llm_unavailable and gives the question back
LlmUnavailableError: The language model is unavailable
    at firstChunk (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/src/llm/first-chunk.ts:28:57)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/src/services/llm.service.ts:57:20)
    at RecruiterChatService.ask (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/src/services/recruiter-chat.service.ts:203:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/src/routes/recruiter.ts:81:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-a78969daa41d9191c/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  code: 'llm_unavailable',
  status: 502
}
```
