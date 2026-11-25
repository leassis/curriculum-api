# Testcontainers Test Database Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (no design.md): `test/support/postgres-container.ts` starts the container and migrates it; `test/support/global-setup.ts` provides its URL and returns its stop as teardown.
**Status**: Approved
**Approved**: 2026-11-25 - user: "Approve"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit test/unit/support test/unit/repo-layout.test.ts --reporter=verbose`
**Run int**: `pnpm vitest run --project integration test/integration/db/isolation.test.ts --reporter=verbose`

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `CLAUDE.md` (commands, test projects), `vitest.config.ts` (unit / integration projects), existing `test/unit/support/*.test.ts` (setup tested with injected fakes).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Test support (container start, global setup) | unit | Every TC criterion it owns, with injected fakes; no Docker | `test/unit/support/*.test.ts` | `pnpm test:unit` |
| Test DB wiring against the real container | integration | Isolation claim (TC-07) and the full suite (TC-10) | `test/integration/**/*.test.ts` | `pnpm test:int` |
| Repo layout, env and docs | unit | One assertion per DOC criterion | `test/unit/repo-layout.test.ts` | `pnpm test:unit` |
| Dependency / decision log | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test:unit` |
| Full | After tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | After phase completion or config-only tasks | `pnpm lint && pnpm typecheck && pnpm build && pnpm test` |

---

## Execution Plan

### Phase 1: Container setup

```
T1 → T2 → T3 → T4
```

### Phase 2: Isolation, docs and decision

```
T4 → T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Add the Testcontainers dependency

**What**: Add `@testcontainers/postgresql` as an exact-pinned dev dependency, choosing a version published at least 14 days before 2026-11-25 (check `npm view @testcontainers/postgresql time`).
**Where**: `package.json` (and `pnpm-lock.yaml` via `pnpm add -D -E`)
**Depends on**: None
**Reuses**: existing exact-pin convention in `package.json`
**Requirement**: TC-01

**Done when**:

- [ ] `package.json` devDependencies hold `@testcontainers/postgresql` at an exact version
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm build && pnpm test:unit`

**Tests**: none
**Gate**: build

**Commit**: `build(test): add @testcontainers/postgresql`

---

### T2: Start and migrate the test container

**What**: `startTestDatabase(deps)` in a new module starts `postgres:18`, runs `deps.migrate(url)`, returns `{ url, stop }`; stops the container if migrations fail; rethrows a runtime-missing error with a message containing "Docker"; scrubs `postgres://…` from any error it throws and never logs a connection string. The container starter is injected so unit tests use a fake.
**Where**: `test/support/postgres-container.ts` (new) with `test/unit/support/postgres-container.test.ts` (new)
**Depends on**: T1
**Reuses**: scrub and error-copy pattern of `test/support/neon-branch.ts`
**Requirement**: TC-01, TC-02, TC-04, TC-05, TC-08

**Done when**:

- [ ] Tests named exactly as in C1-C5 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `test(db): start a Postgres container for the integration run`

---

### T3: Global setup uses the container

**What**: `createGlobalSetup` keeps loading `.env` then `.env.local`, calls `startTestDatabase`, provides `testDatabaseUrl`, returns the container's `stop` as teardown; no Neon variable or `fetch` dependency remains. Rewrite `test/unit/support/global-setup.test.ts` for the new deps.
**Where**: `test/support/global-setup.ts` with `test/unit/support/global-setup.test.ts`
**Depends on**: T2
**Reuses**: current `createGlobalSetup` shape and env loading
**Requirement**: TC-01, TC-03, TC-06, TC-11

**Done when**:

- [ ] Tests named exactly as in C6-C9 pass
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `test(db): run integration tests on the container instead of a Neon branch`

---

### T4: Remove the Neon test-branch code

**What**: Delete `test/support/neon-branch.ts` and `test/unit/support/neon-branch.test.ts`; add a repo-layout test that no file under `test/support` mentions `console.neon.tech`.
**Where**: `test/support/neon-branch.ts` (delete) with `test/unit/repo-layout.test.ts`
**Depends on**: T3
**Reuses**: `readdirSync` walk in `repo-layout.test.ts`
**Requirement**: TC-06

**Done when**:

- [ ] Test named exactly as in C10 passes
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`

**Tests**: unit
**Gate**: build

**Commit**: `test(db): remove the Neon test-branch setup`

---

### T5: Isolation test checks the container

**What**: `isolation.test.ts` asserts the run's URL host and port differ from `DATABASE_URL`'s when set (both may be `localhost`), and that `current_database()` matches the URL path; drops the `*.neon.tech` assertion.
**Where**: `test/integration/db/isolation.test.ts`
**Depends on**: T4
**Reuses**: existing isolation test body
**Requirement**: TC-07

**Done when**:

- [ ] Test named exactly as in C11 passes
- [ ] Gate check passes: `pnpm test:unit && pnpm test:int`, with no `hookTimeout` in `vitest.config.ts`

**Tests**: integration
**Gate**: full

**Commit**: `test(db): isolation test compares host and port with DATABASE_URL`

---

### T6: Env example drops the test-branch variable

**What**: Remove `TEST_PARENT_BRANCH_ID` from `.env.example`; reword the `NEON_API_KEY` / `NEON_PROJECT_ID` comments to name docker compose only; update the env test in `repo-layout.test.ts`.
**Where**: `.env.example` with `test/unit/repo-layout.test.ts`
**Depends on**: T5
**Reuses**: `env example documents every variable` test
**Requirement**: DOC-03

**Done when**:

- [ ] Test named exactly as in C14 passes
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `docs(env): drop TEST_PARENT_BRANCH_ID`

---

### T7: Docs describe the container

**What**: RUNNING.md and CLAUDE.md say integration tests run on a Testcontainers Postgres container and need Docker; remove `TEST_PARENT_BRANCH_ID` and throwaway-Neon-branch text; add a repo-layout test for it.
**Where**: `RUNNING.md`, `CLAUDE.md` with `test/unit/repo-layout.test.ts`
**Depends on**: T6
**Reuses**: `docs describe Neon, not the old Postgres stack` test
**Requirement**: DOC-04

**Done when**:

- [ ] Test named exactly as in C15 passes
- [ ] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `docs: integration tests run on a Testcontainers Postgres`

---

### T8: Record AD-013

**What**: Add AD-013 to `.specs/STATE.md` (decision, reason quoting the user's "Everywhere" and "Revert it", trade-off: no test runs against real Neon, Docker needed locally; scope); mark AD-005 `superseded for integration tests by AD-013`.
**Where**: `.specs/STATE.md`
**Depends on**: T7
**Reuses**: AD-xxx format in `STATE.md`
**Requirement**: DOC-05

**Done when**:

- [ ] C16 proof exits 0
- [ ] Gate check passes: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`

**Tests**: none
**Gate**: build

**Commit**: `docs(specs): record AD-013 Testcontainers for integration tests`

---

## Checks

**C1** - The setup starts a `postgres:18` container and returns its URL (TC-01, AC 1)
Proof: run unit | ✓ test database container > starts postgres:18 and returns its URL

**C2** - Migrations run on the container before the URL is returned (TC-02, AC 2)
Proof: run unit | ✓ test database container > migrates the container before returning

**C3** - A migration failure stops the container, then fails (TC-04, AC 4)
Proof: run unit | ✓ test database container > stops the container when migrations fail

**C4** - No container runtime fails with a message containing "Docker" (TC-05, AC 5)
Proof: run unit | ✓ test database container > fails naming Docker when no container runtime is reachable

**C5** - No connection string is logged or thrown (TC-08, AC 8)
Proof: run unit | ✓ test database container > never logs or throws a connection string

**C6** - Global setup provides the container URL as `testDatabaseUrl` (TC-01, AC 1)
Proof: run unit | ✓ global setup > provides the container URL

**C7** - Teardown stops the container it started (TC-03, AC 3)
Proof: run unit | ✓ global setup > teardown stops the container it started

**C8** - Global setup runs with no Neon variable set (TC-06, AC 6)
Proof: run unit | ✓ global setup > needs no Neon variable

**C9** - One container is started per run and never restarted (TC-11, edge case)
Proof: run unit | ✓ global setup > starts one container per run

**C10** - No file under `test/support` calls the Neon API (TC-06, AC 6)
Proof: run unit | ✓ repo layout > test support makes no Neon API call

**C11** - Tests connect to the run's container, whose host and port differ from `DATABASE_URL` (TC-07, AC 7)
Proof: run int | ✓ test database isolation > connects to the run's container, not DATABASE_URL

**C12** - The unit project passes with no reachable Docker (TC-09, AC 9)
Proof: `DOCKER_HOST=unix:///nonexistent.sock pnpm test:unit`

**C13** - The full integration suite passes with the default `hookTimeout` (TC-10, AC 10)
Proof: `! grep -q hookTimeout vitest.config.ts && pnpm test:int`

**C14** - `.env.example` drops `TEST_PARENT_BRANCH_ID` and ties Neon variables to docker compose only (DOC-03, AC 1)
Proof: run unit | ✓ repo layout > env example drops the test branch variable

**C15** - RUNNING.md and CLAUDE.md describe the test container and Docker, not a Neon test branch (DOC-04, AC 2)
Proof: run unit | ✓ repo layout > docs describe the test container

**C16** - STATE.md holds AD-013 and marks AD-005 superseded for integration tests (DOC-05, AC 3)
Proof: `grep -q "^### AD-013" .specs/STATE.md && grep -A8 "^### AD-005" .specs/STATE.md | grep -q "superseded for integration tests"`

---

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7 ------→ T8
```
