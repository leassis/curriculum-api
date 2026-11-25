# Testcontainers Test Database Specification

**Approved**: 2026-11-25 - user: "Approve"

## Problem Statement

Integration tests run against a throwaway Neon branch in `aws-eu-central-1`. From GitHub-hosted runners every query crosses the Atlantic: the same tests run about 7x slower in CI than locally (e.g. `recruiter-chat.repository.test.ts` 14.3s in CI against about 2.1s locally), the suite takes about 460s, and `owner-notes-migration.test.ts` fails its `beforeAll` at the 10s hook limit. Each run now starts a Postgres container with Testcontainers instead, locally and in CI.

## Goals

- [ ] Every integration run, local and CI, uses a Postgres 18 container started for that run, with no Neon API call.
- [ ] The full integration suite passes with Vitest's default `hookTimeout` (10s), `owner-notes-migration.test.ts` included.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Neon Local for local development (`pnpm db:up`, `docker-compose.yml`) | Dev keeps AD-005's Neon Local; only the test database changes |
| CI's "Start database services" step and the final `node dist/cli.js migrate` step | They exercise the packaged CLI against Neon Local, not the test suite |
| A `hookTimeout` / `testTimeout` change | User chose to revert the `hookTimeout: 30_000` fix; `testTimeout` stays 30s |
| Choosing Neon or a container per run (a switch) | User chose "Everywhere": one mode only |
| Rewriting the older `neon-dev-test-db` spec files | Superseded criteria are recorded in AD-013, not edited in place |
| Postgres extensions | No migration creates one |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Where the container is used | Every integration run, local and CI; the Neon test-branch code is removed | User: "Everywhere" | y |
| The uncommitted `hookTimeout: 30_000` | Reverted; not part of this feature | User: "Revert it" | y |
| Container image | `postgres:18` | The Neon project runs Postgres 18 | y |
| Testcontainers package | `@testcontainers/postgresql` as an exact-pinned dev dependency, a version published at least 14 days before install | Repo pins exact versions | y |
| Containers per run | One, started by `globalSetup` and shared by every integration file | Files already run serially and reset data with `resetDb` | y |
| Env files | `globalSetup` keeps loading `.env` then `.env.local` | `isolation.test.ts` compares against `DATABASE_URL` when it is set; dropping the load would silently skip that check locally | y |
| `TEST_PARENT_BRANCH_ID` | Removed from `.env.example`, docs and code | Its only reader was the Neon test-branch setup | y |
| Leftover containers after a crashed run | Left to Testcontainers' own reaper (Ryuk, its default) | Teardown cannot run when the process dies | y |
| CI confirmation | The criteria are proven by local runs; a green GitHub run is checked by the user after they push | Pushing needs the user's go-ahead | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Integration tests on a per-run Postgres container ⭐ MVP

**User Story**: As the Owner, I want integration tests to run on a local Postgres container so that CI is fast and no test depends on Neon's network distance.

**Why P1**: CI fails today and takes about 460s.

**Acceptance Criteria**:

1. WHEN an integration run starts THEN the test setup SHALL start one `postgres:18` container and provide its connection URL as `testDatabaseUrl` before the first test file runs. <!-- TC-01 -->
2. WHEN the container is ready THEN the test setup SHALL apply the Drizzle migrations to it before the first test file runs. <!-- TC-02 -->
3. WHEN the integration run ends, whether tests passed or failed, THEN the test setup SHALL stop the container it started. <!-- TC-03 -->
4. IF migrations fail on the new container THEN the test setup SHALL stop the container before failing the run. <!-- TC-04 -->
5. IF no container runtime is reachable THEN the test setup SHALL fail before any test file runs with an error whose message contains "Docker". <!-- TC-05 -->
6. The test setup SHALL make no Neon API call and SHALL need no `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` or `TEST_PARENT_BRANCH_ID`. <!-- TC-06 -->
7. The integration test files SHALL connect only to the run's container: its host and port SHALL differ from those of `DATABASE_URL` when that variable is set. <!-- TC-07 -->
8. The test setup SHALL never print a connection string. <!-- TC-08 -->
9. The unit test project SHALL run without Docker or network access. <!-- TC-09 -->
10. The full integration suite SHALL pass with Vitest's default `hookTimeout`. <!-- TC-10 -->

**Independent Test**: With Docker running and no Neon variable set, `pnpm test:int` passes and no `console.neon.tech` request is made.

---

### P2: Docs and env describe the container setup

**User Story**: As the Owner, I want the docs to say integration tests need Docker, not Neon credentials.

**Why P2**: Wrong docs send the next session back to Neon branches.

**Acceptance Criteria**:

1. The `.env.example` SHALL NOT list `TEST_PARENT_BRANCH_ID`, and its `NEON_API_KEY` and `NEON_PROJECT_ID` comments SHALL NOT mention the integration tests. <!-- DOC-03 -->
2. The RUNNING.md and CLAUDE.md SHALL say integration tests run on a Testcontainers Postgres container and need Docker, and SHALL NOT mention `TEST_PARENT_BRANCH_ID` or a throwaway Neon branch. <!-- DOC-04 -->
3. The `.specs/STATE.md` SHALL hold AD-013 recording the container decision, and AD-005 SHALL be marked superseded for integration tests. <!-- DOC-05 -->

**Independent Test**: Read the three files; `repo-layout.test.ts` asserts DOC-03 and DOC-04.

---

## Edge Cases

- IF the container stops during the run THEN the failing test SHALL report the connection error; the setup does not restart it. <!-- TC-11 -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TC-01 | P1: Container | Tasks | Pending |
| TC-02 | P1: Container | Tasks | Pending |
| TC-03 | P1: Container | Tasks | Pending |
| TC-04 | P1: Container | Tasks | Pending |
| TC-05 | P1: Container | Tasks | Pending |
| TC-06 | P1: Container | Tasks | Pending |
| TC-07 | P1: Container | Tasks | Pending |
| TC-08 | P1: Container | Tasks | Pending |
| TC-09 | P1: Container | Tasks | Pending |
| TC-10 | P1: Container | Tasks | Pending |
| TC-11 | P1: Container | Tasks | Pending |
| DOC-03 | P2: Docs | Tasks | Pending |
| DOC-04 | P2: Docs | Tasks | Pending |
| DOC-05 | P2: Docs | Tasks | Pending |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️

---

## Sources

- `.specs/features/neon-dev-test-db/spec.md` - TEST-01..11 (Neon test branch) are superseded by TC-01..11; DEV-*, MIG-* stay
- `.specs/STATE.md` AD-005 - the decision this feature amends
- CI log of 2026-11-24 (user) - `HookTimeoutError: Hook timed out in 10000ms` and per-test CI timings

## Success Criteria

- [ ] `pnpm test` passes locally with no Neon variable set and Docker running.
- [ ] CI integration time drops well below 460s (checked by the user after push).
