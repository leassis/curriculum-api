# Resume Create Flow Specification

**Approved**: 2026-11-23 - user: "Approved"

**Depends on**: `tailored-resumes`, `resume-custom-instructions` (merged). Touches: `src/admin/resumes/{routes.ts,view.tsx}`, `src/services/resume.service.ts`, their tests.

## Problem Statement

Creating a Tailored Resume takes two screens. The "New resume" form collects Title, Company, Job Description and Custom Instructions; submitting it opens the editor empty, where the only new input is the Personal header checkboxes, followed by a click on Generate. The second screen adds no decision the first could not hold, and the Owner waits on an empty editor before the real work starts.

## Goals

- [ ] The Owner creates a Tailored Resume and gets a generated draft in the editor from one form and one submit.
- [ ] The Personal header is chosen on the same form.
- [ ] A failed generation never loses what the Owner typed.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Separate "Create only" button | User: one flow, no extra control |
| Own page `/admin/resumes/new` | User: the second screen adds nothing |
| Remembering the last Personal header choice | User chose all checked as default |
| Changes to the editor (Generate, Save, Print, preview) | Editor stays as is for review and edits |
| Streaming or background generation | Request stays synchronous like Generate today |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| What Create does | Saves the resume, then generates, then opens the editor | User: no need for a second screen or more control | y |
| Generation failure | Resume stays saved, editor opens empty with the error in its status line | User: "take both recommendations" | y |
| Personal header default | All Personal Info Fields checked, stored as `headerFields = null` (same as editor today) | User: "take both recommendations" | y |
| Form placement | Stays at the bottom of `/admin/resumes` | Minimal change; no new screen | y |
| Error carried to the editor | Query parameter `?error=generate` on the redirect; the editor shows the fixed text, no user data in the URL | Redirect has no other channel; a fixed code avoids reflecting text | y |
| Validation failures on create (empty title or Job Description, PII, length) | Unchanged: 400, nothing saved | Existing behaviour | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Create and generate in one step ⭐ MVP

**User Story**: As the Owner, I want to fill one form and land on a generated draft, so that I never sit on an empty editor.

**Why P1**: The whole feature.

**Acceptance Criteria**:

1. WHEN `GET /admin/resumes` is requested THEN the "New resume" form SHALL contain, besides its existing fields, a "Personal header" fieldset with one checkbox per Personal Info Field, labelled as in the editor, all checked.
2. WHEN the Owner submits the form with valid fields THEN the app SHALL create the resume, generate its content with the same input as `POST /admin/resumes/:id/generate`, and redirect 303 to `/admin/resumes/:id`.
3. WHEN the redirect after a successful create is followed THEN the editor SHALL show the generated content in the Markdown field and the preview.
4. WHEN the form is submitted with some Personal header boxes unchecked THEN the app SHALL store exactly the checked keys as the resume's `headerFields`.
5. WHEN all Personal header boxes are checked THEN the app SHALL store `headerFields = null`.
6. WHILE the create request is running the form's Create button SHALL be disabled and the text "Generating…" SHALL be shown.
7. IF title or Job Description is empty, Custom Instructions exceed 2000 characters, or a Personal Info Field value is in the Custom Instructions THEN the app SHALL answer 400 with the existing message, SHALL store no resume, and SHALL not call the LLM.

**Independent Test**: Fill the form with the mock model, submit, follow the redirect: the editor holds the mock text, header boxes as chosen.

---

### P1: Failed generation keeps the resume ⭐ MVP

**User Story**: As the Owner, I want my input kept when generation fails, so that I retry instead of retyping.

**Why P1**: The one step must not lose work.

**Acceptance Criteria**:

1. IF generation throws `LlmUnavailableError` during create THEN the app SHALL keep the created resume (inputs and `headerFields` stored, `content` empty, `model` null) and redirect 303 to `/admin/resumes/:id?error=generate`.
2. IF the Master CV is empty during create THEN the app SHALL keep the created resume and redirect 303 to `/admin/resumes/:id?error=master-cv`.
3. WHEN the editor is requested with `?error=generate` THEN it SHALL show "Generation failed, try again" in its status line.
4. WHEN the editor is requested with `?error=master-cv` THEN it SHALL show "Fill the master CV first" in its status line.
5. WHEN the editor is requested with any other `error` value THEN it SHALL show no error text.
6. WHEN Generate is used on the opened editor after a failure THEN it SHALL work as it does today.

**Independent Test**: Mock model throws `LlmUnavailableError`; submit; editor opens empty with the message, and the resume appears in the list.

---

## Edge Cases

- WHEN the Owner has no Personal Info Fields THEN the "Personal header" fieldset SHALL be omitted and create SHALL store `headerFields = null`.
- IF a posted header key matches no Personal Info Field THEN the app SHALL ignore it (same rule as Save).
- WHEN every box is unchecked THEN the app SHALL store `headerFields = []` (no header), same as Save today.
- WHEN any create test runs THEN the recording mock model SHALL have received no Personal Info Field value and no `profile.fullName`.

Dimensions sweep (Medium): input validation → P1 AC 7; failure states → story 2; external-dependency failure → story 2 AC 1; idempotency → a double submit is blocked by the disabled button (P1 AC 6), no server dedup (same as today's create); auth → existing admin auth on `/admin/*`; remaining dimensions N/A for this scope.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RCF-01 | P1: Create (AC 1, edge: no fields) form shows header fieldset | Specify | Pending |
| RCF-02 | P1: Create (AC 2-3) create then generate, editor shows draft | Specify | Pending |
| RCF-03 | P1: Create (AC 4-5, edge: unknown keys, all unchecked) header stored | Specify | Pending |
| RCF-04 | P1: Create (AC 6) busy state | Specify | Pending |
| RCF-05 | P1: Create (AC 7) validation unchanged | Specify | Pending |
| RCF-06 | P1: Failure (AC 1-2) resume kept, redirect with code | Specify | Pending |
| RCF-07 | P1: Failure (AC 3-5) editor shows fixed error text | Specify | Pending |
| RCF-08 | P1: Failure (AC 6) retry via Generate | Specify | Pending |
| RCF-09 | Edge: no PII to the LLM on create | Specify | Pending |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️ (tasks not written yet)

---

## Sources

- User request (2026-11-23): "when I want to create a resume I fill up new resume, when I click i go again to a new page and the only one information I add is the personal header. it does not make sense to have 2 screen"
- User answers (2026-11-23): one form, one submit, no extra control or screen; on failure keep the resume and open the editor with the error; header default all checked
- `.specs/features/tailored-resumes/spec.md`, `.specs/features/resume-custom-instructions/spec.md`
- `src/admin/resumes/{routes.ts,view.tsx}`, `src/services/resume.service.ts` `create`, `generate`, `save`
- No screen captures; criteria give outcomes, not layout.

---

## Success Criteria

- [ ] Creating a resume takes one form and one submit, and ends on an editor holding the draft.
- [ ] Every existing `tailored-resumes` and `resume-custom-instructions` test passes unchanged, except `admin resumes > creates a resume and redirects with 303`, which asserts the old redirect and is updated to the new one.
