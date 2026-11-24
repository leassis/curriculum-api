# owner-notes proofs

**HEAD**: 61a87a7
**Tree**: dirty - scripts/seed.sql
**Shell**: /bin/sh
**Result**: 47 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ admin resumes tracking fields > shows job link, recruiter name and notes on the new resume form` | pass |
| C2 | `run unit / ✓ resume service tracking fields > stores trimmed tracking fields on create and empty ones when abs` | pass |
| C3 | `run unit / ✓ admin resumes tracking fields > shows the stored tracking fields in the editor form` | pass |
| C4 | `run unit / ✓ resume service tracking fields > updates tracking fields without touching the document, model or ` | pass |
| C5 | `run unit / ✓ resume service tracking fields > keeps a tracking field that the save omits` | pass |
| C6 | `run unit / ✓ admin resumes tracking fields > links the job link in a new tab with noopener noreferrer` | pass |
| C7 | `run unit / ✓ resumes list > shows a Recruiter column after Company` | pass |
| C8 | `run unit / ✓ resume service tracking fields > rejects a job link that is not http or https and stores nothing` | pass |
| C9 | `run unit / ✓ resume service tracking fields > rejects over-length tracking fields and accepts the exact limits` | pass |
| C10 | `run unit / ✓ resume service tracking fields > never sends tracking fields to the tailor model` | pass |
| C11 | `run unit / ✓ admin resumes tracking fields > creates a resume with the posted tracking fields` | pass |
| C12 | `run unit / ✓ admin resumes tracking fields > saves posted tracking fields and keeps omitted ones` | pass |
| C13 | `run unit / ✓ admin resumes tracking fields > answers 400 for an invalid job link on create and save` | pass |
| C14 | `run unit / ✓ admin profile owner notes > shows additional information on the career tab` | pass |
| C15 | `run unit / ✓ admin profile owner notes > stores trimmed additional information` | pass |
| C16 | `run unit / ✓ admin profile owner notes > keeps both texts when the ai tab is saved` | pass |
| C17 | `run unit / ✓ admin profile owner notes > rejects additional information containing a personal info value` | pass |
| C18 | `run unit / ✓ admin profile owner notes > rejects additional information containing the full name` | pass |
| C19 | `run unit / ✓ admin profile owner notes > limits additional information to 5000 characters` | pass |
| C20 | `run unit / ✓ public chat service owner notes > ends the body with the additional information section` | pass |
| C21 | `run unit / ✓ recruiter chat service owner notes > ends the body with additional information with and without a` | pass |
| C22 | `run unit / ✓ resume service owner notes > ends the tailor body with the additional information section` | pass |
| C23 | `run unit / ✓ resume service owner notes > sends today's tailor body when additional information is empty` | pass |
| C24 | `run unit / ✓ resume service owner notes > refuses to generate when additional information contains the full na` | pass |
| C25 | `run unit / ✓ admin print > keeps profile texts out of print and download` | pass |
| C26 | `run unit / ✓ admin profile owner notes > shows looking forward next on the career tab` | pass |
| C27 | `run unit / ✓ admin profile owner notes > stores trimmed looking forward next` | pass |
| C28 | `run unit / ✓ admin profile owner notes > rejects looking forward next containing personal info or the full nam` | pass |
| C29 | `run unit / ✓ admin profile owner notes > limits looking forward next to 5000 characters` | pass |
| C30 | `run unit / ✓ public chat service owner notes > sends today's body when both texts are empty` | pass |
| C31 | `run int / ✓ owner notes columns > reads tracking fields of an existing resume as empty` | pass |
| C32 | `run int / ✓ owner notes columns > reads both profile texts of an existing profile as empty` | pass |
| C33 | `run int / ✓ ProfileRepository > upsert stores additional information and looking forward next` | pass |
| C34 | `run int / ✓ resume repository > stores and updates the tracking fields` | pass |
| C35 | `run unit / ✓ career body > appends non-empty sections in order` | pass |
| C36 | `run unit / ✓ career body > returns the body unchanged when every section is empty` | pass |
| C37 | `run unit / ✓ public chat service owner notes > puts looking forward next last and leaves both out for an empty` | pass |
| C38 | `run unit / ✓ recruiter chat service owner notes > ends the body with looking forward next and leaves both out ` | pass |
| C39 | `run unit / ✓ recruiter chat service owner notes > never sends a linked resume's tracking fields` | pass |
| C40 | `run unit / ✓ resume service owner notes > never sends looking forward next to the tailor` | pass |
| C41 | `run unit / ✓ admin print > keeps tracking fields out of print and download` | pass |
| C42 | `run unit / ✓ recruiter chat service owner notes > sends today's bodies when both texts are empty` | pass |
| C43 | `run int / ✓ recruiter chat repository > reads only the structured document of a resume with tracking fields` | pass |
| C44 | `run int / ✓ recruiter chat with database > keeps a linked resume's tracking fields out of the model and every ` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
stderr | test/unit/routes/recruiter.test.ts > recruiter chat > answers 502 llm_unavailable and gives the question back
LlmUnavailableError: The language model is unavailable
    at firstChunk (/Users/leassis/workspace/lassis-curriculum/curriculum-api/src/llm/first-chunk.ts:28:57)
    at LlmService.stream (/Users/leassis/workspace/lassis-curriculum/curriculum-api/src/services/llm.service.ts:65:20)
    at RecruiterChatService.ask (/Users/leassis/workspace/lassis-curriculum/curriculum-api/src/services/recruiter-chat.service.ts:213:26)
    at Object.handler (/Users/leassis/workspace/lassis-curriculum/curriculum-api/src/routes/recruiter.ts:81:33)
    at async dispatch (file:///Users/leassis/workspace/lassis-curriculum/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/lassis-curriculum/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/lassis-curriculum/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/lassis-curriculum/curriculum-api/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/lassis-curriculum/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/lassis-curriculum/curriculum-api/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  code: 'llm_unavailable',
  status: 502
}
```

`Run int` - exit 0

```
To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8877) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
```
