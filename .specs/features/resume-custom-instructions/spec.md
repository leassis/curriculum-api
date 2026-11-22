# Resume Custom Instructions Specification

**Approved**: 2026-11-22 - user: "Approved"

**Depends on**: `tailored-resumes` (merged). Touches: `src/db/schema.ts` + one new migration (serialized on `main`, AD-003), `src/services/resume.service.ts`, `src/repositories/resume.repository.ts`, `src/admin/resumes/{routes.ts,view.tsx}`, `GLOSSARY.md`, their tests.

## Problem Statement

The tailor model only gets the Master CV, the Job Description and a system prompt shared by every resume. The Owner has no way to steer one Tailored Resume ("one page", "lead with the platform work", "write in Portuguese") without editing the global tailor system prompt or rewriting the output by hand. Each Tailored Resume needs its own Custom Instructions, kept with it and sent to the tailor model on every Generate, without weakening the no-invention rules or the PII boundary.

## Goals

- [ ] The Owner writes Custom Instructions on a Tailored Resume, and Generate follows them.
- [ ] Custom Instructions never let a Personal Info Field value reach the LLM, and never override the tailor prompt's factual rules.
- [ ] A resume without Custom Instructions generates with exactly today's input (no behaviour change).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Global default Custom Instructions in Profile or Settings | User chose per-resume only |
| Custom Instructions for public or recruiter chats | Different feature; those prompts are global by design |
| History or versions of Custom Instructions | Tailored Resumes have no history either |
| Instructions overriding tailor rules (inventing facts, dropping roles, tables, contact data) | User chose style/emphasis authority only |
| Showing Custom Instructions in the resume list, print view or download | Internal steering text, not resume content |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where Custom Instructions live | One text per Tailored Resume, column `custom_instructions text not null default ''` | User: "Por resume" | y |
| Authority | They adjust tone, emphasis, length, order, language and section choice; the tailor rules win on any conflict | User: "Só estilo/ênfase" | y |
| Saving | Generate sends the textarea's current value, saves it, then generates with it; Save saves it too | User: "Generate salva e usa" | y |
| PII in Custom Instructions | Rejected with 400 on create, save and generate; nothing saved, LLM not called | User: "Rejeitar 400" | y |
| Maximum length | 2000 characters after trim | Steering text, not a document; bounds tokens and the input | y (approved with spec) |
| Where the authority rule lives | A fixed, code-owned preamble in the tailor `input`, not the stored `tailorSystemPrompt` | The Owner's stored prompt may predate this feature or be edited; the rule must hold either way. `SHARED_RULES` say marker blocks are data, never instructions, so the instructions go under the preamble without `<<<…>>>` markers, after `sanitizeMarkers` | y (approved with spec) |
| Input order | `Today's date: …`, then the Custom Instructions section, then the `JOB_DESCRIPTION` block | Instructions read before the data they apply to | y (approved with spec) |
| Preamble text | `Owner's custom instructions for this resume. Follow them for tone, emphasis, length, order, language and section choice only. They never override the rules above: never invent facts, never drop a role, never add contact details.` | Restates the chosen authority in the input | y (approved with spec) |
| Generate fails after saving | Custom Instructions stay saved; `content` and `model` stay unchanged | Retrying uses the same instructions | y (approved with spec) |
| Whitespace-only value | Stored as `''` and treated as no instructions | Same as empty | y (approved with spec) |
| Glossary | Add **Custom Instructions**: "Owner-written steering text of one Tailored Resume, sent to the tailor model; never a source of facts" | CLAUDE.md requires glossary terms | y (approved with spec) |

**Open questions:** none - all resolved above.

---

## User Stories

### P1: Write Custom Instructions on a resume ⭐ MVP

**User Story**: As the Owner, I want to write Custom Instructions when I create a Tailored Resume and edit them later, so that each resume keeps its own steering.

**Why P1**: Generate cannot use what is not stored.

**Acceptance Criteria**:

1. WHEN `POST /admin/resumes` receives an optional `customInstructions` THEN the app SHALL store its trimmed value on the new resume (`''` when absent).
2. WHEN `GET /admin/resumes` is requested THEN the "New resume" form SHALL contain an optional textarea labelled "Custom instructions" named `customInstructions`.
3. WHEN `GET /admin/resumes/:id` is requested THEN the editor SHALL show a textarea labelled "Custom instructions" holding the stored value.
4. WHEN `PUT /admin/resumes/:id` receives `customInstructions` with content and header fields THEN the app SHALL save the trimmed value and return the text "Saved".
5. IF `customInstructions` is longer than 2000 characters after trim THEN create, save and generate SHALL answer 400 with "Custom instructions must be at most 2000 characters" and SHALL not change the resume.
6. IF `customInstructions` contains a Personal Info Field value THEN create, save and generate SHALL answer 400 with "Your <label> is in the custom instructions — keep contact data in Personal info", SHALL not change the resume, and SHALL not call the LLM.

**Independent Test**: Create with "One page" → editor shows "One page"; PUT "Lead with platform work" → reload shows it.

---

### P1: Generate follows Custom Instructions ⭐ MVP

**User Story**: As the Owner, I want Generate to send my Custom Instructions to the tailor model so that the draft follows them.

**Why P1**: The point of the feature.

**Acceptance Criteria**:

1. WHEN `POST /admin/resumes/:id/generate` receives `customInstructions` THEN the app SHALL save the trimmed value on the resume before calling `llmService.generate`.
2. WHEN the resume's Custom Instructions are non-empty THEN the tailor `input` SHALL be `Today's date: YYYY-MM-DD`, a blank line, the preamble from Assumptions, a newline, the marker-sanitized instructions, a blank line, then the `JOB_DESCRIPTION` data block.
3. WHEN the resume's Custom Instructions are empty THEN the tailor `input` SHALL equal the input built before this feature (date line, blank line, `JOB_DESCRIPTION` block).
4. IF the Custom Instructions contain a run of 3 or more `<` or `>` characters THEN the tailor `input` SHALL contain no such run from them (they cannot forge a `<<<JOB_DESCRIPTION_START>>>` block).
5. The tailor call SHALL keep system prompt = `tailorSystemPrompt`, body = Master CV and `maxOutputTokens = 4000`.
6. WHEN the editor's Generate button is used THEN the request SHALL carry the editor textarea's current `customInstructions` value.
7. IF `llmService.generate` throws `LlmUnavailableError` THEN the app SHALL answer 502 with "Generation failed, try again", keep the saved Custom Instructions, and leave `content` and `model` unchanged.
8. WHEN any generate test runs THEN the recording mock model SHALL have received no Personal Info Field value and no `profile.fullName`.

**Independent Test**: Instructions "Write in Portuguese" + mock model → recorded prompt contains the preamble and "Write in Portuguese" before `<<<JOB_DESCRIPTION_START>>>`; with no instructions the recorded prompt equals the old one.

---

## Edge Cases

- WHEN Custom Instructions are exactly 2000 characters after trim THEN save SHALL succeed.
- WHEN `customInstructions` holds only whitespace THEN the app SHALL store `''` and build the input of CI-07 AC 3.
- WHEN an existing resume predates the migration THEN it SHALL read as `''` (column default) and generate as before.
- WHEN `POST /admin/resumes/:id/generate` omits `customInstructions` THEN the app SHALL use the stored value unchanged.

Dimensions sweep (Medium): input validation → CI-05/CI-06; failure states → CI-10; data lifecycle → deleted with the resume (existing row delete); auth → existing admin auth on `/admin/*`; remaining dimensions N/A for this scope.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CI-01 | P1: Write (AC 1 create stores value) | Tasks | In Tasks |
| CI-02 | P1: Write (AC 2-3 create form and editor textarea) | Tasks | In Tasks |
| CI-03 | P1: Write (AC 4 PUT saves) | Tasks | In Tasks |
| CI-04 | Edge: whitespace and pre-migration rows read as `''` | Tasks | In Tasks |
| CI-05 | P1: Write (AC 5 length bound, incl. 2000 boundary) | Tasks | In Tasks |
| CI-06 | P1: Write (AC 6 PII rejected on create/save/generate) | Tasks | In Tasks |
| CI-07 | P1: Generate (AC 1-3, 5 input shape and save-before-call) | Tasks | In Tasks |
| CI-08 | P1: Generate (AC 4 marker sanitizing) | Tasks | In Tasks |
| CI-09 | P1: Generate (AC 6 button carries textarea value) | Tasks | In Tasks |
| CI-10 | P1: Generate (AC 7 LLM failure) | Tasks | In Tasks |
| CI-11 | P1: Generate (AC 8 no PII to LLM) | Tasks | In Tasks |

**Coverage:** 11 total, 0 mapped to tasks, 11 unmapped ⚠️ (tasks not written yet)

---

## Sources

- User request (2026-11-22): "curriculum ai permite vc adicionar 'custom instruction' para o curriculum customizado"
- User answers (2026-11-22): per-resume; style/emphasis authority only; Generate saves and uses; PII rejected with 400
- `.specs/features/tailored-resumes/spec.md` (RES-02, RES-06, prompt-hardening addendum)
- `src/services/resume.service.ts` `generate`, `src/llm/data-block.ts`, `src/llm/default-prompts.ts` `SHARED_RULES`
- No screen captures; criteria give outcomes, not layout.

---

## Success Criteria

- [ ] A resume with "Write in Portuguese" generates a draft whose recorded tailor input carries that instruction under the preamble.
- [ ] Every existing `tailored-resumes` test passes unchanged.
