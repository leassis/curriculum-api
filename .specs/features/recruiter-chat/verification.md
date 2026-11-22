# Recruiter Chat verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 8c751be
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `recruiter chat service` `creates a chat with a 24-character base64url token and the default quota` | yes |
| C2 | `recruiter chat service` `rejects invalid input naming the field and creates nothing` | yes |
| C3 | `recruiter chat service` `computes status active, revoked and expired` | yes |
| C4 | `recruiter chat service` `answers not found for an unknown or malformed id on revoke, reset and delete` | yes |
| C5 | `recruiter chat service` `resets used to zero and keeps a revoked chat revoked` | yes |
| C6 | `recruiter chat service` `opens an active chat with the recruiter contact and no print field` | yes |
| C7 | `recruiter chat service` `answers not found, chat_revoked and chat_expired when opening` | yes |
| C8 | `recruiter chat service` `refuses a session that belongs to another chat` | yes |
| C9 | `recruiter chat service` `calls the llm with area recruiter, the prompt, the resume, the job description and the output limit` | no - the flattened prompt did not prove the JD sits in the system block; fixed in 8c751be |
| C10 | `recruiter chat service` `falls back to the master cv when the resume is missing or empty` | yes |
| C11 | `recruiter chat service` `answers revoked, expired or limit reached without calling the llm` | yes |
| C12 | `recruiter chat service` `gives the question back when the llm is unavailable` | yes |
| C13 | `recruiter chat service` `sets last used and reports the remaining questions` | yes |
| C14 | `recruiter chat service` `never puts personal data, the recruiter name or the company in the prompt` | yes |
| C15 | `recruiter chat repository` `inserts, finds by token and by id, and lists newest first` | yes |
| C16 | `recruiter chat repository` `flags a chat as expired from its expires_at in SQL` | yes |
| C17 | `recruiter chat repository` `acquire counts a question only while active, under quota and unexpired` | yes |
| C18 | `recruiter chat repository` `acquire never exceeds max_questions under 20 parallel calls` | yes |
| C19 | `recruiter chat repository` `release gives one back and never goes below zero` | yes |
| C20 | `recruiter chat repository` `revokes, resets, touches and deletes, reporting a missing chat` | yes |
| C21 | `recruiter chat repository` `reads the linked resume content and lists resume titles` | yes |
| C22 | `recruiter link` `answers 200 with name, company, remaining, status and the recruiter contact` | yes |
| C23 | `recruiter link` `answers 404 not_found for an unknown token` | yes |
| C24 | `recruiter link` `answers 410 chat_revoked and 410 chat_expired` | yes |
| C25 | `recruiter link` `sends no-store and noindex on every response` | yes |
| C26 | `recruiter session` `sets a recruiter curr_session cookie carrying the chat id` | yes |
| C27 | `recruiter session` `answers 403 captcha_failed and sets no cookie when turnstile rejects` | yes |
| C28 | `recruiter session` `answers 404 or 410 and sets no cookie for an unknown, revoked or expired chat` | yes |
| C29 | `recruiter chat` `answers 401 without a recruiter session` | yes |
| C30 | `recruiter chat` `answers 403 forbidden for another chat's session and touches no counter` | yes |
| C31 | `recruiter chat` `answers 400 validation_error for an invalid body and touches no counter` | yes |
| C32 | `recruiter chat` `streams text/plain with X-Remaining and no-store` | yes |
| C33 | `recruiter chat` `answers 429 limit_reached on the third question with a quota of 2` | yes |
| C34 | `recruiter chat` `answers 410 chat_revoked on the next question after a revoke` | yes |
| C35 | `recruiter chat` `answers 410 chat_expired when the expiry passes after the session` | yes |
| C36 | `recruiter chat` `answers 502 llm_unavailable and gives the question back` | yes |
| C37 | `recruiter chat` `answers 404 for a deleted chat, link and session alike` | yes |
| C38 | `recruiter chat` `keeps working with the master cv after the linked resume is deleted` | yes |
| C39 | `recruiter pii` `sends no personal info, recruiter name or company to the model` | yes |
| C40 | `recruiter pii` `redacts a personal info value typed by the recruiter` | yes |
| C41 | `admin chats` `lists each chat with name, company, used over max, status, expiry, last used and its buttons` | yes |
| C42 | `admin chats` `shows expired for a chat past its expiry` | yes |
| C43 | `admin chats` `shows the empty state` | yes |
| C44 | `admin chats` `offers every tailored resume by title and Master CV as the default` | yes |
| C45 | `admin chats` `creates a chat and shows the full recruiter link with a copy button` | yes |
| C46 | `admin chats` `answers 400 naming the field and creates nothing` | yes |
| C47 | `admin chats` `revokes a chat and returns the updated row` | yes |
| C48 | `admin chats` `resets used to zero and returns the updated row` | yes |
| C49 | `admin chats` `deletes a chat after confirmation and returns an empty fragment` | yes |
| C50 | `admin chats` `answers 404 with an error fragment on revoke, reset and delete for unknown ids` | yes |
| C51 | `recruiter chat with database` `answers exactly 5 of 20 parallel requests` | yes |
| C52 | `recruiter chat with database` `blocks the very next question after a revoke` | yes |
| C53 | `recruiter chat with database` `answers 410 chat_expired when the expiry passes after the session` | yes |
| C54 | `recruiter chat with database` `keeps working with the master cv after the linked resume is deleted` | yes |
| C55 | `recruiter chat with database` `answers 404 for a deleted chat's link and session` | yes |
| C56 | `recruiter chat with database` `refuses a session for another chat without touching a counter` | yes |
| C57 | `recruiter chat with database` `sends no personal info, recruiter name or company to the model` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| C9 did not prove the Job Description sits in the system block | the recording mock flattened system and user text into one string | record system text apart and assert the JD, prompt and resume are in it | 8c751be - C9 |

Probed without findings: token is 18 random bytes (144 bits) base64url; stored in plaintext because the admin list re-copies the link (design, not a defect); no logger touches the token; 20-parallel/quota-5 run 5 times, 14/14 green each time; revoke, expiry, cross-chat 403, reset and deleted-chat cases hold on Postgres; admin pages load `chats.js` by `src`, no inline script; no session or message tables exist, sessions are stateless signed cookies. Residual risk: `ask` refunds the quota on any error, not only `LlmUnavailableError`; a recruiter can force only provider errors that fail before the first chunk, the same exposure the public chat has, and no per-link rate limit exists.
