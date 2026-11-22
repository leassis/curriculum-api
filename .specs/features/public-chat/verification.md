# Public Chat verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at f7e6ade
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | public-chat route (test/unit/routes/public.test.ts) `public session > sets a public curr_session cookie when turnstile verifies the token` | yes |
| C2 | `public session > answers 403 captcha_failed and sets no cookie when turnstile rejects` | yes |
| C3 | `public session > answers 400 validation_error without a turnstileToken string` | yes |
| C4 | `public session > sends the client ip as remoteip to turnstile` | yes |
| C5 | `public chat route > answers 401 without a session and leaves the counter untouched` | yes |
| C6 | `public chat route > answers 401 for a recruiter session` | yes |
| C7 | `public chat route > answers 400 validation_error for invalid bodies and leaves the counter untouched` | yes - 11 messages, 1001 chars, 1000 accepted; I also confirmed exactly 10 messages is accepted |
| C8 | `public chat route > answers 400 validation_error for a body that is not json` | yes |
| C9 | `public chat route > streams the answer with X-Remaining and no-store` | yes |
| C10 | `public chat service > refuses with limit_reached and does not call the llm once the limit is used` | yes |
| C11 | `public chat service > calls the llm with area public, the system prompt, the cv, the messages and max output tokens` | yes |
| C12 | `public chat service > tells the model the cv is empty` | yes |
| C13 | `public chat service > releases the use when the llm is unavailable` | no - asserts `code` and the counter at service level, never the 502 status the criterion fixes |
| C14 | `public chat service > releases the use when the pii guard blocks the call` | no - asserts `code` and the counter at service level, never the 500 status the criterion fixes |
| C15 | `public chat service > applies a settings override of the limit to the next request` | yes |
| C16 | `public chat service > refuses when the limit is lowered below today's use` | yes |
| C17 | `public chat service > answers not_found without touching the counter when the profile is missing` | yes |
| C18 | `public chat route > answers 404 not_found when the profile is not seeded` | yes |
| C19 | `public chat service > stores the ip hash and never the raw ip` | no - passes the string `deadbeef` straight to `ask`; the route's `hashIp` call is never exercised, so sending the raw IP would stay green |
| C20 | `public usage repository > stores the ip hash only` | yes (schema columns; stores the value it is given) |
| C21 | `public usage repository > grants exactly the limit under 20 parallel acquires` | yes |
| C22 | `public usage repository > gives a new day a fresh quota` | yes |
| C23 | `public usage repository > releases one use and never goes below zero` | yes |
| C24 | `public chat with database > answers exactly 5 of 20 parallel requests` | yes |
| C25 | `public profile > lists only public contact fields with no-store` | yes |
| C26 | `public chat pii > sends no personal info value to the model` | yes |
| C27 | `public chat pii > redacts a personal value typed by the visitor` | yes |
| C28 | `public chat pii > keeps the full name out of the system prompt` | yes |
| C29 | `public chat with database > sends no personal info value to the model` | yes |
| Build | `pnpm build && pnpm typecheck && pnpm lint` | yes (proofs.md rows pass; 29 checks plus 3 build proofs = 32 rows) |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Raw IP stored instead of its hash would keep every test green (PUB-03 AC 10) | C19 feeds `"deadbeef"` to the service; C20/C24 never check `ip_hash`; `src/routes/public.ts` `hashIp(...)` is untested | in the route test, assert the usage key is not the forwarded IP and equals `hashIp(ip, salt)`; in C24 assert `ip_hash` differs from `203.0.113.7` | |
| 502 and 500 statuses of the failure paths are not asserted (PUB-05 AC 7-8) | C13/C14 assert `code` only; no route-level test of an LLM failure | route test with a failing mock: 502 `llm_unavailable` and 500 `internal_error`, counter back to its prior value | |
| Spec/behaviour gap: `maxQuestionChars` counts UTF-16 units | own example: 1000 x "😀" answers 400, 1000 x "é" answers 200 | count code points (`[...s].length`) or state UTF-16 units in the spec | |
| Rule with no check: only the last message is length-bounded | own example: an assistant message of 5000 chars before the last user message answers 200; whitespace-only last content answers 200 | decide and add a criterion (cap each message or total size) | |

Own examples run at HEAD and deleted: exactly `maxHistoryMessages` (10) messages answers 200 and 11 answers 400; limit 1 gives `X-Remaining: 0`, 429 on the second, and another IP is unaffected.
