# Recruiter Transcripts Specification

**Approved**: 2026-11-22 - user: "aprovado pelo usuário via prompt do orquestrador; premissas default registradas"

**Depends on**: `recruiter-chat` and `admin-core` merged. AD-003 exception authorized by the orchestrator: this track may touch `src/db/schema.ts`, `drizzle/` (via `drizzle-kit generate`) and, only if wiring needs it, `src/container.ts` and `src/app.ts`. Owns: `src/repositories/recruiter-chat.repository.ts`, `src/services/recruiter-chat.service.ts`, `src/admin/chats.tsx`, `src/admin/messages.tsx`, their tests.

## Problem Statement

Recruiter sessions are stateless: the Recruiter Chat stores only a quota counter. The Owner wants to read what each Recruiter asked and what the model answered, in admin, to analyse and improve the recruiter prompt later.

## Goals

- [ ] The Owner opens any Recruiter Chat in admin and reads its conversation in chronological order.
- [ ] No Personal Info Field value is ever stored in a transcript.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Transcripts of the Public Chat | Not requested; visitors are anonymous |
| Export, search, per-message delete, retention jobs | Not requested; deleting the chat deletes its messages |
| Persisting a question whose answer failed | Simplest choice below: nothing is stored on failure |
| Changing prompts, streaming contract or headers | Must stay identical for the Recruiter |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Storage | New table `recruiter_chat_messages` (id, chat_id FK `ON DELETE CASCADE`, seq identity, role `user`/`assistant`, content, created_at) in schema `curriculum_api` | Delete of the chat must delete its messages; `seq` gives a total order even for equal timestamps | n |
| What is stored for the question | Only the latest user message of the request, after the PII Guard redaction the model saw | Earlier turns were stored with their own request; avoids duplicates; never raw Personal Info | n |
| When it is stored | Question and answer are inserted together in one statement when the answer stream completes | Atomic; a pair is never half-saved | n |
| Failure / refund / client abort | Nothing is stored (LlmUnavailable refund, mid-stream error, cancelled stream) | Simplest; the quota rule for these cases is unchanged | n |
| Answer redaction | The stored answer also passes `redactPii` | Defence in depth; the model never saw the values, so normally a no-op | n |
| Persistence failure | Logged with `console.error`; the Recruiter's stream is never broken | Transcripts are an owner convenience, not part of the contract | n |
| Wiring | No new constructor argument: the existing `RecruiterChatRepo` and `RecruiterChatService` own the methods, so `container.ts` and `app.ts` stay untouched | Minimal AD-003 exception: only `schema.ts` and `drizzle/` change | n |
| Page size | The whole conversation, no pagination | One chat holds at most 100 questions | n |
| Rendering | Plain text, JSX-escaped, no markdown | Prompt analysis needs the literal text; no XSS surface | n |
| Timestamp format | `YYYY-MM-DD HH:MM` UTC, as `/admin/chats` | Consistency | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Persist the conversation ⭐ MVP

**User Story**: As the Owner, I want each answered Recruiter question and its answer saved so that I can study them later.

**Why P1**: Without stored messages there is nothing to read.

**Acceptance Criteria**:

1. WHEN a Recruiter question is answered and its stream completes THEN the app SHALL store two messages for that chat, the latest user message with role `user` and the full assistant text with role `assistant`, the user message first.
2. WHEN the user message contains a Personal Info Field value THEN the stored `user` content SHALL contain `[redacted]` in its place and SHALL not contain the value.
3. WHEN the assistant text contains a Personal Info Field value THEN the stored `assistant` content SHALL contain `[redacted]` in its place.
4. IF `llmService.stream` throws `LlmUnavailableError`, or the stream errors or is cancelled before it completes, THEN the app SHALL store no message.
5. IF storing the messages fails THEN the stream SHALL still complete for the Recruiter and the failure SHALL be logged.
6. The streaming response status, headers and body SHALL be identical to the response without persistence.
7. WHEN the Owner resets the quota THEN the stored messages SHALL remain; WHEN the Owner deletes the chat THEN its messages SHALL be deleted with it.

**Independent Test**: Ask twice → 4 messages in order; reset → still 4; delete chat → 0 rows.

---

### P1: Read a transcript in admin ⭐ MVP

**User Story**: As the Owner, I want a Messages page per chat so that I can read the conversation.

**Why P1**: This is the purpose of the feature.

**Acceptance Criteria**:

1. WHEN `GET /admin/chats` is requested THEN each row SHALL carry a "Messages" link to `/admin/chats/:id/messages` (under `basePath`).
2. WHEN `GET /admin/chats/:id/messages` is requested for a chat with messages THEN the app SHALL render the recruiter name, the message count and the messages in chronological order, each with date and time, role and text.
3. WHEN the chat has no messages THEN the page SHALL show "No messages yet" and a count of 0.
4. IF `:id` does not exist or is not a UUID THEN the app SHALL answer 404.
5. WHEN a message contains markup such as `<script>alert(1)</script>` THEN the page SHALL render it escaped and SHALL contain no inline script.
6. The page SHALL require the admin session like every `/admin/*` route.

**Independent Test**: Seed `<script>` in a message → HTML holds `&lt;script&gt;`, no inline `<script>` besides `src=` ones.

---

## Edge Cases

- WHEN two questions are answered in the same millisecond THEN `seq` SHALL keep their pairs in answer order.
- WHEN an assistant answer is empty THEN no message SHALL be stored (a stream needs a first chunk to start).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TRN-01 | P1: Persist (AC 1, 7) schema, repository, order, cascade | Execute | Pending |
| TRN-02 | P1: Persist (AC 2, 3) never store Personal Info | Execute | Pending |
| TRN-03 | P1: Persist (AC 4, 5, 6) failure paths and untouched stream | Execute | Pending |
| TRN-04 | P1: Read (AC 1, 4, 6) link, not found, auth | Execute | Pending |
| TRN-05 | P1: Read (AC 2, 3, 5) page content, empty, escaping | Execute | Pending |

---

## Sources

- Orchestrator prompt (owner request), `recruiter-chat/spec.md`, `admin-core/spec.md`, `foundation/design.md`, `GLOSSARY.md` (Question vs message; PII Guard)
- No screen captures; the page gives outcomes, not layout.

---

## Success Criteria

- [ ] Every AC above is proven by a named test; `pnpm lint && pnpm typecheck && pnpm test && pnpm build` is green.
