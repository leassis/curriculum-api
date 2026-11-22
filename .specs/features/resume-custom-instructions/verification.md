# Resume Custom Instructions verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 16210f5
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `resume.service.test.ts` `stores the trimmed custom instructions on create and empty when absent` | yes - trim and `''` asserted on returned and stored row |
| C2 | `admin/resumes.test.tsx` `create stores the posted custom instructions` | yes - padded value trimmed, absent gives `''` |
| C3 | `admin/resumes.test.tsx` `new resume form has an optional custom instructions textarea` | yes |
| C20 | `admin/resumes.test.tsx` `editor shows the stored custom instructions` | yes - also proves HTML escaping |
| C4 | `resume.service.test.ts` `saves the trimmed custom instructions with content and header fields` | yes |
| C16 | `admin/resumes.test.tsx` `put saves custom instructions and answers Saved` | yes - also proves absent field keeps value |
| C5 | `resume.service.test.ts` `stores whitespace-only custom instructions as empty` | yes - create and save |
| C22 | `resume.repository.test.ts` `reads custom instructions as empty by default` | yes - raw insert without the field |
| C23 | `resume.repository.test.ts` `stores and updates custom instructions` | yes - insert, replace, keep |
| C6 | `resume.service.test.ts` `accepts 2000 characters and rejects 2001 on create, save and generate without changes` | yes - both sides of the bound, trim, no mutation, no LLM call |
| C7 | `resume.service.test.ts` `rejects a personal info value on create, save and generate without calling the llm` | yes - exact message, state and `calls` asserted |
| C8 | `admin/resumes.test.tsx` `answers 400 with the length and personal info messages` | yes - create, put, generate |
| C9 | `resume.service.test.ts` `saves the custom instructions before calling the llm` | yes - reads the repo from inside the model call |
| C10 | `resume.service.test.ts` `puts the preamble and instructions between the date and the job description` | yes - exact string via `tailorInput`; the end-to-end part checks order only, so a wrong separator in `generate` would pass |
| C11 | `resume.service.test.ts` `builds the pre-feature input when there are no instructions` | yes for `tailorInput`; the `generate` leg is only `toContain`/`not.toContain` |
| C12 | `resume.service.test.ts` `strips marker runs from the instructions` | yes - forged markers; an own 5-char and mixed `<>` run also passed |
| C13 | `resume.service.test.ts` `keeps the tailor prompt, master cv and token limit` | yes, loose - CV is `toContain` on the prompt, not on the body slot |
| C21 | `admin/resumes.test.tsx` `generate button includes the custom instructions textarea` | yes - attribute on the button and a single id |
| C14 | `resume.service.test.ts` `keeps the instructions saved and the content unchanged when the llm is unavailable` | yes - `content` and `model` asserted |
| C15 | `resume.service.test.ts` `sends no personal info value or full name to the model with custom instructions` | yes |
| C17 | `resume.service.test.ts` `uses the stored instructions when generate receives none` | yes |
| C18 | `admin/resumes.test.tsx` `generate saves the posted custom instructions` | yes - posted, then omitted |
| C19 | `routes/resumes.test.ts` `generates with custom instructions on the real database` | yes |

## Findings

None - probed instructions already stored when a Personal Info Field is added later (the prompt still reached the model without the value, so the LLM-level PII Guard catches it) and a run of mixed and 5-character `<>` (all stripped, 2-character runs kept). Observations, not findings: C10, C11 and C13 prove the `generate` leg with `toContain` and ordering only (exact shape is held by `tailorInput`), so a wrong separator inside `generate` could pass; the route layer has no 2000-boundary test (service has it).
