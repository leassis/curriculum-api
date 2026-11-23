# resume-create-flow proofs

**HEAD**: 632ae81
**Tree**: clean
**Shell**: /bin/sh
**Result**: 23 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ admin resumes create flow > new resume form has a checked personal header checkbox per field` | pass |
| C2 | `run unit / ✓ resume service create flow > creates then generates with the generate input` | pass |
| C3 | `run unit / ✓ admin resumes create flow > create generates and redirects to the editor` | pass |
| C4 | `run unit / ✓ admin resumes create flow > editor after create holds the generated content` | pass |
| C5 | `run unit / ✓ resume service create flow > stores exactly the checked header keys` | pass |
| C6 | `run unit / ✓ resume service create flow > stores null when every header box is checked` | pass |
| C7 | `run unit / ✓ admin resumes create flow > create form disables the button and shows generating text` | pass |
| C8 | `run unit / ✓ admin resumes create flow > answers 400 and stores nothing for invalid input` | pass |
| C9 | `run unit / ✓ admin resumes create flow > keeps the resume and redirects with error generate when the llm fails` | pass |
| C10 | `run unit / ✓ admin resumes create flow > keeps the resume and redirects with error master-cv when the master c` | pass |
| C11 | `run unit / ✓ admin resumes create flow > editor shows the generation failed text for error generate` | pass |
| C12 | `run unit / ✓ admin resumes create flow > editor shows the master cv text for error master-cv` | pass |
| C13 | `run unit / ✓ admin resumes create flow > editor shows no error text for an unknown error value` | pass |
| C14 | `run unit / ✓ admin resumes create flow > generate works on the editor opened after a failed create` | pass |
| C15 | `run unit / ✓ admin resumes create flow > omits the fieldset and stores null without personal info fields` | pass |
| C16 | `run unit / ✓ resume service create flow > ignores unknown header keys` | pass |
| C17 | `run unit / ✓ resume service create flow > stores an empty list when every header box is unchecked` | pass |
| C18 | `run unit / ✓ resume service create flow > sends no personal info value or full name to the model on create` | pass |
| C19 | `run unit / ✓ admin resumes create flow > stores the checked header keys, null for all, [] for none` | pass |
| C20 | `run int / ✓ resume repository > stores headerFields on insert and reads them back unchanged` | pass |
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
To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:2296) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
```
