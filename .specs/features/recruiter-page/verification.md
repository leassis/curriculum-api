# Recruiter Page verification

**Verdict**: PASS
**Proofs**: `proofs.md` at a133ca8
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `chat-page.test.tsx` `redirects the recruiter link to the admin chat page and shows nothing` | yes - status, exact Location, empty body |
| C2 | `chat-page.test.tsx` `redirects to the admin login without an admin session and shows nothing of the chat` | yes - page and script, no name or token in body |
| C3 | `chat-page.test.tsx` `serves the page with a form and an external script to an admin session` | yes - CSP, no inline script regex, src asserted |
| C4 | `chat-page.test.tsx` `answers 404 for an unknown token` | yes |
| C5 | `chat-page.test.tsx` `serves the script only to an admin session` | yes |
| C6 | `chat-page.test.tsx` `issues a recruiter session cookie for the chat to an admin session` | yes - Path=/api, HttpOnly, accepted for its chat, 403 for another |
| C7 | `chat-page.test.tsx` `answers 303 and sets no cookie without an admin session` | yes |
| C8 | `chat-page.test.tsx` `answers 410 or 404 and sets no cookie for a revoked, expired or unknown chat` | yes |
| C9 | `chat-page.test.tsx` `counts a question through the page session and lowers the remaining` | yes - 5 to 4 via API |
| C10 | `chat-page.test.tsx` `answers 410 chat_revoked on the next question after a revoke` | yes |
| C11 | `chat-page-script.test.ts` `loads the opening and requests the session` | yes |
| C12 | `chat-page-script.test.ts` `streams the answer into the page and sends the history` | yes |
| C13 | `chat-page-script.test.ts` `shows a specific message for 410, 429 and 502 and keeps the history` | yes for named codes; the "any other error" branch was only reached via the 401 message (closed below) |
| C14 | `chat-page-script.test.ts` `renders model text and names as literal text` | yes |
| C15 | `chat-page-script.test.ts` `requests a new session once after a 401 and retries` | yes for the first 401; "once" was not proven (closed below) |
| C16 | `chat-page-script.test.ts` `uses no html-injecting api` | yes - string scan, plus the literal-text test above |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Edge case "form disabled while streaming" had no test | script locks inputs, no assertion held a stream open | test holds a stream open and asserts send and question disabled | a133ca8 `disables the form while an answer streams` |
| C15 did not prove the retry happens only once | only a 401-then-200 sequence was tested | test with persistent 401 asserts 2 session calls, 2 chat posts, specific message | a133ca8 `does not loop on a second 401 and shows a specific message` |

Security review: no finding. `chatPageRouter` is mounted after `admin.use("*", requireAdmin)`, so page, script and session endpoint are all guarded; `sameOrigin` covers the POST; `curr_admin` Path is unchanged (`/admin`), `curr_session` keeps `/api`; the token is never logged (only `console.error` of domain errors); `recruiterChat.requireActive` and `/api/r/:token/chat` still enforce quota, revoke, expiry, PII; no inline script and no HTML-injecting API. `test/support/config.ts` change (`TEST_DATABASE_URL ?? default`) is sane and test-only.
