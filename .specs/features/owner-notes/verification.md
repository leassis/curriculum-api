# Owner Notes verification

**Verdict**: PASS (round 2 at 61a87a7; round 1 at c1ef0f6 was FAIL with F1-F5, all now closed)
**Proofs**: `proofs.md` at c1ef0f6
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `resumes.test.tsx` `shows job link, recruiter name and notes on the new resume form` | yes - labels by `for`, names, `type="url"`, not required, empty values |
| C2 | `resume.service.test.ts` `stores trimmed tracking fields on create and empty ones when absent` | yes - trimmed values, absent and whitespace-only read `''` in result and repo row |
| C3 | `resumes.test.tsx` `shows the stored tracking fields in the editor form` | yes - values inside `#resume-form`, Save includes the form |
| C4 | `resume.service.test.ts` `updates tracking fields without touching the document, model or assessment` | yes - compares structured, model and every assessment column to the row before |
| C5 | `resume.service.test.ts` `keeps a tracking field that the save omits` | yes |
| C6 | `resumes.test.tsx` `links the job link in a new tab with noopener noreferrer` | yes - exact href, target, rel; no anchor when empty |
| C7 | `resumes-list.test.tsx` `shows a Recruiter column after Company` | yes - header order and cell values, empty cell when none |
| C8 | `resume.service.test.ts` `rejects a job link that is not http or https and stores nothing` | yes - round 2 adds `http:jobs.example.com` and `https:/jobs.example.com`; both fail without the `^https?://` prefix check (F5 closed) |
| C9 | `resume.service.test.ts` `rejects over-length tracking fields and accepts the exact limits` | yes - round 2 adds 200/201 `𝒜` and 10000/10001 emoji; the at-limit cases fail under UTF-16 counting (F2 closed) |
| C10 | `resume.service.test.ts` `never sends tracking fields to the tailor model` | yes - system and prompt of both calls, old and new values |
| C11 | `resumes.test.tsx` `creates a resume with the posted tracking fields` | yes |
| C12 | `resumes.test.tsx` `saves posted tracking fields and keeps omitted ones` | yes |
| C13 | `resumes.test.tsx` `answers 400 for an invalid job link on create and save` | yes - status, message, nothing stored |
| C14 | `profile.test.tsx` `shows additional information on the career tab` | yes |
| C15 | `profile.test.tsx` `stores trimmed additional information` | yes |
| C16 | `profile.test.tsx` `keeps both texts when the ai tab is saved` | yes |
| C17 | `profile.test.tsx` `rejects additional information containing a personal info value` | yes - case-varied email, exact message, no upsert |
| C18 | `profile.test.tsx` `rejects additional information containing the full name` | yes |
| C19 | `profile.test.tsx` `limits additional information to 5000 characters` | yes - 5001 rejected, 5000 padded saves |
| C20 | `public-chat.service.test.ts` `ends the body with the additional information section` | yes - whole body equality |
| C21 | `recruiter-chat.service.test.ts` `ends the body with additional information with and without a linked resume` | yes - unlinked, linked and test, whole body equality |
| C22 | `resume.service.test.ts` `ends the tailor body with the additional information section` | yes |
| C23 | `resume.service.test.ts` `sends today's tailor body when additional information is empty` | yes - claim narrowed to the tailor body, which the test compares whole |
| C24 | `resume.service.test.ts` `refuses to generate when additional information contains the full name` | yes - uppercase name, no call, nothing stored |
| C25 | `print.test.tsx` `keeps profile texts out of print and download` | yes - against narrowed OWN-22: a code path copying either text into print, download or the stored document fails it; model wording is out of scope by user decision |
| C26 | `profile.test.tsx` `shows looking forward next on the career tab` | yes - also field order |
| C27 | `profile.test.tsx` `stores trimmed looking forward next` | yes |
| C28 | `profile.test.tsx` `rejects looking forward next containing personal info or the full name` | yes |
| C29 | `profile.test.tsx` `limits looking forward next to 5000 characters` | yes |
| C30 | `public-chat.service.test.ts` `sends today's body when both texts are empty` | yes - public body compared whole; the recruiter half of its claim is proved by C42 |
| C31 | `owner-notes-migration.test.ts` `reads tracking fields of an existing resume as empty` | yes - row inserted before migration 0008 |
| C32 | `owner-notes-migration.test.ts` `reads both profile texts of an existing profile as empty` | yes |
| C33 | `profile.repository.test.ts` `upsert stores additional information and looking forward next` | yes |
| C34 | `resume.repository.test.ts` `stores and updates the tracking fields` | yes |
| C35 | `body.test.ts` `appends non-empty sections in order` | yes |
| C36 | `body.test.ts` `returns the body unchanged when every section is empty` | yes |
| C37 | `public-chat.service.test.ts` `puts looking forward next last and leaves both out for an empty library` | yes |
| C38 | `recruiter-chat.service.test.ts` `ends the body with looking forward next and leaves both out for an empty library` | yes |
| C39 | `recruiter-chat.service.test.ts` `never sends a linked resume's tracking fields` | partly - the unit test still cannot fail (fake returns only `structured`); the claim is now held by C43 and C44 with real repositories |
| C40 | `resume.service.test.ts` `never sends looking forward next to the tailor` | yes |
| C41 | `print.test.tsx` `keeps tracking fields out of print and download` | yes |
| C42 | `recruiter-chat.service.test.ts` `sends today's bodies when both texts are empty` | yes - unlinked, linked and `test` bodies compared whole; any appended section fails it |
| C43 | `recruiter-chat.repository.test.ts` `reads only the structured document of a resume with tracking fields` | yes - `toEqual` the document; selecting the whole row would fail it |
| C44 | `recruiter-chat.test.ts` (integration) `keeps a linked resume's tracking fields out of the model and every /api response` | yes - real repositories; prompt shown to hold the resume text, then checked with `GET /api/r/:token` and the stream body for all three values |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 - OWN-22: Additional Information reaches the stored Resume Document when the tailor model copies it; C25 cannot see this | `src/services/resume.service.ts:304-321` sends the section to the tailor and stores `finished.doc` unchecked; `test/unit/admin/print.test.tsx:157` uses the canned `sampleReplyV2`. Throwaway probe at c1ef0f6: a mock reply whose `summary` contains the Additional Information text is stored as-is and `generate` succeeds | User decision: either guard `generate` (reject/retry an output whose headline, summary or item text contains the trimmed Additional Information) with a test whose mock model echoes it, or append a new criterion narrowing OWN-22 to "the app does not copy it" | 685b625 - OWN-22 narrowed by user decision ("Allow model wording (Recommended)"); C25 holds for the code paths |
| F2 - OWN-09: tracking limits count UTF-16 code units, not characters | `src/services/resume.service.ts:524` `trimmed.length > max` (profile texts use `[...value].length`, `src/admin/profile/routes.ts:155`). Probe: Recruiter Name of 150 `𝒜` (150 characters) is rejected with "Recruiter name is limited to 200 characters"; Notes of 6000 emoji rejected as over 10000 | Count with `[...trimmed].length`; add astral-character cases at and over each limit to C9's test | b8444f6 |
| F3 - OWN-10: C39's test is vacuous and `/api` has no test | `test/support/recruiter-chat.fake.ts:107` returns only `structured`; the real guarantee is `src/repositories/recruiter-chat.repository.ts:150-157` selecting `structured` only, which no test pins. No check covers "any `/api` response" | Integration test: `RecruiterChatRepository.resumeDocument` of a resume with tracking fields returns the document and none of them; route test: `GET /api/r/:token` and the chat stream for a chat linked to such a resume contain none of the three values | bdcbf85 - C43, C44 |
| F4 - OWN-20 / OWN-30 recruiter half has no proof | C23 and C30 claim public/recruiter bodies but their proofs run one test each; `recruiter-chat.service.test.ts` `sends today's bodies when both texts are empty` exists and no check names it | Add a check (or proof line) selecting `recruiter chat service owner notes > sends today's bodies when both texts are empty`; make C23 also select the public test or narrow its claim to the tailor | bdcbf85 - C42; C23 narrowed to the tailor |
| F5 - OWN-08 (minor): `http:jobs.example.com` is accepted although the message says it must start with `http://` | `src/services/resume.service.ts:155-162` relies on `new URL()`, which normalises `http:host`. Probe at c1ef0f6: create stores `http:jobs.example.com` | Require the value to start with `http://` or `https://` (case-insensitive) as the message states; add the case to C8's list | b8444f6 |
