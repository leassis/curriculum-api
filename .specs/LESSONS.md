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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
