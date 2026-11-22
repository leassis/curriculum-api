# public-chat proofs

**HEAD**: 91de64a
**Tree**: clean
**Shell**: /bin/sh
**Result**: 32 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ public session > sets a public curr_session cookie when turnstile verifies the token` | pass |
| C2 | `run unit / ✓ public session > answers 403 captcha_failed and sets no cookie when turnstile rejects` | pass |
| C3 | `run unit / ✓ public session > answers 400 validation_error without a turnstileToken string` | pass |
| C4 | `run unit / ✓ public session > sends the client ip as remoteip to turnstile` | pass |
| C5 | `run unit / ✓ public chat route > answers 401 without a session and leaves the counter untouched` | pass |
| C6 | `run unit / ✓ public chat route > answers 401 for a recruiter session` | pass |
| C7 | `run unit / ✓ public chat route > answers 400 validation_error for invalid bodies and leaves the counter untouc` | pass |
| C8 | `run unit / ✓ public chat route > answers 400 validation_error for a body that is not json` | pass |
| C9 | `run unit / ✓ public chat route > streams the answer with X-Remaining and no-store` | pass |
| C10 | `run unit / ✓ public chat service > refuses with limit_reached and does not call the llm once the limit is used` | pass |
| C11 | `run unit / ✓ public chat service > calls the llm with area public, the system prompt, the cv, the messages and` | pass |
| C12 | `run unit / ✓ public chat service > tells the model the cv is empty` | pass |
| C13 | `run unit / ✓ public chat route > answers 502 llm_unavailable and releases the use` | pass |
| C14 | `run unit / ✓ public chat route > answers 500 internal_error and releases the use when the pii guard blocks` | pass |
| C15 | `run unit / ✓ public chat service > applies a settings override of the limit to the next request` | pass |
| C16 | `run unit / ✓ public chat service > refuses when the limit is lowered below today's use` | pass |
| C17 | `run unit / ✓ public chat service > answers not_found without touching the counter when the profile is missing` | pass |
| C18 | `run unit / ✓ public chat route > answers 404 not_found when the profile is not seeded` | pass |
| C19 | `run unit / ✓ public chat route > stores only the hashed ip` | pass |
| C20 | `run int / ✓ public usage repository > stores the ip hash only` | pass |
| C21 | `run int / ✓ public usage repository > grants exactly the limit under 20 parallel acquires` | pass |
| C22 | `run int / ✓ public usage repository > gives a new day a fresh quota` | pass |
| C23 | `run int / ✓ public usage repository > releases one use and never goes below zero` | pass |
| C24 | `run int / ✓ public chat with database > answers exactly 5 of 20 parallel requests` | pass |
| C25 | `run unit / ✓ public profile > lists only public contact fields with no-store` | pass |
| C26 | `run unit / ✓ public chat pii > sends no personal info value to the model` | pass |
| C27 | `run unit / ✓ public chat pii > redacts a personal value typed by the visitor` | pass |
| C28 | `run unit / ✓ public chat pii > keeps the full name out of the system prompt` | pass |
| C29 | `run int / ✓ public chat with database > sends no personal info value to the model` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:90:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:48:45)
    at PublicChatService.ask (/Users/leassis/workspace/curriculum-api/src/services/public-chat.service.ts:30:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/src/routes/public.ts:67:33)
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
 ✓ |integration| test/integration/admin/settings.test.ts > admin settings with database > applies the model override to the next public call 1438ms
 ✓ |integration| test/integration/services/settings.service.test.ts > SettingsService > override change applies on next call 1256ms
 ✓ |integration| test/integration/services/personal-info.service.test.ts > PersonalInfoService > stores ciphertext only 1140ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > creates the profile row with default prompts 425ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > leaves an existing profile unchanged 593ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows zero for each count when empty 320ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows active chats, resumes and usage today 615ms
 ✓ |integration| test/integration/db/cleanup.test.ts > cleanup > deletes rows older than 30 days 894ms
 ✓ |integration| test/integration/repositories/profile.repository.test.ts > ProfileRepository > upsert writes row 1 and updated_at 661ms
 ✓ |integration| test/integration/cli.test.ts > cli > migrate runs and requires DATABASE_URL 414ms

 Test Files  17 passed (17)
      Tests  31 passed (31)
   Start at  03:48:05
   Duration  39.75s (tests 88%, import 12%)
```
