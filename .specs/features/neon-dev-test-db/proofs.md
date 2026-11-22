# neon-dev-test-db proofs

**HEAD**: 7d9d3b1
**Tree**: clean
**Shell**: /bin/sh
**Result**: 24 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ cli > migrate > prefers DATABASE_URL_UNPOOLED` | pass |
| C2 | `run unit / ✓ cli > migrate > falls back to DATABASE_URL` | pass |
| C3 | `run unit / ✓ cli > migrate > errors when neither is set` | pass |
| C4 | `run unit / ✓ fetchEndpointFor > routes localhost to Neon Local over http` | pass |
| C5 | `run unit / ✓ fetchEndpointFor > routes any other host to https` | pass |
| C6 | `run unit / ✓ startTestBranch > forks TEST_PARENT_BRANCH_ID, falling back to PARENT_BRANCH_ID` | pass |
| C7 | `run unit / ✓ startTestBranch > sets expires_at one hour ahead` | pass |
| C8 | `run unit / ✓ startTestBranch > migrates the branch after its operations finish` | pass |
| C9 | `run int / ✓ test database isolation > connects to the run's Neon branch, not DATABASE_URL` | pass |
| C10 | `run unit / ✓ global setup > teardown deletes the test branch` | pass |
| C11 | `run unit / ✓ startTestBranch > names each missing variable before calling Neon` | pass |
| C12 | `run unit / ✓ startTestBranch > reports a failed Neon call with method, path, status and message` | pass |
| C13 | `run unit / ✓ startTestBranch > never prints the API key or a connection string` | pass |
| C14 | `env -i PATH="$PATH" HOME="$HOME" pnpm test:unit` | pass |
| C15 | `run unit / ✓ startTestBranch > logs a failed delete with the branch id` | pass |
| C16 | `run unit / ✓ startTestBranch > deletes the branch when migration fails` | pass |
| C17 | `run unit / ✓ repo layout > compose runs Neon Local only` | pass |
| C18 | `docker compose --env-file .env.local up -d --wait && DATABASE_URL=postgres://neon:npg@localhost:5432/neondb DA` | pass |
| C19 | `run unit / ✓ repo layout > has no local Postgres stack` | pass |
| C20 | `run unit / ✓ repo layout > env example documents every variable` | pass |
| C21 | `run unit / ✓ repo layout > docs describe Neon, not the old Postgres stack` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:90:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:48:45)
    at PublicChatService.ask (/Users/leassis/workspace/curriculum-api/src/services/public-chat.service.ts:31:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/routes/public.ts:69:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  fieldKey: 'EMAIL',
  code: 'internal_error',
  status: 500
}
```

`Run int` - exit 0

```
stderr | test/integration/routes/recruiter-transcripts.test.ts > recruiter transcripts with database > stores nothing for a refunded question
LlmUnavailableError: The language model is unavailable
    at firstChunk (/Users/leassis/workspace/curriculum-api/src/llm/first-chunk.ts:28:57)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:57:20)
    at RecruiterChatService.ask (/Users/leassis/workspace/curriculum-api/src/services/recruiter-chat.service.ts:210:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/routes/recruiter.ts:81:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  code: 'llm_unavailable',
  status: 502
}
```

`env -i PATH="$PATH" HOME="$HOME" pnpm test:unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:90:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:48:45)
    at PublicChatService.ask (/Users/leassis/workspace/curriculum-api/src/services/public-chat.service.ts:31:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/routes/public.ts:69:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  fieldKey: 'EMAIL',
  code: 'internal_error',
  status: 500
}
```

`docker compose --env-file .env.local up -d --wait && DATABASE_URL=postgres://neon:npg@localhost:5432/neondb DA` - exit 0

```
migrations applied
time="2026-11-22T20:18:51+01:00" level=warning msg="Found orphan containers (curriculum-api-neon-proxy-1) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up."
 Container curriculum-api-db-1 Running 
 Container curriculum-api-db-1 Waiting 
 Container curriculum-api-db-1 Healthy
```
