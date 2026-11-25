# Local Postgres Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (no design.md): `docker-compose.yml` runs `postgres:18-alpine` with a healthcheck and the `pgdata` volume; CI and docs point at `postgres://postgres:postgres@localhost:5432/curriculum`; `POSTGRES_IMAGE` in `test/support/postgres-container.ts` becomes `postgres:18-alpine`.
**Status**: Approved
**Approved**: 2026-11-25 - user: "do not ask for approval for tasks, just approve go for implementation"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit test/unit/repo-layout.test.ts test/unit/support --reporter=verbose`

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `CLAUDE.md`, `vitest.config.ts`, `test/unit/repo-layout.test.ts` (compose, CI, env and docs are asserted there), `test/unit/support/postgres-container.test.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Compose, CI workflow, package scripts, env example, docs | unit | One assertion per LPG/DOC criterion | `test/unit/repo-layout.test.ts` | `pnpm test:unit` |
| Test support (container image) | unit | The image the container starts | `test/unit/support/*.test.ts` | `pnpm test:unit` |
| Real container and CLI migrate | integration | Suite passes on the new image; CLI migrates the compose DB | `test/integration/**` | `pnpm test:int` |
| Decision log | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `pnpm test:unit` |
| Full | After tasks with integration tests | `pnpm test:unit && pnpm test:int` |
| Build | After phase completion or config-only tasks | `pnpm lint && pnpm typecheck && pnpm build && pnpm test` |

---

## Execution Plan

### Phase 1: Runtime

```
T1 → T2 → T3 → T4
```

### Phase 2: Docs and decision

```
T4 → T5 → T6 → T7
```

---

## Task Breakdown

### T1: Compose runs postgres:18-alpine

**What**: Replace the Neon Local service in `docker-compose.yml` with `db`: `postgres:18-alpine`, `5432:5432`, `POSTGRES_USER/PASSWORD=postgres`, `POSTGRES_DB=curriculum`, a `pg_isready` healthcheck, data in named volume `pgdata`; rewrite `compose runs Neon Local only` into the tests named in C1-C3.
**Where**: `docker-compose.yml` with `test/unit/repo-layout.test.ts`
**Depends on**: None
**Reuses**: existing compose test and `yaml` parse in `repo-layout.test.ts`
**Requirement**: LPG-01, LPG-02, LPG-03, LPG-08

**Done when**:

- [x] Tests named exactly as in C1-C3 pass
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `build(db): run postgres:18-alpine in docker compose`

---

### T2: db scripts need no env file

**What**: `db:up` becomes `docker compose up -d --wait`, `db:down` becomes `docker compose down`; add the repo-layout test named in C4.
**Where**: `package.json` with `test/unit/repo-layout.test.ts`
**Depends on**: T1
**Reuses**: `package.json` read in `repo-layout.test.ts`
**Requirement**: LPG-04

**Done when**:

- [x] Test named exactly as in C4 passes
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `build(db): start the dev database without an env file`

---

### T3: Test container uses postgres:18-alpine

**What**: `POSTGRES_IMAGE = "postgres:18-alpine"`; rename the image test to the name in C7 and assert the new image; in `.specs/features/testcontainers-db/tasks.md` update the C1 claim and proof line to the renamed test, noting the image changed by AD-014.
**Where**: `test/support/postgres-container.ts` with `test/unit/support/postgres-container.test.ts`
**Depends on**: T2
**Reuses**: existing C1 test of `testcontainers-db`
**Requirement**: LPG-07

**Done when**:

- [x] Test named exactly as in C7 passes
- [x] Gate check passes: `pnpm test:unit && pnpm test:int`

**Tests**: integration
**Gate**: full

**Commit**: `test(db): run integration tests on postgres:18-alpine`

---

### T4: CI uses the compose Postgres

**What**: In `.github/workflows/ci.yml` set `DATABASE_URL: postgres://postgres:postgres@localhost:5432/curriculum`, remove `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID`, and reword every Neon Local comment; keep steps and their order; add the tests named in C5 and C11 (the existing CI-order test stays).
**Where**: `.github/workflows/ci.yml` with `test/unit/repo-layout.test.ts`
**Depends on**: T3
**Reuses**: `ci workflow runs lint, typecheck, test with db services and build` test
**Requirement**: LPG-05, LPG-06, DOC-08

**Done when**:

- [x] Tests named exactly as in C5 and C11 pass
- [x] C6 proof exits 0
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`

**Tests**: unit
**Gate**: build

**Commit**: `ci: use the compose Postgres and drop the Neon secrets`

---

### T5: Env example lists no Neon variable

**What**: Remove `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` from `.env.example`; the `DATABASE_URL` comment shows `postgres://postgres:postgres@localhost:5432/curriculum`; rewrite `env example drops the test branch variable` into the test named in C9, keeping its other assertions.
**Where**: `.env.example` with `test/unit/repo-layout.test.ts`
**Depends on**: T4
**Reuses**: existing env-example test
**Requirement**: DOC-06

**Done when**:

- [x] Test named exactly as in C9 passes
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `docs(env): drop the Neon variables`

---

### T6: Docs describe the local Postgres

**What**: RUNNING.md and CLAUDE.md describe `pnpm db:up` as a `postgres:18-alpine` container with the new URL and mention no Neon Local, `NEON_API_KEY` or `PARENT_BRANCH_ID`; rewrite `docs describe Neon, not the old Postgres stack` into the test named in C10, keeping its other bans; `docs describe the test container` stays green.
**Where**: `RUNNING.md`, `CLAUDE.md` with `test/unit/repo-layout.test.ts`
**Depends on**: T5
**Reuses**: existing docs tests
**Requirement**: DOC-07

**Done when**:

- [x] Test named exactly as in C10 passes
- [x] Gate check passes: `pnpm lint && pnpm test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `docs: dev database is a local postgres:18-alpine`

---

### T7: Record AD-014

**What**: Add AD-014 to `.specs/STATE.md` (decision; reason quoting "I will replace non local to postgres 18 alpine as well"; trade-off: dev no longer runs on real Neon; scope) and mark the Neon Local AD-005 `superseded by AD-014`.
**Where**: `.specs/STATE.md`
**Depends on**: T6
**Reuses**: AD-013 format
**Requirement**: DOC-09

**Done when**:

- [x] C12 proof exits 0
- [x] Gate check passes: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`

**Tests**: none
**Gate**: build

**Commit**: `docs(specs): record AD-014 local Postgres for dev and CI`

---

## Checks

**Run unit** is the group above.

**C1** - Compose has one service `db` on `postgres:18-alpine`, `5432:5432`, `POSTGRES_USER/PASSWORD=postgres`, `POSTGRES_DB=curriculum`, no Neon variable (LPG-01, AC 1)
Proof: run unit | ✓ repo layout > compose runs postgres:18-alpine only

**C2** - The `db` service has a `pg_isready` healthcheck (LPG-02, AC 2)
Proof: run unit | ✓ repo layout > compose waits for pg_isready

**C3** - The `db` service keeps its data in the named volume `pgdata` (LPG-03, AC 3)
Proof: run unit | ✓ repo layout > compose keeps data in the pgdata volume

**C4** - `db:up` is `docker compose up -d --wait` and `db:down` is `docker compose down`, with no `--env-file` (LPG-04, AC 4)
Proof: run unit | ✓ repo layout > db scripts need no env file

**C5** - CI sets `DATABASE_URL=postgres://postgres:postgres@localhost:5432/curriculum` and no `NEON_*` or `PARENT_BRANCH_ID` (LPG-05, AC 5)
Proof: run unit | ✓ repo layout > ci uses the compose Postgres and no Neon variable

**C6** - The packaged CLI migrates the compose database (LPG-06, AC 6)
Proof: `docker compose up -d --wait && pnpm build && DATABASE_URL=postgres://postgres:postgres@localhost:5432/curriculum DATABASE_URL_UNPOOLED= node dist/cli.js migrate`

**C7** - The integration-test container starts `postgres:18-alpine` (LPG-07, AC 7)
Proof: run unit | ✓ test database container > starts postgres:18-alpine and returns its URL

**C8** - The integration suite passes on `postgres:18-alpine` (LPG-07, AC 7)
Proof: `pnpm test:int`

**C9** - `.env.example` lists no Neon variable and its `DATABASE_URL` comment shows the local URL (DOC-06, AC 1)
Proof: run unit | ✓ repo layout > env example lists no Neon variable

**C10** - RUNNING.md and CLAUDE.md describe a `postgres:18-alpine` dev database and mention no Neon Local, `NEON_API_KEY` or `PARENT_BRANCH_ID` (DOC-07, AC 2)
Proof: run unit | ✓ repo layout > docs describe the local Postgres

**C11** - The CI workflow comments do not mention Neon Local (DOC-08, AC 3)
Proof: run unit | ✓ repo layout > ci comments skip Neon Local

**C12** - STATE.md holds AD-014 and marks AD-005 superseded by AD-014 (DOC-09, AC 4)
Proof: `grep -q "^### AD-014" .specs/STATE.md && grep -A8 "^### AD-005" .specs/STATE.md | grep -q "superseded by AD-014"`

**C13** - A busy port 5432 is not worked around: the mapping stays exactly `5432:5432` (LPG-08, edge case)
Proof: run unit | ✓ repo layout > compose runs postgres:18-alpine only

---

## Handoff

**Settled mid-build:** user: "at the end push the branch I will review it"
**Dispatched:** batch worker 1 (T1-T7, Sonnet) - done at fa4916d; Verifier round 1 (Opus)
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7
```
