# Prompt hardening: verification (2026-11-22)

Independent check of branch `feat/prompt-hardening`. Specs carry addenda only; approved ACs are unchanged.

- Data block: runs of 3+ `<`/`>` (mixed) are removed in one maximal-run pass, so a removal cannot join neighbours into a marker. Tested with 4+ char runs, split markers and nested start/end payloads.
- Gap found and fixed: client-supplied `assistant` turns reached the model unsanitized. They are now sanitized (not wrapped).
- Delimiters: public chat (VISITOR_MESSAGE), recruiter chat (RECRUITER_MESSAGE, JOB_DESCRIPTION before the CV block), tailor (JOB_DESCRIPTION). Proof: `test/unit/prompt-hardening.test.ts`.
- Gap found and fixed: no test ran the default prompts through the PII guard. `test/unit/default-prompts-pii.test.ts` sets email, phone, city, LinkedIn and street, sends all three default prompts, and asserts no throw and no value or e-mail in any recorded prompt.
- Default prompts keep "say plainly where the CV does not cover a requirement"; no "volunteer" wording.
- Size: tailor default is about 500 tokens (1928 chars); public about 290; recruiter about 380.
- Existing tests: the branch only adds tests; no assertion removed or relaxed.
