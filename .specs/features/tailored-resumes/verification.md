# tailored-resumes verification

**Verdict**: PASS
**Proofs**: `proofs.md` at HEAD
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `test/unit/lib/markdown.test.ts` `turns a script tag into text and keeps the markdown around it` | yes |
| C2 | `test/unit/lib/markdown.test.ts` `leaves no element or attribute outside the allowlist` | yes |
| C3 | `test/unit/lib/markdown.test.ts` `keeps only http, https and mailto links` | yes |
| C4 | `test/unit/lib/markdown.test.ts` `renders headings, lists, emphasis, code and quotes` | yes |
| C5 | `test/integration/repositories/resume.repository.test.ts` `lists newest first` | yes |
| C6 | `test/integration/repositories/resume.repository.test.ts` `inserts, finds, updates and deletes a resume` | yes |
| C7 | `test/integration/repositories/resume.repository.test.ts` `stores null and array header fields` | yes |
| C8 | `test/integration/repositories/resume.repository.test.ts` `deletes a resume linked to a recruiter chat and nulls the link` | yes |
| C9 | `test/unit/services/resume.service.test.ts` `rejects an empty title or job description naming the field and creates nothing` | yes |
| C10 | `test/unit/services/resume.service.test.ts` `answers not found for an unknown or malformed id` | yes |
| C11 | `test/unit/services/resume.service.test.ts` `calls the llm with area tailor, the tailor prompt, the master cv, the job description and 4000 tokens` | yes |
| C12 | `test/unit/services/resume.service.test.ts` `saves the generated markdown and the model id` | yes |
| C13 | `test/unit/services/resume.service.test.ts` `keeps the content when the llm is unavailable` | yes |
| C14 | `test/unit/services/resume.service.test.ts` `refuses to generate with an empty master cv and does not call the llm` | yes |
| C15 | `test/unit/services/resume.service.test.ts` `sends no personal info value or full name to the model` | yes |
| C16 | `test/unit/services/resume.service.test.ts` `refuses to save content containing a personal info value` | yes |
| C17 | `test/unit/services/resume.service.test.ts` `stores null when every field is selected and drops unknown keys` | yes |
| C18 | `test/unit/services/resume.service.test.ts` `builds the print header from the selected fields in sort order` | yes |
| C19 | `test/unit/services/resume.service.test.ts` `skips a header field that no longer exists` | yes |
| C20 | `test/unit/services/resume.service.test.ts` `builds the download text with name, header lines and content` | yes |
| C21 | `test/unit/services/resume.service.test.ts` `slugs the title for the download filename` | yes |
| C22 | `test/unit/admin/resumes.test.tsx` `lists resumes newest first with links, company, model and date` | yes |
| C23 | `test/unit/admin/resumes.test.tsx` `shows the empty state` | yes |
| C24 | `test/unit/admin/resumes.test.tsx` `creates a resume and redirects with 303` | yes |
| C25 | `test/unit/admin/resumes.test.tsx` `answers 400 naming the empty field and creates nothing` | yes |
| C26 | `test/unit/admin/resumes.test.tsx` `deletes a resume and asks for confirmation` | yes |
| C27 | `test/unit/admin/resumes.test.tsx` `answers 404 on every id route for unknown or malformed ids` | yes |
| C28 | `test/unit/admin/resumes.test.tsx` `renders the editor with fields, checkboxes and buttons` | yes |
| C29 | `test/unit/admin/resumes.test.tsx` `generate returns the editor fragment with the new content` | yes |
| C30 | `test/unit/admin/resumes.test.tsx` `generate button has an indicator, is disabled while running and confirms replacement` | yes |
| C31 | `test/unit/admin/resumes.test.tsx` `generate answers 502 with the failure text and keeps the content` | yes |
| C32 | `test/unit/admin/resumes.test.tsx` `generate answers 400 with the master cv text` | yes |
| C33 | `test/unit/admin/resumes.test.tsx` `preview returns sanitized html` | yes |
| C34 | `test/unit/admin/resumes.test.tsx` `saves content and header fields and answers Saved` | yes |
| C35 | `test/unit/admin/resumes.test.tsx` `refuses to save content with a personal info value` | yes |
| C36 | `test/unit/admin/print.test.tsx` `prints the name, the selected header fields in order and the sanitized body` | yes |
| C37 | `test/unit/admin/print.test.tsx` `prints the master cv with all personal info fields` | yes |
| C38 | `test/unit/admin/print.test.tsx` `sends no-store and noindex and never calls the llm` | yes |
| C39 | `test/unit/admin/print.test.tsx` `sets the page size to A4 and to Letter with the override` | yes |
| C40 | `test/unit/admin/print.test.tsx` `uses no table, hides the print button in print and loads its script from self` | yes |
| C41 | `test/unit/admin/print.test.tsx` `warns on screen when the body contains a personal info value` | yes |
| C42 | `test/unit/admin/print.test.tsx` `shows This resume is empty for an empty content` | yes |
| C43 | `test/unit/admin/print.test.tsx` `downloads markdown with the attachment filename and header lines` | yes |
| C44 | `test/integration/routes/resumes.test.ts` `creates, generates, edits, prints, downloads and deletes on the real database` | yes |
| C45 | `test/integration/routes/resumes.test.ts` `deletes a resume linked to a recruiter chat` | yes |

## Findings

None - probed 27 own XSS payloads (script, img onerror, svg, iframe, style, details ontoggle, mXSS math/svg, entity/tab-obfuscated javascript:, data:, vbscript:, reference-style links, attribute-breakout hrefs and image alt, tables, code fences) against `renderMarkdown`: all escaped or stripped, hrefs limited to http/https/mailto and escaped. Tailor prompts asserted free of Personal Info values and full name in unit and real-DB tests (the PII-in-JD case is redacted). Admin CSP `script-src 'self'` is met: print script is served from `/admin/print/print.js`, page CSS is inline (`style-src 'unsafe-inline'`). `marked` is pinned at 16.4.1 with raw-HTML tokenizers disabled plus an allowlist pass.
