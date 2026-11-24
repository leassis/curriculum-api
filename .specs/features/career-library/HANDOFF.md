# career-library handoff

Written 2026-11-23. Branch `feat/career-library` (local, nothing pushed), HEAD `6f08c2d`, cut from `main` after `feat/structured-resume` was fast-forward merged into `main` (local).

## State

- `career-library` T1-T26 implemented and marked in `tasks.md`; Verifier F1-F5 closed; screens round 2 all 4 match (3 confirmed differences in spec.md); `validate_verification.py career-library` exits 0; proofs 76/76.
- `proofs.md` is modified and uncommitted on purpose: the validator needs it to name HEAD, so committing it fails the check. After any new commit run `python3 ~/.claude/skills/tlc-spec-driven/scripts/check_proofs.py career-library` before `validate_verification.py career-library`.
- Unit suite 530 passed at HEAD; `pnpm lint` and `pnpm typecheck` pass. Integration suite last green at 611 total before the two fixes below; not re-run after them.
- STATE.md Handoff section already records the above.

## Fixes after the verification run (user-reported)

1. `ca2e9bf` — a generated resume dropped certifications, courses, skills and languages because only experience and education were restored when the model omitted them. Now experience, education, certification, course, skill_group and language are always restored (`src/services/tailor/assemble.ts`); spec Tailored AC 5, design and check C62 updated.
2. `6f08c2d` — the tailor schema description (`src/services/tailor/output.ts`) and `DEFAULT_TAILOR_SYSTEM_PROMPT` (`src/llm/default-prompts.ts`) now tell the model to return every one of those kinds, most relevant to the job first; only projects, publications and honours may be left out. Not verified against a real model call.
3. The dev server (`pnpm dev`, tsx without watch) must be restarted to pick these up; stored resumes are unchanged, only a new Generate changes.

## Open: "Left out (N)" feature (not started, not in the spec)

The user's competitor shows, in each Tailored Resume card (screenshot: Courses card with count badge 2, `+ Add course`, rows with move up/down, edit, delete, and a collapsed `Left out (1)` row at the bottom), the library items that are not in the resume. It is a new feature; the spec's Tailored AC 8 only says one card per kind with items, so today an Owner cannot add back a left-out item or add an item of a kind that has none.

Undecided (the user did not answer; they had to switch sessions):
- What "Left out" does: list only, or list plus an "Add back" button that copies the library item (new `id`, `sourceId` = library id) into the resume.
- Which cards get it (all kinds vs only those where items are normally omitted) and whether to keep today's always-restore rule or revert it so the model decides and the Owner recovers items from Left out.
- Whether a kind with no items in the resume still shows a card, so its left-out items can be added back.

Next step: run the `tlc-spec-driven` Specify phase for this as a small feature (or amend `career-library` Tailored AC 8/9), ask those decisions first, get approval, then Design/Tasks/Execute with sub-agents, one atomic Conventional Commit per task. The reference screenshot is in the conversation only; save it under `captures/` before building (binding source).

## Not done / needs the user

- Production: migrations `0005` (career_library, profile summary) and `0006_drop_master_cv` need the user's explicit go-ahead. The Owner must load the Career Library first; a converted copy of their CV that the parser accepts (20 items) is in the side-session notes folder as `career-library.md`.
- Merge `feat/career-library` into `main` is not done; any push needs explicit go-ahead.
- `honest-assessment` spec is stale (written against the markdown Master CV) and must be rewritten before approval.

## Useful facts

- Markdown format the editor parses: `### Position`, then `*Company · Location · Dates*`, text, `- bullets`, `Stack: a, b`; sections `## Experience|Projects|Education|Certifications|Courses|Skills|Languages|Publications|Honours`.
- Verification helpers used: Playwright headless Chrome at deviceScaleFactor 2 for exact-size pictures; throwaway Neon Local on a free host port; no production touched.
- Org rules: no code comments, personal data never reaches an LLM, commits end with the Co-Authored-By trailer, run `check_commit.py` before each commit.

## Update 2026-11-23 (later): "Left out" built

Decisions: list + Add back, all nine kinds with a card (empty kinds too), always-restore kept, Left out row hidden at 0. Spec Tailored AC 8, 13-18 and the 200-item resume edge case (CLIB-13). Tasks T27-T29 plus fixes for Verifier findings F6-F11 (row lock in `ResumeRepo.change`, guard inputs read before the lock). HEAD 18f97d5 plus the commit after; proofs 88/88, `validate_verification.py career-library` exits 0. Unit 544, integration 88 at the last gate.

Still open: the Left out competitor screenshot is not on disk (save as `captures/tailored-left-out.png` to make it binding); production migrations 0005/0006, merge into `main` and any push need the user's go-ahead; `honest-assessment` spec still stale; the F7 note: Personal Info is read before the row lock, so it is not serialized with a concurrent Personal Info write.
