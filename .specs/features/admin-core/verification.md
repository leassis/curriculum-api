# Admin Core verification

**Verdict**: PASS
**Proofs**: `proofs.md` at f563b2d
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `admin login > answers 401 Invalid password on a wrong password` | yes |
| C2 | `admin login > renders a password form` | yes |
| C3 | `admin login > sets curr_admin and redirects on the right password` | yes |
| C4 | `admin login > clears the cookie and redirects on logout` | yes |
| C5 | `admin login > treats a missing password field as a failed attempt` | yes |
| C6 | `admin auth service > waits 500 ms before recording a failure` | yes |
| C7 | `admin auth service > refuses the sixth attempt even with the right password` | yes |
| C8 | `admin auth service > starts a new window after 15 minutes` | yes |
| C9 | `admin login > answers 429 when the ip is throttled` | yes |
| C10 | `admin login throttle > refuses the sixth attempt with the right password` | yes |
| C11 | `admin login attempt repository > counts parallel failures atomically` | yes |
| C12 | `admin login attempt repository > isolates ip hashes and windows` | yes |
| C13 | `admin profile > prefills the form` | yes |
| C14 | `admin profile > saves valid fields and shows Saved` | yes |
| C15 | `admin profile > rejects an empty prompt without saving` | yes |
| C16 | `admin profile > rejects a master cv containing a personal info value` | yes |
| C17 | `admin profile with database > keeps the profile unchanged when the pii guard rejects` | yes |
| C18 | `admin profile with database > serves the saved master cv and prompts to the next read` | yes |
| C19 | `admin profile with database > creates profile row 1 on first save` | yes |
| C20 | `admin profile > uses the new personal info value on the next save` | yes |
| C21 | `admin settings > renders every key with override or fallback` | yes |
| C22 | `admin settings > saves each key and shows Saved` | yes |
| C23 | `admin settings > rejects an invalid limit and saves nothing` | yes |
| C24 | `admin settings with database > applies the model override to the next public call` | yes |
| C25 | `admin personal info > lists fields with a masked value` | yes |
| C26 | `admin personal info > never renders a decrypted value in the list` | yes |
| C27 | `admin personal info > creates a field and returns the list` | yes |
| C28 | `admin personal info > rejects invalid input naming the field` | yes |
| C29 | `admin personal info > shows an empty state` | yes |
| C30 | `admin personal info > updates a field and keeps the value when empty` | yes |
| C31 | `admin personal info > deletes a field after confirmation` | yes |
| C32 | `admin personal info > reveals the value with no-store` | yes |
| C33 | `admin personal info > answers 404 for a missing key` | yes |
| C34 | `admin dashboard > shows active chats, resumes and usage today` | yes |
| C35 | `admin dashboard > shows zero for each count when empty` | yes |
| C36 | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | yes |

## Findings

None - read every check's test against its criterion; probed own examples at HEAD (4 failures then the right password logs in; phone typed as `(55) 11-91234.5678` and `5511912345678` is rejected by the profile PII Guard; `11 9123` is accepted; no console output on the probed paths; unauthenticated reveal gets 303); cookies are httpOnly, SameSite=Strict, path-scoped; same-origin check covers POSTs; `ui.js` is same-origin and the admin CSP is `script-src 'self'`.
