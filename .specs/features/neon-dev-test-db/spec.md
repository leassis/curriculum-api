# Neon Dev and Test Databases Specification

**Approved**: 2026-11-22 - user: "Approve spec"

## Problem Statement

Local development and integration tests share one Docker Postgres, and the only thing keeping them apart is which database name each URL names. The Owner's `.env` points `DATABASE_URL` at `curriculum_test`, so every `pnpm test:int` wipes the development data. curriculum-ai avoids this with Neon: development runs on Neon Local (an ephemeral branch of the Neon `dev` branch), and checks run on a throwaway Neon branch created through the Neon API. curriculum-api adopts the same strategy.

## Goals

- [ ] Integration tests run on their own throwaway Neon branch, so no run can touch the development database.
- [ ] Local development runs on Neon Local, the same container setup curriculum-ai uses; the local Postgres stack is gone.
- [ ] `migrate` uses a direct (unpooled) connection when one is configured.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Changes to curriculum-ai | User: changes only in curriculum-api; curriculum-ai is a reference |
| `.github/workflows/ci.yml` | User: "nao tem github"; the file is left untouched |
| Offline development without Neon | User chose to remove the local Postgres stack (answer 2a) |
| Production database, deploy, Neon branch for production | Not part of the request |
| devbox / direnv / `.env.local` toolchain from curriculum-ai | The request is the docker-compose strategy; curriculum-api keeps `.env` and `--env-file=.env` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Test database source | A Neon branch created per integration run by Vitest `globalSetup`, migrated, deleted in teardown | User answer 1a | y |
| Local Postgres stack | `postgres:17`, `local-neon-http-proxy`, `docker/initdb.sql` and the `db.localtest.me` -> `:4444` routing are removed | User answer 2a | y |
| Pending `DATABASE_URL_UNPOOLED` diff | Folded into this feature (MIG criteria) | User answer 3a | y |
| Parent branch of the test branch | `TEST_PARENT_BRANCH_ID`, falling back to `PARENT_BRANCH_ID` (same shape as curriculum-ai's `GATE_PARENT_BRANCH_ID`) | Lets tests fork a different branch than Neon Local without forcing a second variable | y - spec approved |
| Test branch lifetime safety net | Branch created with `expires_at` 1 hour ahead, so Neon deletes it if teardown never runs | Same value as curriculum-ai's `BRANCH_TTL_MS` | y - spec approved |
| `TEST_DATABASE_URL` | No longer set by the developer; `globalSetup` produces the URL of the branch and hands it to test files | The source (01-curriculum-api.md §488) allows "a Neon branch"; a developer-set URL is what let tests hit the dev DB | y - spec approved |
| Env file | Neon variables live in `.env`; `docker compose` reads it, and the integration run loads it | curriculum-api scripts already use `--env-file=.env` | y - spec approved |
| Neon Local + `neon-http` driver | `src/db/client.ts` routes the Neon Local host to its HTTP `/sql` endpoint; exact host, port and TLS settings settled in Design against Neon Local docs | Not confirmed yet from documentation; Design verifies before Tasks | y - spec approved |
| AD-002 | New AD-005 supersedes the Docker Postgres part of AD-002 (`neon-http` everywhere stays) | Records the change of decision | y - spec approved |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Integration tests on a throwaway Neon branch ⭐ MVP

**User Story**: As the Owner, I want `pnpm test:int` to run on a database created for that run so that tests never wipe my development data.

**Why P1**: This is the request.

**Acceptance Criteria**:

1. WHEN an integration run starts THEN the test setup SHALL create a Neon branch in `NEON_PROJECT_ID` whose parent is `TEST_PARENT_BRANCH_ID`, or `PARENT_BRANCH_ID` when `TEST_PARENT_BRANCH_ID` is unset. <!-- TEST-01 -->
2. WHEN the test setup creates the branch THEN it SHALL set the branch `expires_at` to 1 hour after creation. <!-- TEST-02 -->
3. WHEN the branch is ready THEN the test setup SHALL apply the Drizzle migrations to it before the first test file runs. <!-- TEST-03 -->
4. The integration test files SHALL connect only to the branch created for the run, never to `DATABASE_URL`. <!-- TEST-04 -->
5. WHEN the integration run ends, whether tests passed or failed, THEN the test setup SHALL delete the branch it created. <!-- TEST-05 -->
6. IF `NEON_API_KEY`, `NEON_PROJECT_ID`, or both `TEST_PARENT_BRANCH_ID` and `PARENT_BRANCH_ID` are unset THEN the test setup SHALL fail before any test runs with a message naming the missing variable. <!-- TEST-06 -->
7. IF a Neon API call returns a non-2xx status THEN the test setup SHALL fail with the HTTP method, path, status and Neon's `message`. <!-- TEST-07 -->
8. The test setup SHALL never print `NEON_API_KEY` or a connection string. <!-- TEST-08 -->
9. The unit test project SHALL run without Neon credentials or network access. <!-- TEST-09 -->

**Independent Test**: Run `pnpm test:int` with `DATABASE_URL` pointing at a database holding a known row; the suite passes, the row is still there, and the Neon project lists no leftover test branch.

---

### P1: Local development on Neon Local

**User Story**: As the Owner, I want `docker compose up -d --wait` to start Neon Local so that `pnpm dev`, `migrate` and `seed` run on an ephemeral branch of my Neon `dev` branch, like curriculum-ai.

**Why P1**: User chose Neon for development and removing the local Postgres.

**Acceptance Criteria**:

1. The `docker-compose.yml` SHALL define one service, `neondatabase/neon_local`, configured from `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` and `DELETE_BRANCH` (default `true`). <!-- DEV-01 -->
2. WHEN `DATABASE_URL` points at Neon Local THEN `pnpm dev`, `cli migrate` and `cli seed` SHALL run their queries through the `neon-http` driver against the Neon Local branch. <!-- DEV-02 -->
3. WHEN `DATABASE_URL` points at a `*.neon.tech` host THEN the client SHALL send queries to `https://<host>/sql`. <!-- DEV-03 -->
4. The repository SHALL contain no `postgres:17` service, no `local-neon-http-proxy` service, no `docker/initdb.sql` and no `db.localtest.me` routing. <!-- DEV-04 -->

**Independent Test**: `docker compose up -d --wait`, `cli migrate`, `cli seed`, `pnpm dev`; the admin login page loads and the profile row exists on the Neon Local branch.

---

### P1: Unpooled connection for migrate

**User Story**: As the Owner, I want `migrate` to use a direct Neon connection when one is configured so that DDL does not go through the pooler.

**Why P1**: Pending diff folded in (answer 3a).

**Acceptance Criteria**:

1. WHEN `cli migrate` runs with `DATABASE_URL_UNPOOLED` set THEN it SHALL migrate `DATABASE_URL_UNPOOLED`. <!-- MIG-01 -->
2. WHEN `cli migrate` runs with only `DATABASE_URL` set THEN it SHALL migrate `DATABASE_URL`. <!-- MIG-02 -->
3. IF neither `DATABASE_URL_UNPOOLED` nor `DATABASE_URL` is set THEN `cli migrate` SHALL exit 1 with `DATABASE_URL is required`. <!-- MIG-03 -->

**Independent Test**: unit tests on `runCli(["migrate"])` with a mocked `migrate`.

---

### P2: Docs describe the new setup

**User Story**: As the Owner, I want RUNNING.md, `.env.example` and CLAUDE.md to describe Neon Local and the test branch so that setup works from the docs alone.

**Acceptance Criteria**:

1. The `.env.example` SHALL list `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID`, `TEST_PARENT_BRANCH_ID` and `DATABASE_URL_UNPOOLED`, and SHALL NOT list `TEST_DATABASE_URL`. <!-- DOC-01 -->
2. The RUNNING.md and CLAUDE.md SHALL contain no mention of `curriculum_test`, `db.localtest.me`, `TEST_DATABASE_URL` or the Postgres 17 + Neon HTTP proxy stack. <!-- DOC-02 -->

---

## Edge Cases

- IF branch deletion fails in teardown THEN the test setup SHALL report the failure with the branch id, and the branch SHALL still expire through `expires_at`. <!-- TEST-10 -->
- IF migrations fail on the new branch THEN the test setup SHALL delete the branch before failing the run. <!-- TEST-11 -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TEST-01 | P1: Test branch | Design | Pending |
| TEST-02 | P1: Test branch | Design | Pending |
| TEST-03 | P1: Test branch | Design | Pending |
| TEST-04 | P1: Test branch | Design | Pending |
| TEST-05 | P1: Test branch | Design | Pending |
| TEST-06 | P1: Test branch | Design | Pending |
| TEST-07 | P1: Test branch | Design | Pending |
| TEST-08 | P1: Test branch | Design | Pending |
| TEST-09 | P1: Test branch | Design | Pending |
| TEST-10 | P1: Test branch | Design | Pending |
| TEST-11 | P1: Test branch | Design | Pending |
| DEV-01 | P1: Neon Local | Design | Pending |
| DEV-02 | P1: Neon Local | Design | Pending |
| DEV-03 | P1: Neon Local | Design | Pending |
| DEV-04 | P1: Neon Local | Design | Pending |
| MIG-01 | P1: Unpooled migrate | Tasks | Pending |
| MIG-02 | P1: Unpooled migrate | Tasks | Pending |
| MIG-03 | P1: Unpooled migrate | Tasks | Pending |
| DOC-01 | P2: Docs | Tasks | Pending |
| DOC-02 | P2: Docs | Tasks | Pending |

**Coverage:** 20 total, 0 mapped to tasks, 20 unmapped ⚠️

---

## Sources

- User request: "da uma olhada no curriculum-ai como o docker-compose é configurado. queria usar a mesma estratégia aqui no curriculum-api / quero rodar integration tests in a different db than the local development."
- `../curriculum-ai/docker-compose.yml`, `../curriculum-ai/scripts/gate-branch.ts`, `../curriculum-ai/README.md` - reference strategy (Neon Local for dev, throwaway branch via Neon API)
- `curriculum-specs/01-curriculum-api.md` §488 - DB tests against a Neon branch or local Postgres
- `.specs/STATE.md` AD-002 - `neon-http` driver everywhere (kept); Docker Postgres part superseded

---

## Success Criteria

- [ ] `pnpm test:int` leaves the development database untouched and leaves no test branch behind.
- [ ] `docker compose up -d --wait` + `migrate` + `seed` + `pnpm dev` work against Neon Local.
