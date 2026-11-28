# Tailor Empty Text Specification

**Approved**: 2026-11-28 - user: "Approve"

## Problem Statement

A tailored resume shows item `text` that only restates the item's own title, organisation, location and dates ("Tech Lead (CTO), Intelipost, São Paulo, Brazil, Jul 2014 – Mar 2017") under an experience whose meta line already shows them. The Career Library item has empty `text`; `bodyOf` in `src/services/tailor/assemble.ts` takes the model's `text` whenever the kind allows `text`, and the model ignores the schema's "empty when the CV has none".

## Goals

- [ ] A tailored resume item whose Career Library item has empty `text` has empty `text`, whatever the model returns.
- [ ] The tailor prompt tells the model never to restate an item's title, employer, location or dates in its text.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Dropping model `text` that restates the meta line when the library `text` is not empty | User: out of scope. Detecting a restatement is a fragile heuristic; the prompt rule covers it softly. |
| Repairing tailored resumes already stored | Resumes are regenerated on demand; no migration asked for. |
| Bullets of an item whose library bullets are empty | Not reported; bullets keep current behaviour. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| "Empty" library text | `text.trim() === ""` | Whitespace-only text shows nothing; the brief says "empty (trimmed)". | y |
| Prompt rule wording reaches existing profiles | The seed refreshes default prompts on an existing profile (commit d7fd365); no extra work | Already in place. | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Empty library text stays empty ⭐ MVP

**User Story**: As the Owner, I want a tailored resume item to carry no text when my Career Library item has none, so that the resume does not repeat the meta line.

**Why P1**: It is the reported defect, and the CV is the only source of facts.

**Acceptance Criteria**:

1. IF the Career Library item's `text` is empty after trimming THEN the tailor assembly SHALL set the tailored item's `text` to "" whatever text the model returns.  <!-- unwanted-behavior -->
2. WHEN the Career Library item's `text` is not empty THEN the tailor assembly SHALL take the model's cleaned `text` as before.  <!-- event-driven -->

**Independent Test**: Assemble a library experience with `text: ""` and a model reply with `text: "Lead Engineer at Brainsfirst (Amsterdam, Jan 2023 – Present)"`; the document item has `text: ""`.

---

### P2: Prompt forbids restating the meta line

**User Story**: As the Owner, I want the tailor prompt to forbid restating title, employer, location and dates in item text, so that items with their own text do not repeat the meta line either.

**Why P2**: Soft guard for the case the code does not enforce.

**Acceptance Criteria**:

1. The default tailor system prompt SHALL contain the rule "Never restate an item's title, employer, location or dates in its text".  <!-- ubiquitous -->

**Independent Test**: Read `DEFAULT_TAILOR_SYSTEM_PROMPT`; it contains the rule.

---

## Edge Cases

- IF the library `text` is whitespace only THEN the tailor assembly SHALL set the tailored item's `text` to "".

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TAILTXT-01 | P1: Empty library text stays empty | Execute | Pending |
| TAILTXT-02 | P1: Empty library text stays empty | Execute | Pending |
| TAILTXT-03 | P2: Prompt forbids restating the meta line | Execute | Pending |

**Coverage:** 3 total, 3 mapped to checks, 0 unmapped

---

## Sources

- Dev DB finding on `deepseek/deepseek-v4-flash` resumes, reported by the print-template session - settles the defect and root cause.
- User answers, 2026-11-28: core fix "Approve", prompt rule "Add rule", restating with non-empty text "Out of scope".

---

## Success Criteria

- [ ] An assemble test proves an empty library `text` stays empty when the model returns text.
- [ ] Existing tailor tests pass.

---

## Checks

**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit test/unit/services/tailor/assemble.test.ts test/unit/llm/default-prompts.test.ts --reporter=verbose`

**C1** - an experience with library `text: ""` keeps `text: ""` when the model returns meta-line text (TAILTXT-01, AC 1)
Proof: run unit | ✓ keeps an empty library text empty whatever the model returns

**C2** - whitespace-only library `text` yields `text: ""` (TAILTXT-01, edge case)
Proof: run unit | ✓ treats a whitespace-only library text as empty

**C3** - a non-empty library `text` takes the model's cleaned text (TAILTXT-02, AC 2)
Proof: run unit | ✓ copies typed fields from the library and bodies from the model

**C4** - the tailor prompt contains "Never restate an item's title, employer, location or dates in its text" (TAILTXT-03, AC 1)
Proof: run unit | ✓ tailor prompt forbids restating the meta line in item text
