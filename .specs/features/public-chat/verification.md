# Public Chat verification

**Verdict**: PASS
**Proofs**: `proofs.md` at eeaca49 (code identical at HEAD; later commits are .specs only)
**Verifier**: independent sub-agent (author != verifier) - re-verified from scratch; the implementer's earlier PASS was not trusted

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `public session > sets a public curr_session cookie when turnstile verifies the token` - 204, Max-Age, HttpOnly, SameSite=Strict, signed scope public | yes |
| C2 | `public session > answers 403 captcha_failed and sets no cookie when turnstile rejects` | yes |
| C3 | `public session > answers 400 validation_error without a turnstileToken string` | yes |
| C4 | `public session > sends the client ip as remoteip to turnstile` | yes |
| C5 | `public chat route > answers 401 without a session and leaves the counter untouched` | yes |
| C6 | `public chat route > answers 401 for a recruiter session` | yes |
| C7 | `public chat route > answers 400 validation_error for invalid bodies and leaves the counter untouched` | yes |
| C8 | `public chat route > answers 400 validation_error for a body that is not json` | yes |
| C9 | `public chat route > streams the answer with X-Remaining and no-store` | yes |
| C10 | `public chat service > refuses with limit_reached and does not call the llm once the limit is used` | yes |
| C11 | `public chat service > calls the llm with area public, the system prompt, the cv, the messages and max output tokens` | yes |
| C12 | `public chat service > tells the model the cv is empty` | yes |
| C13 | `public chat route > answers 502 llm_unavailable and releases the use` - exact body `{error}`, counter back to 0 | yes |
| C14 | `public chat route > answers 500 internal_error and releases the use when the pii guard blocks` - exact body, no detail leak, counter 0 | yes |
| C15 | `public chat service > applies a settings override of the limit to the next request` | yes |
| C16 | `public chat service > refuses when the limit is lowered below today's use` | yes |
| C17 | `public chat service > answers not_found without touching the counter when the profile is missing` | yes |
| C18 | `public chat route > answers 404 not_found when the profile is not seeded` | yes |
| C19 | `public chat route > stores only the hashed ip` - asserts key equals sha256-hex hash of forwarded ip, not the raw ip | yes |
| C20 | `public usage repository > stores the ip hash only` | yes |
| C21 | `public usage repository > grants exactly the limit under 20 parallel acquires` | yes |
| C22 | `public usage repository > gives a new day a fresh quota` | yes |
| C23 | `public usage repository > releases one use and never goes below zero` | yes |
| C24 | `public chat with database > answers exactly 5 of 20 parallel requests` | yes |
| C25 | `public profile > lists only public contact fields with no-store` | yes |
| C26 | `public chat pii > sends no personal info value to the model` | yes |
| C27 | `public chat pii > redacts a personal value typed by the visitor` | yes |
| C28 | `public chat pii > keeps the full name out of the system prompt` | yes |
| C29 | `public chat with database > sends no personal info value to the model` | yes |
| C30 | `public chat route > caps the total size of the history` - 9001+1000 is 400 with counter 0; 9000+1000 is 200 | yes |
| C1b | same test, HttpOnly + SameSite=Strict asserted | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Earlier history messages were unbounded: 10 messages of any size reached the paid model on every request (cost/abuse risk with rotating IPs) | `src/routes/public.ts` only bounded the last message | total code points capped at `maxQuestionChars * maxHistoryMessages`; spec PUB-09, C30 | 58c5807 (C30) |
| Cookie HttpOnly/SameSite not asserted | C1 checked only Max-Age | assert HttpOnly and SameSite=Strict | 58c5807 (C1, C1b) |
| 502/500 bodies asserted by `error` field only, so detail leaks would pass | C13/C14 | assert exact body equality | 58c5807 (C13, C14) |

Probed: concurrency test run 5 times (5 passed); gate `pnpm lint && typecheck && test && build` green (150 tests before, 151 after); 5xx handler returns only `{ error }`; Turnstile fails closed and 401 precedes any counter touch.
