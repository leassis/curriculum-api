# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - A test that proves a value never reaches the LLM must feed that value into every input the model sees, including the Master CV body
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `llm` · harmful: 0
- features: structured-resume
- evidence: C16 resume.service.test.ts (llm)
- last seen: 2026-11-23T15:59:38Z

### L-002 - Resolve form button targets against the form as posted, before any normalization drops or reorders entries
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `admin-forms` · harmful: 0
- features: structured-resume
- evidence: F2 src/services/tailor/form.ts:78 (admin-forms)
- last seen: 2026-11-23T15:59:38Z

### L-003 - Sanitize model-returned strings per line, not only at their start, before they are rendered as markdown
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `llm` · harmful: 0
- features: structured-resume
- evidence: F3 src/services/tailor/assemble.ts:10 (llm)
- last seen: 2026-11-23T15:59:38Z

### L-004 - Validate source data against the output schema bounds before a paid model call, so a bad source fails fast instead of after retries
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `llm` · harmful: 0
- features: structured-resume
- evidence: F4 src/services/tailor/parse-cv.ts:107 (llm)
- last seen: 2026-11-23T15:59:38Z

### L-005 - When a text is sent to a model whose output is stored, the criterion must say whether the model may reuse its wording
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `llm` · harmful: 0
- features: owner-notes
- evidence: spec.md OWN-22 (F1) (llm)
- last seen: 2026-11-24T21:16:24Z

### L-006 - Count text length limits in code points and test them with astral characters at and over the limit
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: owner-notes
- evidence: src/services/resume.service.ts:525 (F2) (validation)
- last seen: 2026-11-24T21:16:24Z

### L-007 - Prove a data-exclusion rule against the real repository query, not a fake that already omits the data
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: owner-notes
- evidence: test/support/recruiter-chat.fake.ts:107 (F3) (repo-layer)
- last seen: 2026-11-24T21:16:24Z

### L-008 - A check claiming several bodies or paths needs a proof that runs a test for each of them
- signal: `weak_test` · recurrence: 1 feature(s) · harmful: 0
- features: owner-notes
- evidence: tasks.md C23, C30 (F4)
- last seen: 2026-11-24T21:16:24Z

### L-009 - Validate URL schemes by the literal prefix the error message promises, not only by new URL parsing
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `validation` · harmful: 0
- features: owner-notes
- evidence: src/services/resume.service.ts:155 (F5) (validation)
- last seen: 2026-11-24T21:16:24Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
