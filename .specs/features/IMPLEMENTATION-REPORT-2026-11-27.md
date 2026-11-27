# Implementation report — short-job-description + recruiter-chat-edit (2026-11-27)

## Outcome

Both specs implemented by Sonnet sub-agents in separate worktrees, reviewed by the coordinator, combined on **`feat/short-jd-and-chat-edit`** (merge at `75d13c1`, then 7 follow-up commits; see "Follow-up changes after review"). Nothing pushed, no PR, local `main` untouched.

Gates re-run by the coordinator on the final branch: `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm build` ✅ · `pnpm test` ✅ 113 files / 823 tests. (`node dist/cli.js migrate` from CI not run: needs a target DB.)

## Ordering

`recruiter-chat-edit` depends on `short-job-description` (reuses its New chat autofill and notices), so the two ran sequentially: `feat/recruiter-chat-edit` was branched from `feat/short-job-description`. The final branch merges `feat/recruiter-chat-edit` into `feat/short-job-description` with one merge commit (`75d13c1`).

**Base note:** worktrees were cut from `origin/main` (`add4f69`), which is 2 commits ahead of local `main` (`8c202e9`): TypeScript 6.0.3 → 7.0.2 and release 0.4.0. Those come along with the branch.

## short-job-description — `feat/short-job-description` (19 commits)

- T1–T14 done, one commit each. Migration `drizzle/0009_ordinary_justin_hammer.sql`: one nullable `text` column `curriculum_api.tailored_resumes.job_description_short`. Applied only to Testcontainers / throwaway local Postgres.
- Short JD is produced by the tailor model output (`TailorOutputSchema` + `SHORT_JD_RULES`), normalised in `src/services/tailor/short-description.ts`, editable in the resume editor, and autofills the New chat form (`src/admin/chats/autofill.ts`).
- Verifier: initial FAIL (2 findings) → both closed in `8bbd455` (stronger C26 test; sentence-end rule pinned by a test: `.`/`!`/`?` + optional closing quote/bracket, then whitespace/end; "3.5" not a boundary). check_proofs 33/33.
- Deviations: extra commit `2d46e75` (admin imports `ResumeContext` type from the service, not the repository, to satisfy the architecture lint); `MAX_JOB_DESCRIPTION_CHARS` now aliases `SHORT_JD_MAX_CHARS` (2000, unchanged value); `proofs.md`/`verification.md` committed by the coordinator (`947ff27`).
- Coordinator review: layering respected, no PII path to the LLM, migration additive.

## recruiter-chat-edit — `feat/recruiter-chat-edit` (9 commits on top)

- T1–T6 done. No schema change.
- `RecruiterChatRepo.update()` guards atomically: `UPDATE … WHERE id = $1 AND used <= $maxQuestions RETURNING`; token/used/status not editable. Shared `checkInput()` for create/update. One `ChatForm` for New/Edit; `GET /admin/chats/:id/edit`, `PUT /admin/chats/:id`.
- Verifier findings (4) closed in `37c782a`.
- check_proofs 20/20.

### ⚠ Needs your decision

1. **Expired-chat save (new AC 11 / RCE-13 / C17, commit `37c782a`)** — the agent added a rule not in the approved spec: saving an expired chat with its *own stored* expiry (to the minute) is accepted; any other past expiry still → 400 "must be in the future". Without it, an expired chat could not be saved unchanged. **Decision 2026-11-27: kept (user).**
2. **`RecruiterChatService.get(id)`** added for the edit form (not in T4 file list).
3. **No browser walk** of the edit flow — htmx swaps (Edit / Cancel / Save) covered by unit tests only. Short-JD autofill *was* walked in a browser.

## Follow-up changes after review (coordinator, on `feat/short-jd-and-chat-edit`)

Made after the Owner tried the branch. Every commit passed lint, typecheck, build and the full suite; final state 115 files / 829 tests.

| Commit | Change |
|---|---|
| `b4f6a9c` feat(resumes) | Company is editable in resume options (next to the Short Job Description); blank stores NULL, omitted keeps the stored value. `ResumePatch` gained `company`. |
| `60b4f9c` feat(admin) | The Resume select is the first field of the New/Edit chat form. |
| `1628a73` feat(llm) | Recruiter prompt leads with CV experience that matches the job description and never brings up uncovered requirements. On a direct question it says only that the CV does not detail it and points to the closest related experience, never claiming the skill. The public prompt keeps "say the CV does not mention it". |
| `9658207` feat(db) | `seed` upserts: an existing profile gets the current default prompts (prompts edited in Admin → Profile are overwritten); name, headline and summary are kept. Returns `created` / `updated` (was `exists`). |
| `696d5a6` feat(admin) | `hx-confirm` opens a styled `<dialog>` instead of `window.confirm` (Notyf has no confirm). |
| `ae6b5ac` refactor(admin) | The dialog is a `ConfirmDialog` JSX component the layout renders once per page; `toast/confirm.ts` only fills and opens it. The answer settles from submit / Escape / backdrop click instead of the dialog's `close` event, which is queued and could cancel a confirmed delete. View test added. |
| `bfa0d3f` feat(admin) | Every destructive action confirms: Revoke (red, cannot be undone) and Reset on recruiter chats were missing. Every `hx-delete` gets a red Delete button (career and resume item deletes were not red). `data-confirm-ok` / `data-confirm-danger` set the button. A test fails when a view adds `hx-delete`, revoke or reset without `hx-confirm`. |

Decisions and notes:

- Test panel ("Test the assistant") still sends only the Master CV, not the form's resume, company or Job Description; the Owner chose to leave it for now.
- Confirm dialog checked in a browser with injected test buttons on the login page (Cancel, Escape, backdrop, repeated Delete, colors). The real buttons behind the admin login were not clicked.
- The new recruiter prompt was not tried against a real model; tests use the mock model.
- `biome --write` does not run in this sandbox; formatting was fixed by hand.

## Housekeeping

- Worktrees: `.claude/worktrees/agent-a7970beae11b28ffa` (SJD), `.claude/worktrees/agent-a657282373aca9dcd` (now on the final branch).
- Dev servers started by the coordinator for browser checks were stopped.
