# recruiter-transcripts proofs

**HEAD**: a0f6296
**Tree**: clean
**Shell**: /bin/sh
**Result**: 24 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ schema > declares eight tables in curriculum_api` | pass |
| C2 | `run int / ✓ constraints > rejects a message with an unknown role or an unknown chat` | pass |
| C3 | `run int / ✓ recruiter chat repository > stores messages in order and lists them by seq` | pass |
| C4 | `run int / ✓ recruiter chat repository > keeps messages on reset and deletes them with the chat` | pass |
| C5 | `run unit / ✓ recruiter chat service > stores the redacted question and the full answer when the stream complet` | pass |
| C6 | `run unit / ✓ recruiter chat service > never stores a personal info value from the question or the answer` | pass |
| C7 | `run unit / ✓ recruiter chat service > stores nothing when the llm is unavailable or the stream fails or is can` | pass |
| C8 | `run unit / ✓ recruiter chat service > streams the whole answer when storing the transcript fails` | pass |
| C9 | `run unit / ✓ recruiter chat service > returns the transcript of a chat and not found for an unknown or malform` | pass |
| C10 | `run unit / ✓ recruiter routes > answers with the same status, headers and body while recording the transcript` | pass |
| C11 | `run unit / ✓ admin messages > links each chat row to its messages page` | pass |
| C12 | `run unit / ✓ admin messages > shows the recruiter, the count and the messages in chronological order` | pass |
| C13 | `run unit / ✓ admin messages > shows the empty state when the chat has no messages` | pass |
| C14 | `run unit / ✓ admin messages > answers 404 for an unknown or malformed id` | pass |
| C15 | `run unit / ✓ admin messages > escapes markup in messages and renders no inline script` | pass |
| C16 | `run unit / ✓ admin messages > redirects to login without an admin session` | pass |
| C17 | `run int / ✓ recruiter transcripts with database > stores each answered question and answer in order` | pass |
| C18 | `run int / ✓ recruiter transcripts with database > never stores a personal info value` | pass |
| C19 | `run int / ✓ recruiter transcripts with database > stores nothing for a refunded question` | pass |
| C20 | `run int / ✓ recruiter transcripts with database > keeps messages after a quota reset and deletes them with the` | pass |
| C21 | `run int / ✓ recruiter transcripts with database > renders stored markup escaped on the messages page` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/services/llm.service.ts:90:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/services/llm.service.ts:48:45)
    at PublicChatService.ask (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/services/public-chat.service.ts:31:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/routes/public.ts:69:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  fieldKey: 'EMAIL',
  code: 'internal_error',
  status: 500
}
```

`Run int` - exit 0

```
stderr | test/integration/routes/recruiter-transcripts.test.ts > recruiter transcripts with database > stores nothing for a refunded question
LlmUnavailableError: The language model is unavailable
    at firstChunk (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/llm/first-chunk.ts:28:57)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/services/llm.service.ts:57:20)
    at RecruiterChatService.ask (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/services/recruiter-chat.service.ts:210:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/routes/recruiter.ts:81:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af653d69cb9ba0701/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  code: 'llm_unavailable',
  status: 502
}
```
