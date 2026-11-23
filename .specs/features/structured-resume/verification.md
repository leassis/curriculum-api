# Structured Resume verification

**Verdict**: PASS after round 2 (round 1: FAIL, F1-F4)
**Proofs**: `proofs.md` at e2c757b (43 pass; HEAD 4f59a97 differs only in `.specs/`)
**Verifier**: independent sub-agent (author != verifier)

`pnpm lint` (biome, `scripts/check-architecture.ts`, build-js check) exits 0 and `pnpm typecheck` is clean at HEAD. `@openrouter/ai-sdk-provider` is imported only in `src/llm/openrouter.ts`. Migration `0004` runs `UPDATE ... SET "model" = NULL` before `DROP COLUMN "content"`, and C18 asserts the result.

Examples I tried with throwaway unit tests, now deleted:
- **Parsing.** CRLF Master CV, headings with trailing spaces, `##NoSpace`, `1. text` lines, Portuguese titles with accents (`Experiência`, `Formação Acadêmica`, `FORMAÇÃO`). All parse per AD-006.
- **Model reply ids.** A reply that puts an item id in `sections` and a section id in `items` is rejected as `unknown_id`.
- **Form.** A form that posts an unknown `kind` gets 400 `sections.0.kind`. Sparse and out-of-order indices are covered by the form codec tests.
- **Stored HTML.** HTML in stored strings is escaped in the form (existing test) and by `renderMarkdown`.
- **Invalid stored JSON.** A recruiter chat linked to a resume whose stored JSON is invalid falls back to the Master CV (C38).
- **Failures found.** Four examples fail: see the findings below.

## Checks

C41-C44 were added from the user's answers to F1-F4 and written by the fixer; the orchestrator (not their author) judged them in round 2. No second Verifier ran.

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `resume.service.test.ts` `sends the annotated master cv with ids kinds and headings` | yes - asserts each annotated heading line, the `[s0]` intro and the kinds line |
| C2 | `parse-cv.test.ts` `assigns ids in source order and kinds ignoring case and accents` | yes - a few list titles (`Experiência`, `Employment`, `Formação`) are only in the sibling `section kind` test, which runs in the same proof group |
| C3 | `parse-cv.test.ts` `keeps deeper headings in item text and lead text in sections without items` | yes |
| C4 | `llm.service.test.ts` `sends the schema with a description on every field` | yes - checks the sent `responseFormat` name, every property path and the bullet item description |
| C5 | `llm.service.test.ts` `tells invalid output apart from an outage` | yes |
| C6 | `openrouter.test.ts` `adds structured settings only for structured calls` | yes |
| C7 | `assemble.test.ts` `copies titles kinds and headings from the source in source order` | yes - bodies pretend to be headings and the reply comes back in reverse order. Multi-line bodies are not tried: see F3 |
| C8 | `assemble.test.ts` `drops items the model left out` | yes |
| C9 | `resume.service.test.ts` `retries once on invalid output unknown id or duplicate id` | yes - exactly 2 calls, same prompt and system, one warn log with the reason |
| C10 | `resume.service.test.ts` `leaves the resume unchanged after two failed attempts` | yes - the "Generation failed, try again" 502 text is asserted at the route in `resumes.test.tsx` |
| C11 | `resume.service.test.ts` `rejects a master cv without sections before calling the llm` | yes |
| C12 | `resumes.test.tsx` `create maps an unstructured master cv to the structure error` | yes |
| C13 | `assemble.test.ts` `strips heading and bullet prefixes from returned strings` | yes - covers the leading prefix only, which matches AC 8 as written. See F3 |
| C14 | `resume.service.test.ts` `wraps custom instructions in the delimiter and removes inner tags` | yes - exact string plus forged, mixed-case and re-forming tags |
| C15 | `resume.service.test.ts` `adds no delimiter when custom instructions are empty` | yes |
| C16 | `resume.service.test.ts` `sends no personal info and no full name to the model` | no - the fixture Master CV does not contain the full name, so the test only shows that the code does not add it. A Master CV that starts `# <fullName>` sends the name (F1) |
| C17 | `constraints.test.ts` `new rows have a null structured document` | yes |
| C18 | `structured-migration.test.ts` `keeps resume rows and links and drops content` | yes - real migration from `0003`, a row with content and a model, and a recruiter link |
| C19 | `resume.service.test.ts` `keeps structured null until the first successful generation` | yes |
| C20 | `document.test.ts` `enforces every bound version kind and heading` | yes - every bound and its failing path. The 100 000-character bound and the at-bound values are in sibling tests. Type inference is structural (`document.ts:36`) |
| C21 | `resume.service.test.ts` `parses the document before writing` | yes for Save. The Generate side is proven by C23 |
| C22 | `resume.service.test.ts` `rejects an invalid document with the failing path and stores nothing` | yes |
| C23 | `assemble.test.ts` `reports a document over the bounds as a schema failure` | yes - the retry on `schema` is proven by C9 (`overBounds`) |
| C24 | `resume.service.test.ts` `returns the parsed stored document` | yes |
| C25 | `resumes.test.tsx` `shows the invalid data message for a corrupt stored document` | yes - message, Generate, no form, log id and path, no content |
| C26 | `resumes.test.tsx` `editor shows the document as a form` | yes |
| C27 | `resumes.test.tsx` `editor shows not generated yet without a document` | yes |
| C28 | `resumes.test.tsx` `save stores the form document and answers saved` | yes |
| C29 | `resumes.test.ts` (int) `removes an item and saves without it` | yes on the tested form. The target index is not checked against dropped sections (F2) |
| C30 | `form.test.ts` `moves items within their section and ignores moves past the edges` | yes - swap and edges. Save of the new order is in `resume.service.test.ts` `removes and moves items in the returned form without saving`. Same index gap as C29 (F2) |
| C31 | `resume.service.test.ts` `rejects personal info in any document string` | yes - five string positions, case-insensitive value, row unchanged |
| C32 | `resumes.test.tsx` `preview renders the posted form` | yes |
| C33 | `resumes.test.tsx` `generate swaps in the form with the new document` | yes |
| C34 | `render.test.ts` `renders sections items and bullets in stored order` | yes - exact string |
| C35 | `resume.service.test.ts` `print view renders the document` | yes |
| C36 | `resume.service.test.ts` `markdown download renders the document` | yes - exact string |
| C37 | `recruiter-chat.service.test.ts` `sends the linked resume document rendered as markdown` | yes - exact `<cv>` body |
| C38 | `recruiter-chat.service.test.ts` `falls back to the master cv when the linked resume has no document` | yes - NULL, schema-invalid and empty document |
| C39 | `resume.service.test.ts` `print and download show the empty state without a document` | yes |
| C40 | `form.test.ts` `drops empty sections and stores blank bullets as an empty list` | yes |
| C41 | `resume.service.test.ts` `rejects a master cv that contains the full name before calling the llm` | yes - three placements (heading, upper case, lower case), exact message, zero model calls, row unchanged, create flow `full-name`; C16 now also fails without the guard (`# <fullName>` CV) |
| C42 | `resume.service.test.ts` `rejects an empty or too long heading before calling the llm` | yes - empty, blank and 201-char headings rejected with the exact message and zero calls; 200 chars still generates (bound tested on both sides) |
| C43 | `assemble.test.ts` `strips prefixes on every text line and flattens headings and bullets` (+ Save case in `resume.service.test.ts`) | yes - asserts exact text and bullets, and that rendered markdown has only the source headings and bullets; `#######` and `-x` left alone |
| C44 | `form.test.ts` `applies the op to the clicked item after an earlier section is emptied` | yes - remove, up, down on both sections through `documentFromForm(body, op)`, the path `formOp` uses; route-level test posts the button's `hx-vals` |

## Findings

| Finding | Severity | Evidence | Fix | Closed |
| --- | --- | --- | --- | --- |
| F1 - `profile.fullName` reaches the model when the Master CV contains it (Generate AC 11) | Major | `src/services/resume.service.ts:256-264` sends `parseMasterCv(profile.masterCv)` as the body. `src/llm/pii-guard` checks only Personal Info Field values (`llm.service.ts:117`). A probe with Master CV `# Ada Lovelace\n\nBackend engineer.\n\n## Experience...` recorded the full name in the prompt. C16's fixture CV has no name, so C16 stays green | Reject or redact `profile.fullName` in the tailor body and input (guard it like a PII value), and add a C16 case whose Master CV starts with `# <fullName>` | 6831f74 |
| F2 - Remove/Move act on the wrong item after the Owner empties a text-only section above it | Major | `src/services/tailor/form.ts:78` drops a section with no items and empty text before `applyOp` resolves `s<i>.i<j>`. The buttons carry form indices (`src/admin/resumes/view.tsx:89`). Probe: sections Skills (text cleared), Experience [A, B], Education [C]. Clicking Remove on A (`s1.i0`) removed C and kept A and B | Resolve the op target against the form's own indices before dropping empty sections (or keep empty sections until Save). Add a C29/C30 case with an emptied text-only section before the target | 4149394 |
| F3 - Heading and bullet lines inside a returned multi-line string reach every output, so some generated headings do not come from the Master CV (Goal 2, Success Criterion "every generated heading equals a Master CV heading") | Minor | `src/services/tailor/assemble.ts:10-12` strips only the leading prefix. Probe: item text `"ok\n## Injected Section\n### Fake Role"` is stored as is and `renderResumeMarkdown` emits `## Injected Section`. A bullet `"a\n- b"` renders as two bullets. No check covers this | Strip the heading and bullet markers on every line of returned text (or collapse newlines in bullets), and add a C13 case with a multi-line string | 9a542c7 |
| F4 - A Master CV with an empty `### ` heading, or a heading over 200 characters, always fails Generate after two paid model calls | Minor | `src/services/tailor/parse-cv.ts:107` keeps heading `""`. `assemble` then fails `ResumeDocumentSchema` (`heading` min 1 / max 200) with `schema`, so the call is retried and answers 502 every time. Probe: `## Experience\n### \n- a` gives `{ok:false, reason:"schema"}` | Reject such a Master CV before calling the LLM (400 naming the heading), or treat an empty `### ` line as text | c0703d7 |
