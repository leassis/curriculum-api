# Structured-output smoke run

- **Date**: 2026-11-23
- **Model**: `deepseek/deepseek-v4-flash` (`MODEL_TAILOR` from `.env.local`), structured settings from T1 (`require_parameters`, `response-healing`, strict json_schema default)
- **Command**: `pnpm -s tsx --env-file=.env --env-file=.env.local scripts/smoke-structured.ts`
- **Exit**: 0 — reply parsed against the zod schema; no switch to `strict: false` needed

```json
{
  "title": "Distributed Systems Reliability Engineer",
  "skills": [
    "1. Fault-tolerant infrastructure design: Architecting systems that gracefully handle node failures through circuit breakers, retry logic, and graceful degradation.",
    "2. Observability pipeline optimization: Implementing sophisticated telemetry collection (traces, metrics, logs) that operates at petabyte scale without impacting request latency.",
    "3. Consensus protocol tuning: Hands-on proficiency with Raft or Paxos implementations for distributed coordination, including quorum sizing and latency optimization across geo-distributed clusters."
  ]
}
```

Note: the first attempt with `--env-file=.env` alone exited 2 (`MODEL_TAILOR is required`): the model id lives in `.env.local`.
