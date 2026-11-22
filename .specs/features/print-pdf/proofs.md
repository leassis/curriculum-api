# print-pdf proofs

**HEAD**: 529e29b
**Tree**: clean
**Shell**: /bin/sh
**Result**: 13 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ admin print style > sets Arial 10pt with line height 1.35 in black` | pass |
| C2 | `run unit / ✓ admin print style > centres the name at 22pt and the contact list in grey` | pass |
| C3 | `run unit / ✓ admin print style > styles h2 as uppercase, h3 and the line under it` | pass |
| C4 | `run unit / ✓ admin print style > keeps the page rule for A4 and Letter on both print pages` | pass |
| C5 | `run unit / ✓ admin print style > keeps headings with the content after them` | pass |
| C6 | `run unit / ✓ admin print style > never splits a block and keeps three lines at page edges` | pass |
| C7 | `run unit / ✓ admin print style > asks the browser to print colours exactly` | pass |
| C8 | `run unit / ✓ admin print toolbar > links back to the resume editor and to the profile page` | pass |
| C9 | `run unit / ✓ admin print toolbar > tells the owner to turn off headers and footers` | pass |
| C10 | `run unit / ✓ admin print toolbar > hides the link and the tip in print` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
stderr | test/unit/routes/recruiter.test.ts > recruiter chat > answers 502 llm_unavailable and gives the question back
LlmUnavailableError: The language model is unavailable
    at firstChunk (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/src/llm/first-chunk.ts:28:57)
    at LlmService.stream (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/src/services/llm.service.ts:57:20)
    at RecruiterChatService.ask (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/src/services/recruiter-chat.service.ts:203:26)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/src/routes/recruiter.ts:81:33)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at Object.handler (/Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/src/middleware/require-session.ts:15:5)
    at async dispatch (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/compose.js:35:11)
    at async handler (file:///Users/leassis/workspace/curriculum-api/.claude/worktrees/agent-af9a5e6c002e8d276/node_modules/.pnpm/hono@4.13.19/node_modules/hono/dist/hono-base.js:113:35) {
  code: 'llm_unavailable',
  status: 502
}
```
