# Career Library verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 73273f3 (HEAD ba89001 adds docs and captures only)
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `test/unit/admin/career.test.tsx` `career cards > renders the cards in kind order` | yes |
| C2 | `captures/education-certifications-courses.running.png` `browser capture` | yes - spec/checks agree with the capture (rows 'org · dates', 'No expiry', counts); pixel judgment is screens.md's |
| C3 | `captures/skills-publications-honours.running.png` `browser capture` | yes - spec/checks agree with the capture; empty card with form open is a finding (F5) |
| C4 | `test/unit/admin/career.test.tsx` `career cards > shows the item count next to a card with items` | yes |
| C5 | `test/unit/admin/career.test.tsx` `career cards > shows nothing here yet and no badge for an empty kind` | yes |
| C6 | `test/unit/services/career/display.test.ts` `display > builds experience and project meta lines without empty parts` | yes |
| C7 | `test/unit/services/career/display.test.ts` `display > builds education certification and course meta lines` | yes |
| C8 | `test/unit/services/career/display.test.ts` `display > builds skill group language publication and honour meta lines` | yes |
| C9 | `test/unit/services/career/display.test.ts` `display > formats dates and ranges` | yes |
| C10 | `test/unit/services/career/display.test.ts` `display > ends current experience with present and current certification with no expiry` | yes |
| C11 | `test/unit/admin/profile-career.test.tsx` `admin profile career > add opens an empty form at the end of the card` | yes |
| C12 | `captures/project-form.running.png` `browser capture` | yes - form fields and labels match the capture; Tech stack is an approved difference (AD-011) |
| C13 | `test/unit/admin/career.test.tsx` `career cards item form > shows the kind fields and its ongoing label` | yes |
| C14 | `test/unit/services/career/form.test.ts` `career form > splits details into text and bullets and joins them back` | yes |
| C15 | `test/unit/services/career/form.test.ts` `career form > splits the tech stack on commas and joins it back` | yes |
| C16 | `test/integration/admin/profile.test.ts` `admin profile career routes > saves a new item and re-renders its card` | yes |
| C17 | `test/unit/admin/profile-career.test.tsx` `admin profile career > edit replaces the row with a filled form` | yes |
| C18 | `test/unit/admin/profile-career.test.tsx` `admin profile career > cancel shows the row unchanged` | yes |
| C19 | `test/unit/services/career/ops.test.ts` `career ops > moves an item past its neighbour of the same kind` | yes |
| C20 | `test/integration/admin/profile.test.ts` `admin profile career routes > stores a move and re-renders the card` | yes |
| C21 | `test/unit/admin/career.test.tsx` `career cards > disables move up on the first row and move down on the last` | yes |
| C22 | `test/unit/admin/profile-career.test.tsx` `admin profile career > delete asks delete this item and removes the item` | yes |
| C23 | `test/unit/admin/profile-career.test.tsx` `admin profile career > answers field is required and keeps the entered values` | yes |
| C24 | `test/unit/services/career/item.test.ts` `career item schema > requires the fields of each kind` | yes |
| C25 | `test/unit/services/career.service.test.ts` `career service > rejects an end date before the start date` | yes |
| C26 | `test/unit/services/career.service.test.ts` `career service > rejects personal info and the full name in item fields` | yes |
| C27 | `test/integration/admin/profile.test.ts` `admin profile routes > stores headline and summary` | yes |
| C28 | `test/unit/services/career/item.test.ts` `career item schema > rejects years and months out of range` | yes |
| C29 | `test/unit/services/career/item.test.ts` `career item schema > rejects a month without its year` | yes |
| C30 | `test/unit/services/career/item.test.ts` `career item schema > clears the end date of a current item` | yes |
| C31 | `test/unit/services/career.service.test.ts` `career service > rejects an item beyond 200` | yes |
| C32 | `test/unit/services/career/item.test.ts` `career item schema > rejects every field over its bound` | yes |
| C33 | `test/unit/services/career/ops.test.ts` `career ops > keeps the only item of a kind in place` | yes |
| C34 | `test/integration/repositories/career.repository.test.ts` `career repository > applies concurrent updates in sequence` | yes |
| C35 | `test/unit/admin/profile-career.test.tsx` `admin profile career > edit as markdown shows the rendered library` | yes |
| C36 | `test/unit/services/career/markdown.test.ts` `library markdown > renders the sample library in the convention` | yes |
| C37 | `test/unit/services/career.service.test.ts` `career service > save markdown replaces the library in markdown order without the llm` | yes |
| C38 | `test/unit/services/career/markdown.test.ts` `library markdown > round trips generated libraries` | no - the generator never makes an organisation that reads as a date; see F1 |
| C39 | `test/unit/services/career/markdown.test.ts` `library markdown > reuses ids by kind title and organisation` | yes |
| C40 | `test/unit/services/career/markdown.test.ts` `library markdown > reports the line of a convention error` | yes |
| C41 | `test/unit/services/career/markdown.test.ts` `library markdown > reports a field rule at the item line` | yes |
| C42 | `test/unit/admin/profile-career.test.tsx` `admin profile career > keeps the markdown text after a 400` | yes |
| C43 | `test/unit/admin/profile-career.test.tsx` `admin profile career > markdown cancel shows the cards unchanged` | yes |
| C44 | `test/unit/admin/profile-career.test.tsx` `admin profile career > import shows a textarea with convert and cancel` | yes |
| C45 | `test/unit/services/career.service.test.ts` `career service import > redacts personal info and the full name before the call` | yes |
| C46 | `test/unit/services/career.service.test.ts` `career service import > sends the data block to the import model and returns its markdown` | yes |
| C47 | `test/unit/services/career.service.test.ts` `career service import > stores nothing` | yes |
| C48 | `test/unit/services/career.service.test.ts` `career service import > rejects empty text` | yes |
| C49 | `test/unit/services/career.service.test.ts` `career service import > rejects text over 50000 characters` | yes |
| C50 | `test/unit/admin/profile-career.test.tsx` `admin profile career > import outage answers 503 and keeps the text` | yes |
| C51 | `test/unit/admin/settings.test.tsx` `admin settings > import model is shown and used by the next convert` | yes |
| C52 | `test/unit/services/settings.service.test.ts` `settings service > resolves the import model from override then config` | yes |
| C53 | `test/unit/llm/import-prompt.test.ts` `import prompt > example parses with the library parser` | yes |
| C54 | `test/unit/services/career/body.test.ts` `career body > renders headline summary and items in section order` | yes |
| C55 | `test/unit/services/public-chat.service.test.ts` `public chat service > sends the career body rendered from the library` | yes |
| C56 | `test/unit/services/public-chat.service.test.ts` `public chat service > sends the empty cv body when the library is empty` | yes |
| C57 | `test/unit/services/career.service.test.ts` `career service > keeps personal info and the full name out of the career body` | yes - proves the write guard, not the render; a value added to Personal Info later is stopped only by the llm PII guard (see F4) |
| C58 | `test/unit/services/tailor/document.test.ts` `resume document v2 > accepts the v2 shape and rejects v1` | yes |
| C59 | `test/unit/services/resume.service.test.ts` `resume service v2 generate > sends annotated items and no personal header` | yes |
| C60 | `test/unit/services/tailor/assemble.test.ts` `assemble v2 > copies typed fields from the library and bodies from the model` | yes |
| C61 | `test/unit/services/tailor/assemble.test.ts` `assemble v2 > sets source id to the library item id` | yes |
| C62 | `test/unit/services/tailor/assemble.test.ts` `assemble v2 > restores omitted experience and education after the model items` | yes - one restored item per kind; my 2-omitted probe passed |
| C63 | `test/unit/admin/resumes.test.tsx` `admin resumes > generate answers 503 after one retry when the model names an unknown id twice` | yes - asserts 503 after two bad replies (F2 fixed) |
| C64 | `test/unit/services/resume.service.test.ts` `resume service v2 generate > rejects an empty library before calling the llm` | yes |
| C65 | `captures/header-experience.running.png` `browser capture` | yes - Header card (name, headline, summary on expand) and cards match the capture; AD-012 approved |
| C66 | `test/integration/routes/resumes.test.ts` `admin resumes career routes > edits the resume copy and leaves the library unchanged` | yes - route covers edit, move, delete; add is held by the unit sibling (F4) |
| C67 | `test/unit/services/resume.service.test.ts` `resume service items > adds an item with a null source id` | yes |
| C68 | `test/unit/services/resume.service.test.ts` `resume service items > keeps a tailored item whose library item was deleted` | yes |
| C69 | `test/unit/services/resume.service.test.ts` `resume service v2 print > renders print and download with the career body` | yes - expected value built by the same renderer (F4) |
| C70 | `test/unit/services/recruiter-chat.service.test.ts` `recruiter chat service > sends the resume career body or the library body` | no - asserts only the library branch; the resume branch sits in a sibling test (F3) |
| C71 | `test/unit/services/resume.service.test.ts` `resume service v2 get > treats an invalid document as not generated and logs it` | yes |
| C72 | `test/integration/db/career-migration.test.ts` `career migration > creates the singleton library and the profile summary` | yes |
| C73 | `test/integration/db/career-migration.test.ts` `career migration > drops the master cv and discards v1 documents keeping rows` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 Markdown round trip breaks when an organisation reads as a date | Probe at HEAD: a publication or honour with organisation `2019` or `Mar 2019` and no dates renders `*2019*`; the parser reads it back as startYear 2019 and organisation empty, with a new id. C38's generator (`markdown.test.ts` WORDS) never makes such a value, so the 220 runs stay green. Markdown AC 4 says any valid library | reject an organisation that parses as a date (schema message), or escape it on render; add one to the C38 generator | 7d20974 - C38 (`round trips generated libraries` now draws date-like organisations, asserts each is rejected with "cannot read as a date", and the rest round trip) and `career item schema > rejects an organisation or location that reads as a date` |
| F2 Tailored AC 6 says 503, test and code say 502 | `resume.service.test.ts` `retries once then fails leaving the document unchanged` asserts `status: 502`; `LlmUnavailableError.status` is 502 and `src/admin/resumes/routes.ts:118` answers 502; spec AC 6 and Import AC 7 say 503 (Import does answer 503) | decide one status: amend the spec to 502, or answer 503 for Generate, then assert it in C63 | d9ca09d - route answers 503; C63 re-pointed to `admin resumes > generate answers 503 after one retry when the model names an unknown id twice` (asserts 503, two model calls, document unchanged) |
| F3 C70's test does not hold the resume branch | `recruiter-chat.service.test.ts:171` builds two chats whose resume is empty or absent and asserts only `### Backend Engineer` (library); a regression that ignored the linked document would pass | assert the linked resume's body in this test, or re-point C70 to `sends the linked resume document rendered as markdown` | 4c546ef - C70 (`sends the resume career body or the library body` now also asserts the linked resume body and no library body) |
| F4 Several assertions are looser than their criterion | C57 asserts the write guard, not that a rendered body is free of values added to Personal Info later; C69 builds the expected text with the renderer under test; C66's route test has no add (unit sibling has it); C62 restores one item per kind; C10 asserts `dateRange`, not the rendered row | add a render-time assertion for C57, a literal expected body for C69, an add call in C66, two omitted experiences in C62 (probe passed) | 6668f62 C57 (render after later Personal Info, unchanged body), 4029fb5 C69 (literal expected body), 1f766cb C66 (add call), 58d1ac3 C62 (two omitted experiences), 87cac6f C10 (rendered meta lines) |
| F5 Library AC 3 vs capture: empty card with the form open | `project-form.png` shows an empty Projects card with the form open and no 'Nothing here yet.'; `view.tsx:210` hides it while adding (matches the capture), but AC 3 says WHILE a kind has no item it SHALL show it and no check holds either behaviour | amend AC 3 to 'unless the form is open' and add a view test for the empty card with the form open | 6f37048 - C5 (`shows nothing here yet and no badge for an empty kind` now holds the empty Projects card with its form open); spec AC 3 and C5 amended in the docs(specs) commit |

Own examples run at HEAD and deleted: F1 (fails), restore order of two omitted experiences (passes), 201 items by markdown reaches the 200 bound message (passes), same-year month and year end-before-start via markdown (passes), language level holding `*` and ` · ` and text with a blank line and a `- ` bullet round trip (pass).
