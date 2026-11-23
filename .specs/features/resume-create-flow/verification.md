# Resume Create Flow verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at b6f330a
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `resumes.test.tsx` `admin resumes create flow > new resume form has a checked personal header checkbox per field` | yes - checked box and value per key, hidden marker, exactly 2 boxes; "labelled as in the editor" only `toContain(label)` anywhere in the form (loose) |
| C2 | `resume.service.test.ts` `resume service create flow > creates then generates with the generate input` | yes - prompt parts, trimmed instructions, one call, maxOutputTokens; never compared against `generate()` directly |
| C3 | `resumes.test.tsx` `admin resumes create flow > create generates and redirects to the editor` | yes - 303, exact Location, stored content/model, one call |
| C4 | `resumes.test.tsx` `admin resumes create flow > editor after create holds the generated content` | yes - escaped text in textarea and rendered preview |
| C5 | `resume.service.test.ts` `resume service create flow > stores exactly the checked header keys` | yes at service level; the route mapping (marker + posted keys) is held only by the unnamed `stores the checked header keys, null for all, [] for none`, which no check cites |
| C6 | `resume.service.test.ts` `resume service create flow > stores null when every header box is checked` | yes |
| C7 | `resumes.test.tsx` `admin resumes create flow > create form disables the button and shows generating text` | no - string-matches htmx attributes in markup; nothing proves the button disables, "Generating…" becomes visible, or the 303 is followed in a browser (AC 6 is a runtime state) |
| C8 | `resumes.test.tsx` `admin resumes create flow > answers 400 and stores nothing for invalid input` | yes - four cases, message text, no rows, no LLM call (server side only; the in-browser 400 display via boost is unproven) |
| C9 | `resumes.test.tsx` `admin resumes create flow > keeps the resume and redirects with error generate when the llm fails` | yes - exact Location, content "", model null, headerFields stored |
| C10 | `resumes.test.tsx` `admin resumes create flow > keeps the resume and redirects with error master-cv when the master cv is empty` | yes - exact Location, no LLM call |
| C11 | `resumes.test.tsx` `admin resumes create flow > editor shows the generation failed text for error generate` | yes - exact text in `#editor-status` |
| C12 | `resumes.test.tsx` `admin resumes create flow > editor shows the master cv text for error master-cv` | yes |
| C13 | `resumes.test.tsx` `admin resumes create flow > editor shows no error text for an unknown error value` | yes for "nope", markup, empty; does not cover Object.prototype keys (see findings) |
| C14 | `resumes.test.tsx` `admin resumes create flow > generate works on the editor opened after a failed create` | yes - real generate after fixing the CV |
| C15 | `resumes.test.tsx` `admin resumes create flow > omits the fieldset and stores null without personal info fields` | yes |
| C16 | `resume.service.test.ts` `resume service create flow > ignores unknown header keys` | yes |
| C17 | `resume.service.test.ts` `resume service create flow > stores an empty list when every header box is unchecked` | yes at service level; route case (marker only, no boxes) is held by the uncited route test |
| C18 | `resume.service.test.ts` `resume service create flow > sends no personal info value or full name to the model on create` | yes - email, phone and full name absent from the prompt |
| C19 | `resumes.test.tsx` `admin resumes create flow > stores the checked header keys, null for all, [] for none` | yes - route marker logic (`headerFieldsPosted`): checked keys, null for all, [] for none; complements C5/C6/C17 at service level |
| C20 | `resume.repository.test.ts` (integration) `resume repository > stores headerFields on insert and reads them back unchanged` | yes - real Postgres round trip for a list, `[]` and default null; run on a Neon branch, 7/7 pass in that file |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Create AC 6 (button disabled, "Generating…" shown while running) has no behavioural proof; the T5 walk is unchecked and no browser run happened | C7 only matches attributes; `tasks.md` T5 `[ ]` walk and Handoff "NOT a browser walk"; unverified: hx-boost follows the 303 and pushes the URL, `hx-disabled-elt` disables, `.htmx-request.htmx-indicator` reveals the text | do the browser walk (or a DOM test with htmx) and record it; keep C7 as markup wiring only |  8628840 |
| Deviation hx-boost + `#editor-status` for 400s is acceptable for the intent of AC 6/7 but is unproven and different from the design | Server 400 and message unchanged (C8). In a browser the 400 relies on `swapErrorsInto("editor-status")` from `editor.js`, loaded on the list page; the status line reuses `.status` (green `text-success`) so a validation error shows green; swapErrorsInto also redirects any 4xx on the list page (e.g. row DELETE) into the form's status line | confirm in the browser; consider recording the deviation in spec/Handoff approval and an error style |  38f8823, 8628840 |
| Out-of-scope commit f357ab1 (`ResumeInsert.headerFields`) is required but untested against the real repository; the fake was changed to honour it, so unit tests pass with or without it | `src/repositories/resume.repository.ts` insert passes `row` straight to drizzle; `test/integration/repositories/resume.repository.test.ts` has no insert-with-headerFields case; spec "Touches" does not list the repository | add an integration repository test that inserts `headerFields` and reads it back; list the repository under Touches | 6cef85a |
| `CREATE_ERRORS[...]` is a plain object indexed by user input, so `?error=constructor` or `?error=__proto__` resolves to a prototype member | Probe at HEAD: both rendered an empty status line (no text leaked), but only because JSX drops the function/object; C13 does not cover those values (Failure AC 5 "any other value") | use `Object.hasOwn` or a Map, and add `constructor`/`__proto__` to C13's values | d131c59 |
| Integration helper `calls.length = 0` is harmless but hides the new extra model call from those tests | `test/integration/routes/resumes.test.ts:78`; create now generates once and is excluded from counts; no assertion changed | none required; acceptable | none required - accepted as is (b6f330a) |
| Unit proof of C5/C17 sits at service level; the route's marker logic (`headerFieldsPosted`) is covered only by an uncited test | `resumes.test.tsx` `stores the checked header keys, null for all, [] for none` (probe: a single string `headerFields=PHONE` stores `["PHONE"]`, omitted marker stores null, 2000-char instructions accepted) | cite that route test as a proof line on C5/C17 | 766068b |
