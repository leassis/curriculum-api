# Recruiter Chat Edit verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 06ef89e
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `test/unit/admin/chats.test.tsx` `GET /admin/chats/:id/edit > shows the edit form filled with the chat` | yes - asserts title, hx-put, all six values, selected resume, Save and Cancel |
| C2 | `test/unit/admin/chats.test.tsx` `GET /admin/chats/new > shows the empty new chat form` | yes - C1 now asserts the Cancel wiring; the empty form and its hx-post are asserted; the Cancel button's `hx-get` is in a view test, and "chat unchanged" holds trivially (GET only) |
| C3 | `test/unit/admin/chats.test.tsx` `PUT /admin/chats/:id > saves, refreshes rows and shows the new chat form` | yes - stored fields, token, `chats-changed`, "Saved" in `#chat-status`, New chat form, rows refetched |
| C4 | `test/integration/repositories/recruiter-chat.repository.test.ts` `keeps token, used and status` | yes - fixed in 37c782a: messages asserted unchanged after the save |
| C5 | `test/integration/routes/recruiter-chat.test.ts` `next question uses the saved job description` | yes - old vs new JD and resume text in the model request, same token and cookie, earlier messages unchanged, used 2 |
| C6 | `test/unit/services/recruiter-chat.service.test.ts` `rejects max questions below used` | yes - exact message with N=3 and chat unchanged |
| C7 | `test/integration/repositories/recruiter-chat.repository.test.ts` `refuses a max below the current used` | yes - real UPDATE with used raised after the patch was built; null and row unchanged |
| C8 | `test/unit/services/recruiter-chat.service.test.ts` `rejects each invalid field with the create message` | yes - six cases (name, JD 2001, max 0 and 101, past expiry, unknown resume); only `toContain` on the message and the chat check covers name/max only |
| C9 | `test/unit/services/recruiter-chat.service.test.ts` `clears the expiry` | yes - from a set expiry to `null` |
| C10 | `test/unit/services/recruiter-chat.service.test.ts` `edits revoked and expired chats without changing status` | yes - C17 now proves the expired chat saved with its stored expiry |
| C11 | `test/unit/admin/chats.test.tsx` `PUT /admin/chats/:id > answers 404 for a deleted chat` | yes - 404 for missing and malformed id with the message; the status-line placement is client code (`swapErrorsInto("chat-status")`) and untested |
| C12 | `test/unit/admin/chats.test.tsx` `POST /admin/chats/autofill > applies the rule in the edit form` | yes - Replace fills the JD and company separately, the other field stays |
| C13 | `test/unit/admin/chats.test.tsx` `edit chat form > treats stored values as owner text` | yes - notice text, stored text kept, two Replace buttons, fed from the real edit form's inputs |
| C14 | `test/unit/admin/chats.test.tsx` `PUT /admin/chats/:id > saves unchanged values` | yes - twice, row deep-equals the original; uses an empty expiry and no resume, so it does not cover a stored expiry |
| C15 | `test/unit/admin/chats.test.tsx` `GET /admin/chats/:id/edit > shows not found for a deleted chat` | yes - fixed in 37c782a: the 404 answer carries no form to swap |
| C16 | `test/unit/services/recruiter-chat.service.test.ts` `accepts max equal to used and the next ask hits the limit` | yes - max 1 with used 1 saved, next ask rejects with `LimitReachedError` |
| C17 | `test/unit/services/recruiter-chat.service.test.ts` `saves an expired chat with its own stored expiry` | yes - own expiry accepted and chat stays expired; a different past expiry still answers 400 |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| An expired chat cannot be saved unchanged: the Edit form pre-fills the past expiry and Save answers 400 "expiresAt: must be in the future" (AC 9 and edge case 1 promise an edit and "Saved") | Own throwaway at HEAD: `update` on a chat with a past `expiresAt`, sending that same expiry, throws `expiresAt: must be in the future`; omitting the expiry saves. C10 only saves the expired chat with a new future expiry | Decide the rule (spec AC 9 vs "when set must be in the future"): either accept an unchanged stored expiry, or say in the spec that the Owner must move or clear it; then add a check for the expired chat saved with its own expiry | 37c782a, proved by C17 |
| C4 does not hold messages unchanged | `recruiter-chat.repository.test.ts` `keeps token, used and status` has no `messages` assertion (only C5's route test checks them, after a save with a new max) | assert the chat's messages are the same after `update` in C4's test | 37c782a, proved by C4 |
| C15 does not assert that the New chat form is kept | `chats.test.tsx` `shows not found for a deleted chat`: `not.toContain("Edit chat")` only; the swap-to-status behaviour lives in `chats/client.ts` with no test | assert the 404 response carries nothing that replaces `#chat-form` (or cover `swapErrorsInto` with the target) | 37c782a, proved by C15 |
| C2 proves only the New chat form's render | The Cancel wiring (`hx-get` to `/admin/chats/new`, target `#chat-form`) is asserted in the view test, which is not C2's proof | name the view test's Cancel assertion in C2, or assert it in C2's test | 37c782a, Cancel wiring asserted in C1's test |

Own examples run at HEAD (throwaway, deleted): `maxQuestions` 100 with a 2000-character JD accepted; 1.5, NaN and -1 rejected with the create message; expired chat with an unchanged expiry rejected (finding 1), with the expiry omitted accepted.
