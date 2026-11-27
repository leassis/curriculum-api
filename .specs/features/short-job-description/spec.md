# Short Job Description Specification

**Approved**: 2026-11-27 - user: "Aprovo as duas"

**Depends on**: `tailored-resumes`, `honest-assessment`, `recruiter-chat` merged. Schema change ships as its own migration on `main`.

## Problem Statement

A pasted Job Description is often long and padded with company marketing, benefits, EEO text and application instructions. A Recruiter Chat accepts at most 2000 characters of Job Description, and the recruiter prompt ("relate the answers to it, and say plainly where the CV does not cover a requirement") only works when the requirements are explicit. Today the Owner writes that short text by hand for every chat.

## Goals

- [ ] Every successful tailoring stores a Short Job Description of at most 2000 characters next to the Tailored Resume, made in the same model call.
- [ ] Picking a Tailored Resume in the New chat form fills the Job Description field without ever overwriting text the Owner typed.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Backfilling existing Tailored Resumes | Q9: a resume gets its Short Job Description on its next generation |
| A separate model call for the summary | Q2: same tailor call, one new output field |
| Changing the editable `tailorSystemPrompt` | Q3: the instruction lives in code, so stored prompts get it without a reset |
| Using the Short Job Description as tailoring input | Q1: the full Job Description stays the tailor input |
| Printing or downloading the Short Job Description | Q25: admin only |
| Updating chats already created when the resume changes | Q14: a chat keeps a snapshot; editing a chat is `recruiter-chat-edit` |
| Editing an existing Recruiter Chat | Feature `recruiter-chat-edit`, delivered after this one (Q19) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where the instruction lives | `TailorOutputSchema` field description plus a code-owned rule block appended to the system prompt, like `TAILOR_ASSESSMENT_RULES` | Q3 | y |
| Length target and cap | Target ~1500-2000 characters; hard cap 2000 = `MAX_JOB_DESCRIPTION_CHARS` | Q4 | y |
| Over the cap | Code truncates: cut at the last line break or sentence end (`.`, `!`, `?`) at or before character 2000; with none, cut at 2000. Characters counted as code points, like the chat validation | Q5 chose truncation; the cut point is a code-settled default | y |
| Content kept | Role and seniority, company and area, location/remote/time zone, required qualifications (one atomic requirement per bullet), nice-to-haves (separate), main responsibilities (short) | Q6, Q11 | y |
| Content dropped | Company marketing, benefits, EEO/diversity statements, application instructions, repetition, contact details, people's names, URLs | Q6, Q12 | y |
| Format and language | Plain text, short sections with `- ` bullets, same language as the Job Description | Q7 | y |
| Blank model output | A blank (whitespace-only) value is stored as NULL and does not fail the generation | Code-settled default: an auxiliary field never discards a resume (spirit of Q5) | y |
| Storage | New nullable column `tailored_resumes.job_description_short`, NULL until the first successful generation | Q8 | y |
| Regeneration | Each successful generation overwrites the stored value, Owner edits included | Q16 | y |
| Failed generation | The stored value is unchanged | Same as the Resume Document and assessment today | y |
| Owner edit in the resume editor | Textarea "Short Job Description (max 2000 characters)" right below the Job Description, saved by "Save options"; blank saves NULL; over 2000 → 400 validation error | Q10, Q25 | y |
| PII check on the field | None, same as the chat's `jobDescriptionShort` today | The Job Description is not Personal Info; the chat already sends it as a data block | y |
| Autofill trigger | Changing the Resume select of the New chat form; "Master CV" fills nothing and shows no notice | Q13 | y |
| Autofill rule | A field is filled when it is empty or still holds the value the last autofill put there; otherwise it is left as is and a notice appears | Q13 | y |
| Where the autofill rule runs | On the server (an HTMX request carries the current field values and the last autofilled values), so unit tests reach it | Execution contract rule 6 | y |
| Company autofill | Same rule and notices for the Company field, from `tailored_resumes.company` | Q17 | y |
| Notice texts | Field kept: "Not filled: the field has your own text." plus a "Replace" button; resume without a Short Job Description: "This resume has no short description yet. Regenerate it to get one." | Q18 | y |
| Chat stores | A copy at creation time in `recruiter_chats.job_description_short` | Q14 | y |
| Domain term | GLOSSARY gets **Short Job Description**; code keeps `jobDescriptionShort` / `job_description_short` | Q24 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Tailoring returns a Short Job Description ⭐ MVP

**User Story**: As the Owner, I want each tailoring to also return a short, requirement-focused version of the Job Description so that I do not have to write one for every Recruiter Chat.

**Why P1**: It is the data every other story uses.

**Acceptance Criteria**:

1. The system SHALL request a `job_description_short` string from the tailor model in the same structured-output call that returns the resume and assessment.
2. The system SHALL instruct the tailor model, in code-owned text that does not depend on the stored `tailorSystemPrompt`, to keep role and seniority, company and area, location/remote/time zone, required qualifications as one atomic requirement per bullet, nice-to-haves in a separate section, and short main responsibilities.
3. The system SHALL instruct the tailor model to drop company marketing, benefits, EEO and diversity statements, application instructions, repetition, contact details, people's names and URLs.
4. The system SHALL instruct the tailor model to write plain text with `- ` bullets, in the language of the Job Description, of at most 2000 characters.
5. WHEN a generation succeeds THEN the system SHALL store the returned Short Job Description in `tailored_resumes.job_description_short`, replacing any earlier value.
6. IF the returned Short Job Description is longer than 2000 code points THEN the system SHALL store it cut at the last line break or sentence end at or before code point 2000, or at code point 2000 when there is none, and SHALL not fail the generation.
7. IF the returned Short Job Description is blank THEN the system SHALL store NULL and SHALL not fail the generation.
8. IF a generation fails THEN the system SHALL leave the stored Short Job Description unchanged.
9. The system SHALL keep `tailored_resumes.job_description_short` NULL for a resume that has never been generated successfully.

**Independent Test**: With the mock model returning a short of 2100 characters, generate a resume and read back a stored value of at most 2000 characters ending at a line or sentence boundary.

---

### P1: Owner reviews and edits it in the resume editor ⭐ MVP

**User Story**: As the Owner, I want to see and correct the Short Job Description on the resume page so that the chat gets the text I agree with.

**Why P1**: Model output must be reviewable before it reaches a recruiter.

**Acceptance Criteria**:

1. WHEN the Owner opens a Tailored Resume THEN the system SHALL show a textarea labelled "Short Job Description (max 2000 characters)" holding the stored value, empty when NULL, right after the Job Description.
2. WHEN the Owner uses "Save options" THEN the system SHALL store the textarea's trimmed value as the Short Job Description, and NULL when it is blank.
3. IF the Owner saves a Short Job Description longer than 2000 code points THEN the system SHALL answer 400 with a message naming the 2000-character limit and SHALL keep the stored value.
4. The system SHALL not include the Short Job Description in the resume's print page or `.md` download.

**Independent Test**: Open a generated resume, change the textarea, save, reload, see the new text; save 2001 characters and see the error.

---

### P1: New chat form fills from the chosen resume ⭐ MVP

**User Story**: As the Owner, I want picking a Tailored Resume in the New chat form to fill the Job Description and Company fields so that the chat gets the short, relevant text without copy-paste.

**Why P1**: This is the reason for the feature (Q1).

**Acceptance Criteria**:

1. WHEN the Owner picks a Tailored Resume in the Resume select WHILE the Job Description field is empty THEN the system SHALL fill the field with that resume's Short Job Description.
2. WHEN the Owner picks a Tailored Resume WHILE the Job Description field still holds the value the last autofill put there THEN the system SHALL replace it with the new resume's Short Job Description.
3. IF the Owner picks a Tailored Resume WHILE the Job Description field holds other text THEN the system SHALL keep that text and SHALL show "Not filled: the field has your own text." with a "Replace" button below the field.
4. WHEN the Owner uses "Replace" THEN the system SHALL put the chosen resume's Short Job Description in the field and SHALL remove the notice.
5. IF the Owner picks a Tailored Resume whose Short Job Description is NULL THEN the system SHALL leave the Job Description field as it is and SHALL show "This resume has no short description yet. Regenerate it to get one." below the field.
6. WHEN the Owner picks a Tailored Resume THEN the system SHALL apply criteria 1-5 to the Company field with that resume's company, with "Not filled: the field has your own text." and "Replace" as the kept-field notice, and no notice when the resume has no company.
7. WHEN the Owner picks "Master CV" THEN the system SHALL leave both fields as they are and SHALL remove any autofill notice.
8. The system SHALL announce autofill notices through an `aria-live="polite"` region.
9. WHEN the Owner creates the chat THEN the system SHALL store the Job Description field's current text in `recruiter_chats.job_description_short`, unaffected by later changes to the resume.

**Independent Test**: In the New chat form, pick resume A (field fills), pick resume B (field replaces), type in the field, pick A (notice + Replace), use Replace (field fills, notice gone).

---

## Edge Cases

- IF the Owner types and then clears the Job Description field THEN the system SHALL treat it as empty and fill it on the next pick.
- IF the chosen resume no longer exists when the autofill request runs THEN the system SHALL leave both fields as they are and SHALL show "Tailored Resume not found" below the Job Description field.
- WHEN the stored Short Job Description is exactly 2000 code points THEN the system SHALL store it whole.
- IF the autofill request fails THEN the system SHALL leave both fields as they are and SHALL show the failure in the form's status line, as the chats page does for other failed requests.

---

## Dimensions sweep

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | SJD-06, SJD-07, SJD-12 |
| Failure / partial-failure states | SJD-08, edge cases |
| Idempotency / retry | Each successful generation overwrites (SJD-05); retries are the existing `TAILOR_ATTEMPTS` loop |
| Auth boundaries & rate limits | N/A because every new route sits under the existing admin session middleware |
| Concurrency / ordering | N/A because the Owner is the only writer; last save wins, as for other resume options |
| Data lifecycle / expiry | Column dies with the resume row; a chat keeps its own copy (SJD-22) |
| Observability | N/A because truncation is a normal outcome; existing tailor logging is unchanged |
| External-dependency failure | SJD-08: model failure keeps the old value |
| State-transition integrity | N/A because the field has no states beyond NULL/value |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SJD-01 | P1: Tailoring - same call | Tasks | Pending |
| SJD-02 | P1: Tailoring - content kept | Tasks | Pending |
| SJD-03 | P1: Tailoring - content dropped | Tasks | Pending |
| SJD-04 | P1: Tailoring - format, language, cap | Tasks | Pending |
| SJD-05 | P1: Tailoring - stored on success | Tasks | Pending |
| SJD-06 | P1: Tailoring - truncation | Tasks | Pending |
| SJD-07 | P1: Tailoring - blank → NULL | Tasks | Pending |
| SJD-08 | P1: Tailoring - failure keeps value | Tasks | Pending |
| SJD-09 | P1: Tailoring - NULL before first generation | Tasks | Pending |
| SJD-10 | P1: Editor - textarea shown | Tasks | Pending |
| SJD-11 | P1: Editor - save | Tasks | Pending |
| SJD-12 | P1: Editor - over-limit rejected | Tasks | Pending |
| SJD-13 | P1: Editor - not printed or downloaded | Tasks | Pending |
| SJD-14 | P1: Chat form - fill empty | Tasks | Pending |
| SJD-15 | P1: Chat form - replace autofilled | Tasks | Pending |
| SJD-16 | P1: Chat form - keep Owner text + notice | Tasks | Pending |
| SJD-17 | P1: Chat form - Replace button | Tasks | Pending |
| SJD-18 | P1: Chat form - no short notice | Tasks | Pending |
| SJD-19 | P1: Chat form - Company autofill | Tasks | Pending |
| SJD-20 | P1: Chat form - Master CV | Tasks | Pending |
| SJD-21 | P1: Chat form - aria-live notices | Tasks | Pending |
| SJD-22 | P1: Chat form - snapshot at creation | Tasks | Pending |

**Coverage:** 22 total, 0 mapped to tasks, 22 unmapped ⚠️ (tasks come after approval)

---

## Sources

- Grilling session 2026-11-27, Q1-Q18, Q24, Q25 - every decision above
- `src/services/tailor/output.ts` - `TailorOutputSchema`, where the field is added
- `src/services/recruiter-chat.service.ts` - `MAX_JOB_DESCRIPTION_CHARS = 2000`, chat snapshot
- `src/llm/default-prompts.ts` - recruiter prompt rule the short is shaped for

---

## Success Criteria

- [ ] Creating a chat from a freshly generated Tailored Resume needs no typing in the Job Description field.
- [ ] No stored Short Job Description exceeds 2000 code points.
