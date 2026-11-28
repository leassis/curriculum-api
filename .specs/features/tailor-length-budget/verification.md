# Tailor Length Budget verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 56122ab
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `resume.service.test.ts` `states the target pages and bullet caps in the tailor input` | yes - asserts "Target length: 2 pages", "c1: at most 2 bullets", "c2: at most 1 bullet"; both caps are the library-count ceiling, so no budget-limited cap is shown, but the id mapping and wording are held |
| C2 | `budget.test.ts` `weights experiences by recency` | yes - exact caps [22,18,13,9,4,0] on six roles given oldest first |
| C3 | `budget.test.ts` `never caps above the library bullet count` | yes - a current role with 2 bullets gets exactly 2 |
| C4 | `fit.test.ts` `keeps only the first cap bullets of an experience` | yes - `toEqual(slice(0, 3))` |
| C5 | `fit.test.ts` `drops project bullets first, then experiences oldest to newest` | yes, narrowly - only two roles, so the order among middle roles is not exercised; newest-first or oldest-first would still fail it |
| C6 | `fit.test.ts` `keeps every experience whatever the budget` | yes - ids in order, all bullets empty at target 0.01 |
| C7 | `fit.test.ts` `returns an over-minimum document with its estimate` | yes - estimate > 1, equals `estimatePages(result.doc)`, all bullets empty |
| C8 | `resume.service.test.ts` `stores a long reply cut to the target pages` | yes - 9 roles / 43 bullets, estimate <= 2, 9 items kept, Role 9 keeps more than Role 1 |
| C9 | `resume.service.test.ts` `creates a resume with the default target pages` | yes - 2 unset, 1 after the setting |
| C10 | `resume.service.test.ts` `stores target pages from the options` | yes - 3 returned and re-read |
| C11 | `resume.service.test.ts` `rejects target pages outside 1 to 3` (also `settings.service.test.ts` same name) | yes - 0, 4, 1.5, NaN rejected, stored 3 kept; setting: 0, 4, 2.5, abc rejected, stored 3 kept |
| C12 | `settings.service.test.ts` (integration) `rejects a target pages override outside 1 to 3` | yes - ValidationError and stored 3 kept in the DB |
| C13 | `target-pages-migration.test.ts` `gives existing resumes target pages 2` | no - it inserts a row after the migration and reads the column default; it does not show a pre-existing row backfilled, and the "rejects 4" half of the claim lives in a sibling test the proof does not select |
| C14 | `resumes.test.tsx` `shows the page estimate against the target` | yes - "~2.3 of 2 pages" at a document estimating 2.3 to 2.35 |
| C15 | `resumes.test.tsx` `warns only when the estimate exceeds the target` | yes on 2.3/2 and 1.8/2; the boundary (equal, or 2.04 shown as "2.0") is not tested |
| C16 | `resumes.test.tsx` `shows no estimate before the first generation` | yes - no `~N.N of N page` and no warning |
| C17 | `budget.test.ts` `uses 120 characters when the library has no bullets` | yes - asserts `meanBulletLength` is 120 directly; the cap 0 in the same test would hold with any mean |
| C18 | `length.test.ts` `scales the estimate for Letter` | yes - Letter equals A4 / 0.965 to 5 places |
| C19 | `fit.test.ts` `keeps every bullet under the cap` | yes - 2 bullets, cap 5, `toEqual` |
| C20 | `settings.test.tsx` `saves the target pages default in Settings` | yes - renders "Default (2)", saves 1, rejects 5 with 400 and message, stored value kept |
| C21 | `default-prompts.test.ts` `tailor prompt asks to keep within the length budget` | yes - new rule text, "Never drop or merge a role", old "compress its bullets" absent |
| C22 | `budget.test.ts` `ranks a role with no end date as ongoing` | yes |

Own examples (throwaway, deleted): `bulletCaps` with ties, missing end dates and two current roles; `fitToBudget` with caps above the document, an item without `sourceId`, a zero cap, and A4 vs Letter on an 80-bullet role; `estimatePages` Letter.

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| C13's test does not prove existing rows get 2 | `target-pages-migration.test.ts` `gives existing resumes target pages 2` inserts after migrating and checks `row.targetPages === 2`, which a default on new inserts alone would satisfy; the rejection of 4 is a different test | in the migration test, apply migrations up to 0009, insert a resume, apply 0010, assert the row has 2 (or add the "rejects 4" assertion to the selected test) |  212f6ba - the test drops the column, inserts a resume, runs 0010's SQL and asserts 2 and a rejected 4 (C13) |
| Bullet caps depend on library order for tied roles | probe: two roles with the same end year/month and start year got caps 24 and 19, swapping when the input order was reversed | add a final deterministic tie-break in `recency` (for example the item id or title) and a test with two tied roles |  212f6ba - `recency` ends on the item id; `gives tied roles the same caps whatever the input order` (C22 group) |
| A non-current role with no end date ranks as the oldest | probe: a role started 2023 with `endYear` null and `current` false got cap 9, below a role that ended in 2020 (14); `recency` maps a null end to 0. The schema allows this (`current` false, no end) | decide the rule (rank a null end by its start, or treat it as ongoing), state it in the spec, test it |  212f6ba - no end year ranks as ongoing, LEN-07 added to the spec; C22 `ranks a role with no end date as ongoing` |
| Estimate at or just over the target shows as "~2.0 of 2 pages" with an over-target warning | `view.tsx` compares the raw estimate (`estimate > target`) while printing `toFixed(1)`; an estimate of 2.04 prints 2.0 with the warning, and `warns only when...` tests only 2.3 and 1.8 | warn on the rounded value, or print the value so it is visibly over; add a test at 2.04/2 |  212f6ba - the warning compares the rounded value; `warns only when the estimate exceeds the target` now covers 2.02 (C15) |
| `bulletCaps` Letter test is looser than the rule | `budget.test.ts` `gives a Letter resume the A4 budget scaled by printable area` asserts only `toBeLessThan` | assert the exact Letter caps, or the ratio, on the six-role fixture |  212f6ba - asserts caps 22 (A4) and 21 (Letter) on the six-role fixture (C18 group) |
