# Recruiter Chat Edit Specification

**Approved**: 2026-11-27 - user: "Aprovo as duas"

**Depends on**: `short-job-description` merged (reuses its New chat autofill and notices).

## Problem Statement

A Recruiter Chat stores a snapshot of its Job Description, company, resume and limits at creation. When a detail is wrong or the Owner wants a better Short Job Description after the link went out, the only fix today is a new link, which the recruiter must receive again. The Owner needs to change a chat in place, keeping its link and transcript.

## Goals

- [ ] The Owner can change any editable field of an existing chat, and the recruiter's next question uses the new values with the same link.
- [ ] No edit can leave a chat with `used` above `max_questions`.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Editing the token, `used`, status or transcript | Q20: revoke and reset already have their own actions; the link must not change |
| Reactivating a revoked chat by editing | Q21: editing never changes status |
| Telling the recruiter about an edit | Q22 |
| Following later resume changes automatically | Q14: the chat keeps a snapshot; the Owner edits on purpose |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Editable fields | Recruiter name, Company, Job Description, Resume, Max questions, Expires at | Q20 | y |
| Validation | Same rules as creating a chat, plus Max questions ≥ questions used; Expires at may be cleared, and when set must be in the future | Q21 | y |
| Revoked or expired chat | Editable; status and expiry state come only from their own rules | Q21 | y |
| When edits apply | From the recruiter's next question; past messages unchanged | Q22 | y |
| UI | "Edit" action on each table row loads the chat form filled with the chat's values, titled "Edit chat", with "Save" and "Cancel", in place of the New chat form | Q23 | y |
| Autofill in the edit form | Same rule and notices as the New chat form (`short-job-description` SJD-14..21) | Q23 | y |
| Stored values at edit start | They count as the Owner's own text, so changing the resume shows "Not filled…" with "Replace" instead of overwriting them | Code-settled default: an edit form never discards stored text silently | y |
| After Save | The table refreshes, the status line says "Saved", and the New chat form comes back | Code-settled default, matches the create flow refreshing rows via `chats-changed` | y |
| Max-questions check | Enforced in the same UPDATE statement (`used <= new max`), so a question counted while the form was open cannot slip past it | Concurrency: `acquire` increments `used` atomically | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Owner edits a chat in place ⭐ MVP

**User Story**: As the Owner, I want to change an existing Recruiter Chat's details so that the recruiter keeps the same link and gets the corrected context.

**Why P1**: It is the whole feature.

**Acceptance Criteria**:

1. WHEN the Owner uses "Edit" on a chat row THEN the system SHALL show a form titled "Edit chat" holding that chat's recruiter name, company, Job Description, resume, max questions and expiry, with "Save" and "Cancel" buttons, in place of the New chat form.
2. WHEN the Owner uses "Cancel" THEN the system SHALL show the empty New chat form again and SHALL leave the chat unchanged.
3. WHEN the Owner uses "Save" with valid values THEN the system SHALL store the recruiter name, company, Job Description, resume, max questions and expiry of that chat, refresh the chats table, show "Saved" in the status line, and show the New chat form again.
4. The system SHALL keep the chat's token, questions used, status and messages unchanged by a save.
5. WHEN the recruiter asks a question after a save THEN the system SHALL build the answer from the saved Job Description and resume.
6. IF the Owner saves a max questions value lower than the chat's questions used at the moment of the save THEN the system SHALL answer 400 with "must be at least the questions already used (N)", where N is that count, and SHALL keep the chat unchanged.
7. IF the Owner saves an empty recruiter name, a Job Description over 2000 characters, a max questions outside 1-100, an expiry in the past or an unknown resume THEN the system SHALL answer 400 with the same field message the create form gives and SHALL keep the chat unchanged.
8. WHEN the Owner saves with an empty expiry THEN the system SHALL store no expiry for that chat.
9. WHILE a chat is revoked or expired the system SHALL allow it to be edited and SHALL keep its status as it was.
10. IF the chat no longer exists when the Owner saves THEN the system SHALL answer 404 and show "Recruiter Chat not found" in the status line.
11. WHEN the Owner saves a chat whose expiry has already passed and leaves the expiry as it was stored (to the minute) THEN the system SHALL accept it and keep the chat expired; a different past expiry SHALL still answer 400 "must be in the future". (RCE-13, found by the Verifier: the edit form carries the stored expiry back)

**Independent Test**: Create a chat, ask one question through the test panel or recruiter route, edit its Job Description and max questions, ask again, see the new Job Description in the model request and the same token working.

---

### P1: Autofill in the edit form ⭐ MVP

**User Story**: As the Owner, I want changing the resume while editing a chat to offer that resume's Short Job Description and company so that switching resumes stays quick.

**Why P1**: Q23 makes the edit form reuse the create form's autofill.

**Acceptance Criteria**:

1. WHEN the Owner picks a Tailored Resume in the Edit chat form THEN the system SHALL apply the New chat autofill rule and notices (`short-job-description` SJD-14 to SJD-21) to the Job Description and Company fields.
2. WHEN the Edit chat form opens THEN the system SHALL treat the chat's stored Job Description and company as the Owner's own text, so a resume pick shows "Not filled: the field has your own text." with "Replace" for a non-empty field instead of overwriting it.

**Independent Test**: Edit a chat with a stored Job Description, pick another resume, see the notice; use Replace, see the resume's Short Job Description.

---

## Edge Cases

- WHEN the Owner saves without changing anything THEN the system SHALL store the same values and show "Saved".
- IF the Owner opens "Edit" for a chat deleted in another tab THEN the system SHALL show "Recruiter Chat not found" in the status line and keep the New chat form.
- WHEN max questions is saved equal to the questions used THEN the system SHALL accept it, and the recruiter's next question SHALL get the limit-reached answer.

---

## Dimensions sweep

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | RCE-07, RCE-06, RCE-08 |
| Failure / partial-failure states | RCE-06, RCE-07, RCE-10: a rejected save changes nothing |
| Idempotency / retry | Edge case: saving the same values twice is harmless |
| Auth boundaries & rate limits | N/A because the routes sit under the existing admin session middleware; recruiter sessions are untouched (RCE-04 keeps the token) |
| Concurrency / ordering | RCE-06: the max ≥ used check runs in the UPDATE itself |
| Data lifecycle / expiry | RCE-08, RCE-09 |
| Observability | N/A because no new failure mode needs logs beyond the central error handler |
| External-dependency failure | N/A because a save calls no external service |
| State-transition integrity | RCE-04, RCE-09: editing never changes status |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RCE-01 | P1: Edit - form opens filled | Tasks | Pending |
| RCE-02 | P1: Edit - Cancel | Tasks | Pending |
| RCE-03 | P1: Edit - Save stores and refreshes | Tasks | Pending |
| RCE-04 | P1: Edit - token, used, status, messages kept | Tasks | Pending |
| RCE-05 | P1: Edit - next question uses saved values | Tasks | Pending |
| RCE-06 | P1: Edit - max below used rejected | Tasks | Pending |
| RCE-07 | P1: Edit - create validations | Tasks | Pending |
| RCE-08 | P1: Edit - clear expiry | Tasks | Pending |
| RCE-09 | P1: Edit - revoked/expired editable | Tasks | Pending |
| RCE-10 | P1: Edit - deleted chat 404 | Tasks | Pending |
| RCE-11 | P1: Autofill - same rule in edit form | Tasks | Pending |
| RCE-12 | P1: Autofill - stored values count as Owner text | Tasks | Pending |
| RCE-13 | P1: Edit - expired chat saves with its stored expiry | Verification | Pending |

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️ (tasks come after approval)

---

## Sources

- Grilling session 2026-11-27, Q14, Q19-Q23
- `src/admin/chats/routes.ts`, `src/services/recruiter-chat.service.ts` - existing create/revoke/reset rules reused

---

## Success Criteria

- [ ] Fixing a chat's Job Description takes one edit and no new link.
- [ ] Zero chats with `used > max_questions` after any edit.
