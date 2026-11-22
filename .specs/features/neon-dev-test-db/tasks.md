# Neon Dev and Test Databases Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/neon-dev-test-db/design.md`
**Status**: Draft
**Approved**: 2026-11-22 - user: "Approve tasks"
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names are contracts: each check's proof line is the `describe > it` its test prints. From T4 on, integration runs need `NEON_API_KEY`, `NEON_PROJECT_ID` and `PARENT_BRANCH_ID` in `.env`; the dev proof (C14) needs `docker compose up -d --wait` and `DATABASE_URL` pointing at Neon Local. Use `rtk proxy pnpm vitest ...` for raw output (STATE Handoff note).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `CLAUDE.md` (unit = no DB, integration = DB; recording mock LLM), `vitest.config.ts` (projects `unit`, `integration`, `fileParallelism: false`), `test/unit/repo-layout.test.ts` (static repo assertions).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| DB client (`src/db/client.ts`) | unit | every host rule | `test/unit/db/*.test.ts` | `pnpm test:unit` |
| CLI (`src/cli.ts`) | unit | 1:1 to MIG ACs | `test/unit/cli.test.ts` | `pnpm test:unit` |
| Test support (`test/support/neon-branch.ts`, `global-setup.ts`) | unit | 1:1 to TEST ACs and edge cases, fake `fetch` | `test/unit/support/*.test.ts` | `pnpm test:unit` |
| Test DB wiring (inject into test files) | integration | connects to the run's branch, not `DATABASE_URL` | `test/integration/db/*.test.ts` | `pnpm test:int` |
| Repo files (compose, docs, `.env.example`) | unit | static assertions per AC | `test/unit/repo-layout.test.ts` | `pnpm test:unit` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks with unit tests only | `pnpm test:unit` |
| Full | Tasks touching integration wiring | `pnpm test:unit && pnpm test:int` |
| Build | End of each phase | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

---

## Execution Plan

### Phase 1: Code

```
T1 → T2 → T3 → T4
```

### Phase 2: Repo and docs

```
T5 → T6 → T7
```

---

## Task Breakdown

### T1: Migrate prefers the unpooled URL

**What**: Commit the pending working-tree change: `cli migrate` uses `DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`.
**Where**: `src/cli.ts` (already modified)
**Depends on**: None
**Reuses**: existing `databaseUrl()` helper
**Requirement**: MIG-01, MIG-02, MIG-03

**Done when**:

- [x] `test/unit/cli.test.ts` `migrate` tests pass (prefers unpooled, falls back, errors when neither)
- [x] Commit also carries the pending `.env.example` / `RUNNING.md` lines for `DATABASE_URL_UNPOOLED`; `.specs/features/resume-custom-instructions/proofs.md` stays out
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(cli): migrate with DATABASE_URL_UNPOOLED when set`

---

### T2: Route Neon Local to its HTTP endpoint

**What**: `fetchEndpointFor(host, port)` sends `localhost` / `127.0.0.1` to `http://<host>:<port or 5432>/sql`, every other host to `https://<host>/sql`; drop the `db.localtest.me` rule.
**Where**: `src/db/client.ts`
**Depends on**: T1
**Reuses**: existing `fetchEndpointFor`
**Requirement**: DEV-02, DEV-03, DEV-04

**Done when**:

- [x] `test/unit/db/client.test.ts` covers localhost with port, localhost without port, 127.0.0.1, a `*.neon.tech` host, and `db.localtest.me` now going to https
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(db): route Neon Local to its HTTP endpoint`

---

### T3: Neon test branch helper

**What**: `startTestBranch(deps)` creates, waits for, migrates and returns a throwaway branch with `stop()`, per design.
**Where**: `test/support/neon-branch.ts`
**Depends on**: T2
**Reuses**: curriculum-ai `scripts/gate-branch.ts` call shape
**Requirement**: TEST-01, TEST-02, TEST-03, TEST-05, TEST-06, TEST-07, TEST-08, TEST-10, TEST-11

**Done when**:

- [x] `test/unit/support/neon-branch.test.ts` with a fake `fetch` covers: parent from `TEST_PARENT_BRANCH_ID`, fallback to `PARENT_BRANCH_ID`, `expires_at` = now + 1h, migrate called with the branch URI after operations finish, each missing variable named, non-2xx message, no key or URI in errors/logs, `stop()` deletes, failed delete logged with branch id and not thrown, failed migrate deletes then rethrows
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `test(support): create a throwaway Neon branch for integration runs`

---

### T4: Integration runs on the test branch

**What**: `globalSetup` loads `.env`, starts the branch, provides `testDatabaseUrl`, returns `stop` as teardown; `test/support/db.ts` and `config.ts` read it via `inject`.
**Where**: `test/support/global-setup.ts` (plus `db.ts`, `config.ts` one-line reads)
**Depends on**: T3
**Reuses**: `startTestBranch`, `migrate`
**Requirement**: TEST-03, TEST-04, TEST-05, TEST-09

**Done when**:

- [x] `test/unit/support/global-setup.test.ts`: setup provides the branch URL; the returned teardown calls `stop`
- [x] `test/integration/db/isolation.test.ts`: the injected URL host ends in `.neon.tech` and differs from `DATABASE_URL`'s host; `current_database()` answers on it
- [x] `test/unit/repo-layout.test.ts`: no file under `test/` reads `process.env.DATABASE_URL` or `TEST_DATABASE_URL`
- [x] Gate check passes: `pnpm test:unit && pnpm test:int` (all existing integration files green on the branch)

**Tests**: integration
**Gate**: full
**Commit**: `test(support): run integration tests on a throwaway Neon branch`

---

### T5: Compose runs Neon Local only

**What**: `docker-compose.yml` defines one `neon_local` service; delete `docker/initdb.sql`.
**Where**: `docker-compose.yml`
**Depends on**: None (Phase 1 done)
**Reuses**: curriculum-ai `docker-compose.yml`
**Requirement**: DEV-01, DEV-04

**Done when**:

- [x] `test/unit/repo-layout.test.ts` asserts the single service, its image and env keys, `DELETE_BRANCH` default `true`, and the absence of `postgres:17`, `local-neon-http-proxy`, `docker/initdb.sql`
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `build(docker): replace local Postgres with Neon Local`

---

### T6: `.env.example` lists the Neon variables

**What**: Add `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID`, `TEST_PARENT_BRANCH_ID`, each with a comment; remove `TEST_DATABASE_URL`; `DATABASE_URL` comment shows the Neon Local URL.
**Where**: `.env.example`
**Depends on**: T5
**Reuses**: `repo-layout.test.ts` "env example documents every variable"
**Requirement**: DOC-01

**Done when**:

- [x] repo-layout test lists the new variables and asserts `TEST_DATABASE_URL` is absent
- [x] Gate check passes: `pnpm test:unit`

**Tests**: unit
**Gate**: quick
**Commit**: `docs(env): document Neon Local and test branch variables`

---

### T7: RUNNING.md and CLAUDE.md describe Neon

**What**: Replace the Postgres/proxy instructions with Neon Local for dev and the throwaway branch for `pnpm test:int`.
**Where**: `RUNNING.md`, `CLAUDE.md` (text only)
**Depends on**: T6
**Reuses**: curriculum-ai README wording
**Requirement**: DOC-02

**Done when**:

- [x] repo-layout test asserts neither file mentions `curriculum_test`, `db.localtest.me`, `TEST_DATABASE_URL`, `local-neon-http-proxy` or `Postgres 17`
- [x] Gate check passes: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

**Tests**: unit
**Gate**: build
**Commit**: `docs: describe Neon Local and the integration test branch`

---

## Checks

**C1** - `migrate` uses `DATABASE_URL_UNPOOLED` when set (MIG-01, AC 1)
Proof: run unit | ✓ cli > migrate > prefers DATABASE_URL_UNPOOLED

**C2** - `migrate` falls back to `DATABASE_URL` (MIG-02, AC 2)
Proof: run unit | ✓ cli > migrate > falls back to DATABASE_URL

**C3** - `migrate` with neither exits 1 with `DATABASE_URL is required` (MIG-03, AC 3)
Proof: run unit | ✓ cli > migrate > errors when neither is set

**C4** - `localhost:5432` and `127.0.0.1` route to `http://<host>:<port>/sql` (DEV-02, AC 2)
Proof: run unit | ✓ fetchEndpointFor > routes localhost to Neon Local over http

**C5** - A `*.neon.tech` host, and the old `db.localtest.me`, route to `https://<host>/sql` (DEV-03, AC 3)
Proof: run unit | ✓ fetchEndpointFor > routes any other host to https

**C6** - The branch parent is `TEST_PARENT_BRANCH_ID`, else `PARENT_BRANCH_ID` (TEST-01, AC 1)
Proof: run unit | ✓ startTestBranch > forks TEST_PARENT_BRANCH_ID, falling back to PARENT_BRANCH_ID

**C7** - `expires_at` is exactly 1 hour after creation (TEST-02, AC 2)
Proof: run unit | ✓ startTestBranch > sets expires_at one hour ahead

**C8** - Migrations run on the branch URI after its operations finish (TEST-03, AC 3)
Proof: run unit | ✓ startTestBranch > migrates the branch after its operations finish

**C9** - Integration files query the run's branch, not `DATABASE_URL` (TEST-04, AC 4)
Proof: run int | ✓ test database isolation > connects to the run's Neon branch, not DATABASE_URL

**C10** - Teardown deletes the branch (TEST-05, AC 5)
Proof: run unit | ✓ global setup > teardown deletes the test branch

**C11** - Each missing variable fails before any fetch, naming it (TEST-06, AC 6)
Proof: run unit | ✓ startTestBranch > names each missing variable before calling Neon

**C12** - A non-2xx Neon reply fails with method, path, status and Neon's message (TEST-07, AC 7)
Proof: run unit | ✓ startTestBranch > reports a failed Neon call with method, path, status and message

**C13** - Neither the API key nor a connection string appears in errors or logs (TEST-08, AC 8)
Proof: run unit | ✓ startTestBranch > never prints the API key or a connection string

**C14** - The unit project passes with no Neon variables and no database (TEST-09, AC 9)
Proof: `env -i PATH="$PATH" HOME="$HOME" pnpm test:unit`

**C15** - A failed delete is logged with the branch id and does not throw (TEST-10)
Proof: run unit | ✓ startTestBranch > logs a failed delete with the branch id

**C16** - A failed migration deletes the branch, then fails the run (TEST-11)
Proof: run unit | ✓ startTestBranch > deletes the branch when migration fails

**C17** - Compose has one `neondatabase/neon_local` service with the four env keys, `DELETE_BRANCH` default `true` (DEV-01, AC 1)
Proof: run unit | ✓ repo layout > compose runs Neon Local only

**C18** - `cli migrate` reaches the Neon Local branch through `neon-http` (DEV-02, AC 2)
Proof: `docker compose --env-file .env.local up -d --wait && DATABASE_URL=postgres://neon:npg@localhost:5432/neondb DATABASE_URL_UNPOOLED= pnpm tsx --env-file=.env src/cli.ts migrate`

**C19** - No `postgres:17`, `local-neon-http-proxy`, `docker/initdb.sql` or `db.localtest.me` routing remains (DEV-04, AC 4)
Proof: run unit | ✓ repo layout > has no local Postgres stack

**C20** - `.env.example` documents the Neon variables and not `TEST_DATABASE_URL` (DOC-01, AC 1)
Proof: run unit | ✓ repo layout > env example documents every variable

**C21** - RUNNING.md and CLAUDE.md never mention the old stack (DOC-02, AC 2)
Proof: run unit | ✓ repo layout > docs describe Neon, not the old Postgres stack

---

## Handoff

**Settled mid-build:** 2026-11-22 - user: "can you use .env.local?" -> C18 proof reads Neon variables from `.env.local` and overrides `DATABASE_URL` with the Neon Local URL. Earlier: 2026-11-22 - user: "use .env.local for now.. is there a way?" -> T4 `globalSetup` loads `.env.local` as well as `.env` (neither overrides a variable already set; `.env` first, so it wins). Neon variables currently live in `.env.local`.
**Dispatched:** T1 worker returned (c9530e2); T2 worker returned (23316bf); T3 worker returned (48aaf94); T4 worker returned (8f5167a); T5 worker returned (a9b5e96); T6 worker returned (baf52a8); T7 worker returned (one sub-agent per task, run in order)
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7
```
