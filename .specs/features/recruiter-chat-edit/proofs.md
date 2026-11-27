# recruiter-chat-edit proofs

**HEAD**: 37c782a
**Tree**: clean
**Shell**: /bin/sh
**Result**: 20 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ GET /admin/chats/:id/edit > shows the edit form filled with the chat` | pass |
| C2 | `run unit / ✓ GET /admin/chats/new > shows the empty new chat form` | pass |
| C3 | `run unit / ✓ PUT /admin/chats/:id > saves, refreshes rows and shows the new chat form` | pass |
| C4 | `run int / ✓ recruiter chat repository update > keeps token, used and status` | pass |
| C5 | `run int / ✓ recruiter chat edit > next question uses the saved job description` | pass |
| C6 | `run unit / ✓ recruiter chat update > rejects max questions below used` | pass |
| C7 | `run int / ✓ recruiter chat repository update > refuses a max below the current used` | pass |
| C8 | `run unit / ✓ recruiter chat update > rejects each invalid field with the create message` | pass |
| C9 | `run unit / ✓ recruiter chat update > clears the expiry` | pass |
| C10 | `run unit / ✓ recruiter chat update > edits revoked and expired chats without changing status` | pass |
| C11 | `run unit / ✓ PUT /admin/chats/:id > answers 404 for a deleted chat` | pass |
| C12 | `run unit / ✓ POST /admin/chats/autofill > applies the rule in the edit form` | pass |
| C13 | `run unit / ✓ edit chat form > treats stored values as owner text` | pass |
| C14 | `run unit / ✓ PUT /admin/chats/:id > saves unchanged values` | pass |
| C15 | `run unit / ✓ GET /admin/chats/:id/edit > shows not found for a deleted chat` | pass |
| C16 | `run unit / ✓ recruiter chat update > accepts max equal to used and the next ask hits the limit` | pass |
| C17 | `run unit / ✓ recruiter chat update > saves an expired chat with its own stored expiry` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/services/llm.service.ts:126:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/services/llm.service.ts:55:55)
    at PublicChatService.ask (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/services/public-chat.service.ts:35:26)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/routes/public.ts:69:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35) {
  fieldKey: 'EMAIL',
  code: 'internal_error',
  status: 500
}
```

`Run int` - exit 0

```
stderr | test/integration/routes/recruiter-transcripts.test.ts > recruiter transcripts with database > stores nothing for a refunded question
LlmUnavailableError: The language model is unavailable
    at firstChunk (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/llm/first-chunk.ts:28:57)
    at LlmService.stream (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/services/llm.service.ts:65:20)
    at RecruiterChatService.ask (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/services/recruiter-chat.service.ts:258:26)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/routes/recruiter.ts:81:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a657282373aca9dcd/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35) {
  code: 'llm_unavailable',
  status: 502
}
```
