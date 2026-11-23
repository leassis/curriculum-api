# structured-resume proofs

**HEAD**: e2c757b
**Tree**: clean
**Shell**: /bin/sh
**Result**: 43 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ resume service structured generate > sends the annotated master cv with ids kinds and headings` | pass |
| C2 | `run unit / ✓ parse master cv > assigns ids in source order and kinds ignoring case and accents` | pass |
| C3 | `run unit / ✓ parse master cv > keeps deeper headings in item text and lead text in sections without items` | pass |
| C4 | `run unit / ✓ llm service generate object > sends the schema with a description on every field` | pass |
| C5 | `run unit / ✓ llm service generate object > tells invalid output apart from an outage` | pass |
| C6 | `run unit / ✓ openrouter factory > adds structured settings only for structured calls` | pass |
| C7 | `run unit / ✓ assemble > copies titles kinds and headings from the source in source order` | pass |
| C8 | `run unit / ✓ assemble > drops items the model left out` | pass |
| C9 | `run unit / ✓ resume service structured generate > retries once on invalid output unknown id or duplicate id` | pass |
| C10 | `run unit / ✓ resume service structured generate > leaves the resume unchanged after two failed attempts` | pass |
| C11 | `run unit / ✓ resume service structured generate > rejects a master cv without sections before calling the llm` | pass |
| C12 | `run unit / ✓ admin resumes structured > create maps an unstructured master cv to the structure error` | pass |
| C13 | `run unit / ✓ assemble > strips heading and bullet prefixes from returned strings` | pass |
| C14 | `run unit / ✓ tailor input > wraps custom instructions in the delimiter and removes inner tags` | pass |
| C15 | `run unit / ✓ tailor input > adds no delimiter when custom instructions are empty` | pass |
| C16 | `run unit / ✓ resume service structured generate > sends no personal info and no full name to the model` | pass |
| C17 | `run int / ✓ tailored resumes structured column > new rows have a null structured document` | pass |
| C18 | `run int / ✓ structured migration > keeps resume rows and links and drops content` | pass |
| C19 | `run unit / ✓ resume service structured generate > keeps structured null until the first successful generation` | pass |
| C20 | `run unit / ✓ resume document schema > enforces every bound version kind and heading` | pass |
| C21 | `run unit / ✓ resume service save > parses the document before writing` | pass |
| C22 | `run unit / ✓ resume service save > rejects an invalid document with the failing path and stores nothing` | pass |
| C23 | `run unit / ✓ assemble > reports a document over the bounds as a schema failure` | pass |
| C24 | `run unit / ✓ resume service get > returns the parsed stored document` | pass |
| C25 | `run unit / ✓ admin resumes structured > shows the invalid data message for a corrupt stored document` | pass |
| C26 | `run unit / ✓ admin resumes structured > editor shows the document as a form` | pass |
| C27 | `run unit / ✓ admin resumes structured > editor shows not generated yet without a document` | pass |
| C28 | `run unit / ✓ admin resumes structured > save stores the form document and answers saved` | pass |
| C29 | `run int / ✓ resumes structured editing > removes an item and saves without it` | pass |
| C30 | `run unit / ✓ form codec > moves items within their section and ignores moves past the edges` | pass |
| C31 | `run unit / ✓ resume service save > rejects personal info in any document string` | pass |
| C32 | `run unit / ✓ admin resumes structured > preview renders the posted form` | pass |
| C33 | `run unit / ✓ admin resumes structured > generate swaps in the form with the new document` | pass |
| C34 | `run unit / ✓ render resume markdown > renders sections items and bullets in stored order` | pass |
| C35 | `run unit / ✓ resume service outputs > print view renders the document` | pass |
| C36 | `run unit / ✓ resume service outputs > markdown download renders the document` | pass |
| C37 | `run unit / ✓ recruiter chat service > sends the linked resume document rendered as markdown` | pass |
| C38 | `run unit / ✓ recruiter chat service > falls back to the master cv when the linked resume has no document` | pass |
| C39 | `run unit / ✓ resume service outputs > print and download show the empty state without a document` | pass |
| C40 | `run unit / ✓ form codec > drops empty sections and stores blank bullets as an empty list` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:121:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/src/services/llm.service.ts:55:45)
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
(node:18106) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
```
