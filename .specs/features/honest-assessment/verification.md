# honest-assessment verification

**Verdict**: PASS
**Proofs**: `proofs.md` at e7cbc54
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `output.test.ts` `tailor assessment schema > requires and describes every assessment field` | yes |
| C2 | `output.test.ts` `tailor assessment schema > score rates the original career library` | yes |
| C3 | `assessment.test.ts` `assessment bounds > rejects each value one past its bound` | yes |
| C4 | `resume.assessment.test.ts` `resume assessment > rejects an out-of-bounds assessment twice then fails` | yes |
| C5 | `resume.assessment.test.ts` `resume assessment > sends no personal info value or full name` | yes |
| C6 | `assessment.test.ts` `restore notes > names the title, organisation and section` | yes |
| C7 | `assessment.test.ts` `restore notes > leaves out the organisation when the item has none` | yes |
| C8 | `finish.test.ts` `finish > adds one restore note per restored item with a shared title` | yes |
| C9 | `finish.test.ts` `finish > adds no note for a left-out project, publication or honour` | yes |
| C10 | `assessment.test.ts` `old role collapse > keeps the first bullet and empties the text of a role ended more than 15 years ago` | yes |
| C11 | `assessment.test.ts` `old role collapse > adds the note only when something was removed` | yes |
| C12 | `assessment.test.ts` `old role collapse > leaves a role ending 15 years ago, without end year or current unchanged` | yes |
| C13 | `assessment.test.ts` `old role collapse > leaves other kinds unchanged` | yes |
| C14 | `finish.test.ts` `finish > collapses a restored old role` | yes |
| C15 | `assessment.test.ts` `missing skills filter > drops a skill equal to a library skill ignoring case` | yes |
| C16 | `assessment.test.ts` `missing skills filter > keeps unmatched skills trimmed in model order` | yes |
| C17 | `assessment.test.ts` `missing skills filter > keeps the first of duplicate skills` | yes |
| C18 | `assessment.test.ts` `missing skills filter > keeps every skill when the library has none` | yes |
| C19 | `assessment-migration.test.ts` `assessment columns > adds the four columns with their defaults and the score check` | yes |
| C20 | `resume.assessment.test.ts` `resume assessment > stores model omissions, then restore notes, then collapse notes` | yes |
| C21 | `resume.assessment.test.ts` `resume assessment > stores empty lists when nothing is missing or cut` | yes |
| C22 | `resume.assessment.test.ts` `resume assessment > keeps the assessment on save, item edit, add back and preview` | yes |
| C23 | `resume.assessment.test.ts` `resume assessment > has no assessment before the first generation` | yes |
| C24 | `resume.assessment.test.ts` `resume assessment > keeps the stored assessment when generate fails` | yes |
| C25 | `resume.assessment.test.ts` `resume assessment > replaces the assessment on a second generation` | yes |
| C26 | `rubric.test.ts` `score rubric > builds prompt lines and labels from SCORE_BANDS` | yes |
| C27 | `resume.assessment.test.ts` `resume assessment > appends the assessment rules to the stored tailor prompt` | yes |
| C28 | `rubric.test.ts` `score rubric > rules block holds every rubric line and rules 1 to 7` | yes |
| C29 | `resume.assessment.test.ts` `resume assessment > input starts with today's date` | yes |
| C30 | `assessment-panels.test.tsx` `assessment panels > shows score, band and rationale` | yes |
| C31 | `assessment-panels.test.tsx` `assessment panels > shows one badge per missing skill in order` | yes |
| C32 | `assessment-panels.test.tsx` `assessment panels > shows the no gaps state` | yes |
| C33 | `assessment-panels.test.tsx` `assessment panels > shows one row per omission with its reason in order` | yes |
| C34 | `assessment-panels.test.tsx` `assessment panels > shows the nothing left out state` | yes |
| C35 | `assessment-panels.test.tsx` `assessment panels > shows only not assessed yet when the score is null` | yes |
| C36 | `assessment-routes.test.tsx` `assessment panels > generate swaps in the new assessment` | yes |
| C37 | `assessment-panels.test.tsx` `assessment panels > escapes model text` | yes |
| C38 | walk: editor at 375 px (`proofs.md` Walked) | yes |
| C39 | `real-model-run.md` (four PASS lines, walked) | yes |
| C40 | `verify-tailor.test.ts` `verify tailor > fixtures hold one absent skill, an old role and an unrelated project` | yes |
| C41 | `verify-tailor.test.ts` `verify tailor > reports pass or fail for each of the four checks` | yes |
| C42 | `verify-tailor.test.ts` `verify tailor > exits 1 when any check fails` | yes |
| C43 | `verify-tailor.test.ts` `verify tailor > exits 2 without OPENROUTER_API_KEY` | yes |
| C44 | `finish.test.ts` `finish > restores every always-kept item when the model returns none` | yes |

## Findings

None - read all 44 checks' tests against the spec values and ran throwaway probes at HEAD, all green: collapse boundary at todayYear 2040 (2024 collapses, 2025 and 2026 stay), a text-only old role with no bullets (collapses, one note), the UTC year turn (2026-01-01 collapses a 2010 role, 2025-12-31 does not), missing-skill filter on `C++`, `Node.js`, `C#`, accented case folding and a `- Go` prefix, score bounds 0/1/99/100/101/-1/NaN/100.0000001, a whitespace-only reason (rejected), and 30 model omissions plus 2 code notes (32 stored, notes not cut). Minor, not findings: C29 reads the real clock so it can flake at UTC midnight; C38 was not re-walked by the Verifier.
