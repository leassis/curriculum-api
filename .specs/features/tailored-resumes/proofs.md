# tailored-resumes proofs

**HEAD**: a88dd10
**Tree**: clean
**Shell**: /bin/sh
**Result**: 48 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ markdown > turns a script tag into text and keeps the markdown around it` | pass |
| C2 | `run unit / ✓ markdown > leaves no element or attribute outside the allowlist` | pass |
| C3 | `run unit / ✓ markdown > keeps only http, https and mailto links` | pass |
| C4 | `run unit / ✓ markdown > renders headings, lists, emphasis, code and quotes` | pass |
| C5 | `run int / ✓ resume repository > lists newest first` | pass |
| C6 | `run int / ✓ resume repository > inserts, finds, updates and deletes a resume` | pass |
| C7 | `run int / ✓ resume repository > stores null and array header fields` | pass |
| C8 | `run int / ✓ resume repository > deletes a resume linked to a recruiter chat and nulls the link` | pass |
| C9 | `run unit / ✓ resume service > rejects an empty title or job description naming the field and creates nothing` | pass |
| C10 | `run unit / ✓ resume service > answers not found for an unknown or malformed id` | pass |
| C11 | `run unit / ✓ resume service > calls the llm with area tailor, the tailor prompt, the master cv, the job descri` | pass |
| C12 | `run unit / ✓ resume service > saves the generated markdown and the model id` | pass |
| C13 | `run unit / ✓ resume service > keeps the content when the llm is unavailable` | pass |
| C14 | `run unit / ✓ resume service > refuses to generate with an empty master cv and does not call the llm` | pass |
| C15 | `run unit / ✓ resume service pii > sends no personal info value or full name to the model` | pass |
| C16 | `run unit / ✓ resume service > refuses to save content containing a personal info value` | pass |
| C17 | `run unit / ✓ resume service > stores null when every field is selected and drops unknown keys` | pass |
| C18 | `run unit / ✓ resume service > builds the print header from the selected fields in sort order` | pass |
| C19 | `run unit / ✓ resume service > skips a header field that no longer exists` | pass |
| C20 | `run unit / ✓ resume service > builds the download text with name, header lines and content` | pass |
| C21 | `run unit / ✓ resume service > slugs the title for the download filename` | pass |
| C22 | `run unit / ✓ admin resumes > lists resumes newest first with links, company, model and date` | pass |
| C23 | `run unit / ✓ admin resumes > shows the empty state` | pass |
| C24 | `run unit / ✓ admin resumes > creates a resume and redirects with 303` | pass |
| C25 | `run unit / ✓ admin resumes > answers 400 naming the empty field and creates nothing` | pass |
| C26 | `run unit / ✓ admin resumes > deletes a resume and asks for confirmation` | pass |
| C27 | `run unit / ✓ admin resumes > answers 404 on every id route for unknown or malformed ids` | pass |
| C28 | `run unit / ✓ admin resumes > renders the editor with fields, checkboxes and buttons` | pass |
| C29 | `run unit / ✓ admin resumes > generate returns the editor fragment with the new content` | pass |
| C30 | `run unit / ✓ admin resumes > generate button has an indicator, is disabled while running and confirms replacem` | pass |
| C31 | `run unit / ✓ admin resumes > generate answers 502 with the failure text and keeps the content` | pass |
| C32 | `run unit / ✓ admin resumes > generate answers 400 with the master cv text` | pass |
| C33 | `run unit / ✓ admin resumes > preview returns sanitized html` | pass |
| C34 | `run unit / ✓ admin resumes > saves content and header fields and answers Saved` | pass |
| C35 | `run unit / ✓ admin resumes > refuses to save content with a personal info value` | pass |
| C36 | `run unit / ✓ admin print > prints the name, the selected header fields in order and the sanitized body` | pass |
| C37 | `run unit / ✓ admin print > prints the master cv with all personal info fields` | pass |
| C38 | `run unit / ✓ admin print > sends no-store and noindex and never calls the llm` | pass |
| C39 | `run unit / ✓ admin print > sets the page size to A4 and to Letter with the override` | pass |
| C40 | `run unit / ✓ admin print > uses no table, hides the print button in print and loads its script from self` | pass |
| C41 | `run unit / ✓ admin print > warns on screen when the body contains a personal info value` | pass |
| C42 | `run unit / ✓ admin print > shows This resume is empty for an empty content` | pass |
| C43 | `run unit / ✓ admin print > downloads markdown with the attachment filename and header lines` | pass |
| C44 | `run int / ✓ resumes with database > creates, generates, edits, prints, downloads and deletes on the real datab` | pass |
| C45 | `run int / ✓ resumes with database > deletes a resume linked to a recruiter chat` | pass |
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
 ✓ |integration| test/integration/admin/settings.test.ts > admin settings with database > applies the model override to the next public call 1461ms
 ✓ |integration| test/integration/services/settings.service.test.ts > SettingsService > override change applies on next call 1240ms
 ✓ |integration| test/integration/services/personal-info.service.test.ts > PersonalInfoService > stores ciphertext only 1147ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > creates the profile row with default prompts 424ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > leaves an existing profile unchanged 601ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows zero for each count when empty 310ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows active chats, resumes and usage today 627ms
 ✓ |integration| test/integration/db/cleanup.test.ts > cleanup > deletes rows older than 30 days 900ms
 ✓ |integration| test/integration/repositories/profile.repository.test.ts > ProfileRepository > upsert writes row 1 and updated_at 662ms
 ✓ |integration| test/integration/cli.test.ts > cli > migrate runs and requires DATABASE_URL 417ms

 Test Files  19 passed (19)
      Tests  37 passed (37)
   Start at  04:13:14
   Duration  48.89s (tests 89%, import 11%)
```
