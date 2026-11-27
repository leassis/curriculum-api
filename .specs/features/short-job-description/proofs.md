# short-job-description proofs

**HEAD**: 8bbd455
**Tree**: clean
**Shell**: /bin/sh
**Result**: 33 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ tailor output schema > requires and describes job_description_short` | pass |
| C2 | `run unit / ✓ resume generate > appends the short job description rules to the system prompt` | pass |
| C3 | `run unit / ✓ short job description rules > name every kept section` | pass |
| C4 | `run unit / ✓ short job description rules > name every dropped item` | pass |
| C5 | `run unit / ✓ short job description rules > fix format, language and the 2000 cap` | pass |
| C6 | `run unit / ✓ resume generate > stores the short job description and replaces an earlier one` | pass |
| C7 | `run unit / ✓ shortJobDescription > cuts at the last line or sentence end before 2000` | pass |
| C8 | `run unit / ✓ shortJobDescription > hard-cuts at 2000 and keeps exactly 2000 whole` | pass |
| C9 | `run unit / ✓ finish > returns ok with a truncated short job description` | pass |
| C10 | `run unit / ✓ finish > returns ok with null for a blank short job description` | pass |
| C11 | `run unit / ✓ resume generate > keeps the short job description when generation fails` | pass |
| C12 | `run int / ✓ short-jd migration > adds a nullable job_description_short that starts NULL` | pass |
| C13 | `run unit / ✓ resume editor > shows the short job description textarea after the job description` | pass |
| C14 | `run unit / ✓ resume updateOptions > stores the trimmed short job description and null when blank` | pass |
| C15 | `run unit / ✓ PUT /admin/resumes/:id > saves the short job description` | pass |
| C16 | `run unit / ✓ PUT /admin/resumes/:id > rejects a short job description over 2000 characters` | pass |
| C17 | `run unit / ✓ resume print and download > leave out the short job description` | pass |
| C18 | `run unit / ✓ POST /admin/chats/autofill > fills an empty job description` | pass |
| C19 | `run unit / ✓ POST /admin/chats/autofill > replaces the last autofilled job description` | pass |
| C20 | `run unit / ✓ POST /admin/chats/autofill > keeps owner text and shows the not filled notice` | pass |
| C21 | `run unit / ✓ POST /admin/chats/autofill > replace fills the field and clears the notice` | pass |
| C22 | `run unit / ✓ POST /admin/chats/autofill > shows the no short description notice` | pass |
| C23 | `run unit / ✓ POST /admin/chats/autofill > applies the rule to company` | pass |
| C24 | `run unit / ✓ POST /admin/chats/autofill > master cv keeps fields and clears notices` | pass |
| C25 | `run unit / ✓ chat autofill fragment > renders notices in a polite live region` | pass |
| C26 | `run unit / ✓ POST /admin/chats > stores a snapshot of the job description` | pass |
| C27 | `run unit / ✓ decideAutofill > treats a whitespace-only field as empty` | pass |
| C28 | `run unit / ✓ POST /admin/chats/autofill > shows tailored resume not found for an unknown resume` | pass |
| C29 | `run unit / ✓ decideAutofill > covers fill, keep, replace and no source` | pass |
| C30 | `walk - stop the dev server's DB, pick a resume, see the error in the status line with both fields unchanged` | pass (Walked) |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
PiiLeakError: Personal info field "EMAIL" found in an LLM prompt
    at LlmService.prepare (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/services/llm.service.ts:126:13)
    at LlmService.stream (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/services/llm.service.ts:55:55)
    at PublicChatService.ask (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/services/public-chat.service.ts:35:26)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/routes/public.ts:69:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35) {
  fieldKey: 'EMAIL',
  code: 'internal_error',
  status: 500
}
```

`Run int` - exit 0

```
stderr | test/integration/routes/recruiter-transcripts.test.ts > recruiter transcripts with database > stores nothing for a refunded question
LlmUnavailableError: The language model is unavailable
    at firstChunk (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/llm/first-chunk.ts:28:57)
    at LlmService.stream (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/services/llm.service.ts:65:20)
    at RecruiterChatService.ask (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/services/recruiter-chat.service.ts:222:26)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/routes/recruiter.ts:81:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-root/curriculum-api/.claude/worktrees/agent-a7970beae11b28ffa/node_modules/.pnpm/hono@4.13.21/node_modules/hono/dist/hono-base.js:113:35) {
  code: 'llm_unavailable',
  status: 502
}
```
