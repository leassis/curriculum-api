# Recruiter transcripts verification

**Verdict**: PASS
**Proofs**: `proofs.md` at a0f6296
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `test/unit/db/schema.test.ts` `declares eight tables in curriculum_api` | yes |
| C2 | `test/integration/db/constraints.test.ts` `rejects a message with an unknown role or an unknown chat` | yes - real CHECK and FK |
| C3 | `recruiter-chat.repository.test.ts` `stores messages in order and lists them by seq` | yes |
| C4 | `recruiter-chat.repository.test.ts` `keeps messages on reset and deletes them with the chat` | yes - real cascade |
| C5 | `recruiter-chat.service.test.ts` `stores the redacted question and the full answer when the stream completes` | yes - asserts last user message only, order, nothing before the stream is read |
| C6 | `recruiter-chat.service.test.ts` `never stores a personal info value from the question or the answer` | yes - values split across chunks, both roles |
| C7 | `recruiter-chat.service.test.ts` `stores nothing when the llm is unavailable or the stream fails or is cancelled` | yes - three paths |
| C8 | `recruiter-chat.service.test.ts` `streams the whole answer when storing the transcript fails` | yes - body and log asserted |
| C9 | `recruiter-chat.service.test.ts` `returns the transcript of a chat and not found for an unknown or malformed id` | yes |
| C10 | `test/unit/routes/recruiter.test.ts` `answers with the same status, headers and body while recording the transcript` | yes |
| C11 | `test/unit/admin/messages.test.tsx` `links each chat row to its messages page` | yes |
| C12 | `messages.test.tsx` `shows the recruiter, the count and the messages in chronological order` | yes |
| C13 | `messages.test.tsx` `shows the empty state when the chat has no messages` | yes |
| C14 | `messages.test.tsx` `answers 404 for an unknown or malformed id` | yes |
| C15 | `messages.test.tsx` `escapes markup in messages and renders no inline script` | yes |
| C16 | `messages.test.tsx` `redirects to login without an admin session` | yes |
| C17 | `test/integration/routes/recruiter-transcripts.test.ts` `stores each answered question and answer in order` | yes |
| C18 | same file `never stores a personal info value` | yes - reads the DB rows |
| C19 | same file `stores nothing for a refunded question` | yes - also quota back to 0 |
| C20 | same file `keeps messages after a quota reset and deletes them with the chat` | yes |
| C21 | same file `renders stored markup escaped on the messages page` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| `test/support/config.ts` differed from main's equivalent change (imported `TEST_DATABASE_URL` from `./db`) and would conflict on merge | `git diff main...HEAD -- test/support/config.ts` | take main's version | a0f6296 |

Probed: migration SQL matches `schema.ts` (identity bigint, CHECK, FK `ON DELETE cascade`, index; only a new table, no data touched); redaction happens before the INSERT and `flush` is skipped on error or cancel; page is behind `requireAdmin` and JSX-escaped; logs carry only the redacted insert error; quota acquire/release untouched; `testTimeout: 30_000` on the integration project is reasonable for DB tests.
