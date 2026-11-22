# resume-custom-instructions proofs

**HEAD**: 16210f5
**Tree**: clean
**Shell**: /bin/sh
**Result**: 26 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ resume service custom instructions > stores the trimmed custom instructions on create and empty w` | pass |
| C2 | `run unit / ✓ admin resumes custom instructions > create stores the posted custom instructions` | pass |
| C3 | `run unit / ✓ admin resumes custom instructions > new resume form has an optional custom instructions textarea` | pass |
| C20 | `run unit / ✓ admin resumes custom instructions > editor shows the stored custom instructions` | pass |
| C4 | `run unit / ✓ resume service custom instructions > saves the trimmed custom instructions with content and heade` | pass |
| C16 | `run unit / ✓ admin resumes custom instructions > put saves custom instructions and answers Saved` | pass |
| C5 | `run unit / ✓ resume service custom instructions > stores whitespace-only custom instructions as empty` | pass |
| C22 | `run int / ✓ resume repository > reads custom instructions as empty by default` | pass |
| C23 | `run int / ✓ resume repository > stores and updates custom instructions` | pass |
| C6 | `run unit / ✓ resume service custom instructions > accepts 2000 characters and rejects 2001 on create, save and` | pass |
| C7 | `run unit / ✓ resume service custom instructions > rejects a personal info value on create, save and generate w` | pass |
| C8 | `run unit / ✓ admin resumes custom instructions > answers 400 with the length and personal info messages` | pass |
| C9 | `run unit / ✓ resume service custom instructions > saves the custom instructions before calling the llm` | pass |
| C10 | `run unit / ✓ resume service custom instructions > puts the preamble and instructions between the date and the ` | pass |
| C11 | `run unit / ✓ resume service custom instructions > builds the pre-feature input when there are no instructions` | pass |
| C12 | `run unit / ✓ resume service custom instructions > strips marker runs from the instructions` | pass |
| C13 | `run unit / ✓ resume service custom instructions > keeps the tailor prompt, master cv and token limit` | pass |
| C21 | `run unit / ✓ admin resumes custom instructions > generate button includes the custom instructions textarea` | pass |
| C14 | `run unit / ✓ resume service custom instructions > keeps the instructions saved and the content unchanged when ` | pass |
| C15 | `run unit / ✓ resume service pii > sends no personal info value or full name to the model with custom instructi` | pass |
| C17 | `run unit / ✓ resume service custom instructions > uses the stored instructions when generate receives none` | pass |
| C18 | `run unit / ✓ admin resumes custom instructions > generate saves the posted custom instructions` | pass |
| C19 | `run int / ✓ resumes with database > generates with custom instructions on the real database` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
stderr | test/unit/routes/recruiter.test.ts > recruiter chat > answers 502 llm_unavailable and gives the question back
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
