# recruiter-chat proofs

**HEAD**: 8c751be
**Tree**: clean
**Shell**: /bin/sh
**Result**: 60 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ recruiter chat service > creates a chat with a 24-character base64url token and the default quota` | pass |
| C2 | `run unit / ✓ recruiter chat service > rejects invalid input naming the field and creates nothing` | pass |
| C3 | `run unit / ✓ recruiter chat service > computes status active, revoked and expired` | pass |
| C4 | `run unit / ✓ recruiter chat service > answers not found for an unknown or malformed id on revoke, reset and de` | pass |
| C5 | `run unit / ✓ recruiter chat service > resets used to zero and keeps a revoked chat revoked` | pass |
| C6 | `run unit / ✓ recruiter chat service > opens an active chat with the recruiter contact and no print field` | pass |
| C7 | `run unit / ✓ recruiter chat service > answers not found, chat_revoked and chat_expired when opening` | pass |
| C8 | `run unit / ✓ recruiter chat service > refuses a session that belongs to another chat` | pass |
| C9 | `run unit / ✓ recruiter chat service > calls the llm with area recruiter, the prompt, the resume, the job descr` | pass |
| C10 | `run unit / ✓ recruiter chat service > falls back to the master cv when the resume is missing or empty` | pass |
| C11 | `run unit / ✓ recruiter chat service > answers revoked, expired or limit reached without calling the llm` | pass |
| C12 | `run unit / ✓ recruiter chat service > gives the question back when the llm is unavailable` | pass |
| C13 | `run unit / ✓ recruiter chat service > sets last used and reports the remaining questions` | pass |
| C14 | `run unit / ✓ recruiter chat service > never puts personal data, the recruiter name or the company in the promp` | pass |
| C15 | `run int / ✓ recruiter chat repository > inserts, finds by token and by id, and lists newest first` | pass |
| C16 | `run int / ✓ recruiter chat repository > flags a chat as expired from its expires_at in SQL` | pass |
| C17 | `run int / ✓ recruiter chat repository > acquire counts a question only while active, under quota and unexpired` | pass |
| C18 | `run int / ✓ recruiter chat repository > acquire never exceeds max_questions under 20 parallel calls` | pass |
| C19 | `run int / ✓ recruiter chat repository > release gives one back and never goes below zero` | pass |
| C20 | `run int / ✓ recruiter chat repository > revokes, resets, touches and deletes, reporting a missing chat` | pass |
| C21 | `run int / ✓ recruiter chat repository > reads the linked resume content and lists resume titles` | pass |
| C22 | `run unit / ✓ recruiter link > answers 200 with name, company, remaining, status and the recruiter contact` | pass |
| C23 | `run unit / ✓ recruiter link > answers 404 not_found for an unknown token` | pass |
| C24 | `run unit / ✓ recruiter link > answers 410 chat_revoked and 410 chat_expired` | pass |
| C25 | `run unit / ✓ recruiter link > sends no-store and noindex on every response` | pass |
| C26 | `run unit / ✓ recruiter session > sets a recruiter curr_session cookie carrying the chat id` | pass |
| C27 | `run unit / ✓ recruiter session > answers 403 captcha_failed and sets no cookie when turnstile rejects` | pass |
| C28 | `run unit / ✓ recruiter session > answers 404 or 410 and sets no cookie for an unknown, revoked or expired chat` | pass |
| C29 | `run unit / ✓ recruiter chat > answers 401 without a recruiter session` | pass |
| C30 | `run unit / ✓ recruiter chat > answers 403 forbidden for another chat's session and touches no counter` | pass |
| C31 | `run unit / ✓ recruiter chat > answers 400 validation_error for an invalid body and touches no counter` | pass |
| C32 | `run unit / ✓ recruiter chat > streams text/plain with X-Remaining and no-store` | pass |
| C33 | `run unit / ✓ recruiter chat > answers 429 limit_reached on the third question with a quota of 2` | pass |
| C34 | `run unit / ✓ recruiter chat > answers 410 chat_revoked on the next question after a revoke` | pass |
| C35 | `run unit / ✓ recruiter chat > answers 410 chat_expired when the expiry passes after the session` | pass |
| C36 | `run unit / ✓ recruiter chat > answers 502 llm_unavailable and gives the question back` | pass |
| C37 | `run unit / ✓ recruiter chat > answers 404 for a deleted chat, link and session alike` | pass |
| C38 | `run unit / ✓ recruiter chat > keeps working with the master cv after the linked resume is deleted` | pass |
| C39 | `run unit / ✓ recruiter pii > sends no personal info, recruiter name or company to the model` | pass |
| C40 | `run unit / ✓ recruiter pii > redacts a personal info value typed by the recruiter` | pass |
| C41 | `run unit / ✓ admin chats > lists each chat with name, company, used over max, status, expiry, last used and it` | pass |
| C42 | `run unit / ✓ admin chats > shows expired for a chat past its expiry` | pass |
| C43 | `run unit / ✓ admin chats > shows the empty state` | pass |
| C44 | `run unit / ✓ admin chats > offers every tailored resume by title and Master CV as the default` | pass |
| C45 | `run unit / ✓ admin chats > creates a chat and shows the full recruiter link with a copy button` | pass |
| C46 | `run unit / ✓ admin chats > answers 400 naming the field and creates nothing` | pass |
| C47 | `run unit / ✓ admin chats > revokes a chat and returns the updated row` | pass |
| C48 | `run unit / ✓ admin chats > resets used to zero and returns the updated row` | pass |
| C49 | `run unit / ✓ admin chats > deletes a chat after confirmation and returns an empty fragment` | pass |
| C50 | `run unit / ✓ admin chats > answers 404 with an error fragment on revoke, reset and delete for unknown ids` | pass |
| C51 | `run int / ✓ recruiter chat with database > answers exactly 5 of 20 parallel requests` | pass |
| C52 | `run int / ✓ recruiter chat with database > blocks the very next question after a revoke` | pass |
| C53 | `run int / ✓ recruiter chat with database > answers 410 chat_expired when the expiry passes after the session` | pass |
| C54 | `run int / ✓ recruiter chat with database > keeps working with the master cv after the linked resume is deleted` | pass |
| C55 | `run int / ✓ recruiter chat with database > answers 404 for a deleted chat's link and session` | pass |
| C56 | `run int / ✓ recruiter chat with database > refuses a session for another chat without touching a counter` | pass |
| C57 | `run int / ✓ recruiter chat with database > sends no personal info, recruiter name or company to the model` | pass |
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
 ✓ |integration| test/integration/admin/settings.test.ts > admin settings with database > applies the model override to the next public call 1456ms
 ✓ |integration| test/integration/services/settings.service.test.ts > SettingsService > override change applies on next call 1264ms
 ✓ |integration| test/integration/services/personal-info.service.test.ts > PersonalInfoService > stores ciphertext only 1133ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > creates the profile row with default prompts 425ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > leaves an existing profile unchanged 590ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows zero for each count when empty 325ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows active chats, resumes and usage today 615ms
 ✓ |integration| test/integration/db/cleanup.test.ts > cleanup > deletes rows older than 30 days 896ms
 ✓ |integration| test/integration/repositories/profile.repository.test.ts > ProfileRepository > upsert writes row 1 and updated_at 657ms
 ✓ |integration| test/integration/cli.test.ts > cli > migrate runs and requires DATABASE_URL 418ms

 Test Files  21 passed (21)
      Tests  51 passed (51)
   Start at  04:34:41
   Duration  73.78s (tests 92%, import 8%)
```
