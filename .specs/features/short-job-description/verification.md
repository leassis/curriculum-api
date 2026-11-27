# Short Job Description verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 8bbd455
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `output.test.ts` `requires and describes job_description_short` | yes |
| C2 | `resume.short-jd.test.ts` `appends the short job description rules to the system prompt` | yes |
| C3 | `short-description.test.ts` `name every kept section` | yes |
| C4 | `short-description.test.ts` `name every dropped item` | yes |
| C5 | `short-description.test.ts` `fix format, language and the 2000 cap` | yes |
| C6 | `resume.short-jd.test.ts` `stores the short job description and replaces an earlier one` | yes |
| C7 | `short-description.test.ts` `cuts at the last line or sentence end before 2000` | yes |
| C8 | `short-description.test.ts` `hard-cuts at 2000 and keeps exactly 2000 whole` | yes |
| C9 | `finish.test.ts` `returns ok with a truncated short job description` | yes |
| C10 | `finish.test.ts` `returns ok with null for a blank short job description` | yes |
| C11 | `resume.short-jd.test.ts` `keeps the short job description when generation fails` | yes |
| C12 | `short-jd-migration.test.ts` `adds a nullable job_description_short that starts NULL` | yes |
| C13 | `resumes.short-jd.test.tsx` `shows the short job description textarea after the job description` | yes |
| C14 | `resume.short-jd.test.ts` `stores the trimmed short job description and null when blank` | yes |
| C15 | `resumes.short-jd.test.tsx` `saves the short job description` | yes |
| C16 | `resumes.short-jd.test.tsx` `rejects a short job description over 2000 characters` | yes |
| C17 | `resumes.short-jd.test.tsx` `leave out the short job description` | yes |
| C18 | `chats-autofill-routes.test.tsx` `fills an empty job description` | yes |
| C19 | `chats-autofill-routes.test.tsx` `replaces the last autofilled job description` | yes |
| C20 | `chats-autofill-routes.test.tsx` `keeps owner text and shows the not filled notice` | yes |
| C21 | `chats-autofill-routes.test.tsx` `replace fills the field and clears the notice` | yes |
| C22 | `chats-autofill-routes.test.tsx` `shows the no short description notice` | yes |
| C23 | `chats-autofill-routes.test.tsx` `applies the rule to company` | yes |
| C24 | `chats-autofill-routes.test.tsx` `master cv keeps fields and clears notices` | yes |
| C25 | `chats-autofill-view.test.tsx` `renders notices in a polite live region` | yes |
| C26 | `chats-autofill-routes.test.tsx` `stores a snapshot of the job description` | yes - fixed in 8bbd455: the test now posts an Owner-edited field text and asserts the chat stores it |
| C27 | `chats-autofill.test.ts` `treats a whitespace-only field as empty` | yes |
| C28 | `chats-autofill-routes.test.tsx` `shows tailored resume not found for an unknown resume` | yes |
| C29 | `chats-autofill.test.ts` `covers fill, keep, replace and no source` | yes |
| C30 | walk (`**Walked:**` line in tasks.md) | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| C26 does not hold AC 9: the chat stores "the Job Description field's current text", but the test never posts a field value that differs from the resume's short | `chats-autofill-routes.test.tsx` `stores a snapshot...` posts `jobDescriptionShort: filled.jd` (= "- Short of A") and the later resume change is made on the fake repo after creation, which a snapshot-less chat would also survive | add a case posting an edited field text (e.g. "- Edited by Owner") with `tailoredResumeId: A` and assert the stored chat holds that text, not the resume's short | 8bbd455 |
| `shortJobDescription` counts a sentence end only when `.`/`!`/`?` is followed by whitespace or end of text, which the spec (AC 6, "sentence end (`.`, `!`, `?`)") does not say and no test pins | probe at HEAD: `"a"*1500 + '." ' + "b"*600` is hard-cut at 2000 although a `.` sits at 1500 (spec literal: cut at 1501); `"A one. " + "b"*1000 + "3.5" + "c"*1200` is cut to 6 chars ("A one.") and keeps "3.5" out; `"a"*1999 + ".x"...` hard-cut | decide the rule: either add to spec.md (new requirement/assumption wording: sentence end = `.!?` followed by whitespace or end) and pin it with a test on `"3.5"` and `."` cases, or drop the whitespace condition | 8bbd455: rule kept (sentence end = `.!?` plus optional closing quotes or brackets, then whitespace or end) and pinned by `short-description.test.ts` `does not end a sentence inside a number and ends it before a closing quote` |

Own examples run at HEAD (throwaway test, deleted): CRLF line break before the cap cuts at the break and drops `\r` (1000 points); emoji (surrogate pairs) are counted as code points, 2000 whole or hard-cut at 2000; `.` at point 2000 followed by a space or by `x` both give 2000; raw text of 2000 + trailing whitespace is kept whole after trim; autofill with a blank-source Company changes nothing and gives no notice, a whitespace-only field with no source is left as is with the `no-source` notice, a CRLF value equal to the last autofill (LF) counts as autofilled.
