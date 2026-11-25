# Local Postgres Specification

**Approved**: 2026-11-25 - user: "Approve"

## Problem Statement

Local development and CI start Neon Local (`neondatabase/neon_local`), which forks a Neon branch through the Neon API. Integration tests no longer need Neon (AD-013), so Neon Local is the only reason dev and CI hold `NEON_API_KEY`, `NEON_PROJECT_ID` and `PARENT_BRANCH_ID`. That key was exposed in a session transcript on 2026-11-25. Dev and CI move to a plain `postgres:18-alpine` container, so neither needs a Neon credential.

## Goals

- [ ] `pnpm db:up` and CI start a `postgres:18-alpine` database with no Neon variable.
- [ ] No tracked file outside production docs and `.specs/` reads or documents a Neon API variable.
- [ ] Dev, CI and integration tests use the same Postgres image.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Production database and its connection strings | Production stays on Neon; `DATABASE_URL_UNPOOLED` stays for it |
| Removing the `NEON_*` secrets from GitHub and rotating `NEON_API_KEY` | Account actions the user does in GitHub and the Neon console |
| Editing the git-ignored `.env` / `.env.local` | Local files with secrets; the user updates them from the new `.env.example` |
| Rewriting `docs/adr/*` and older `.specs/features/*` | Historical records; AD-014 records the change |
| A seed or data migration from Neon Local | Neon Local branches were throwaway (`DELETE_BRANCH=true`) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Dev database image | `postgres:18-alpine` | User: "I will replace non local to postgres 18 alpine as well" | y |
| PR base | New branch `feat/local-postgres` from `origin/main`, carrying the 22 Testcontainers commits that missed the owner-notes merge; PR targets `main` | User: "it is merged... check it"; those commits are not on `main` | y |
| Dev data across `db:down` / `db:up` | Named volume `pgdata` keeps it; `docker compose down -v` wipes it | Behaves like a normal local database | y |
| Integration-test image | `postgres:18-alpine` too | One image everywhere, smaller CI pull | y |
| Local credentials | user `postgres`, password `postgres`, database `curriculum`, port `5432`: `postgres://postgres:postgres@localhost:5432/curriculum` | Local only, never exposed beyond `localhost`; port matches today's `DATABASE_URL` | y |
| `pnpm db:up` / `db:down` | `docker compose up -d --wait` / `docker compose down`, no `--env-file` | Compose reads no variable any more; `--env-file .env.local` fails when the file is absent | y |
| How the PR is opened | Decided at PR time (gh is not installed here) | Needs the user's GitHub sign-in | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Dev and CI on a plain Postgres container ⭐ MVP

**User Story**: As the Owner, I want `pnpm db:up` and CI to run a plain Postgres 18 container so that neither needs a Neon API key.

**Why P1**: Removes the last non-production use of the Neon API key.

**Acceptance Criteria**:

1. The `docker-compose.yml` SHALL define exactly one service, `db`, with image `postgres:18-alpine`, port `5432:5432`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=curriculum`, and no Neon variable. <!-- LPG-01 -->
2. The `db` service SHALL have a `pg_isready` healthcheck so `docker compose up -d --wait` returns only when Postgres accepts connections. <!-- LPG-02 -->
3. The `db` service SHALL store its data in the named volume `pgdata`. <!-- LPG-03 -->
4. WHEN `pnpm db:up` runs with no `.env.local` THEN it SHALL start the `db` service. <!-- LPG-04 -->
5. WHEN CI runs THEN its job SHALL set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/curriculum` and pass no `NEON_*` or `PARENT_BRANCH_ID` variable. <!-- LPG-05 -->
6. WHEN the compose `db` service is up THEN `node dist/cli.js migrate` with that `DATABASE_URL` SHALL exit 0. <!-- LPG-06 -->
7. The integration-test container SHALL use `postgres:18-alpine`. <!-- LPG-07 -->

**Independent Test**: With no Neon variable set, `pnpm db:up && pnpm db:migrate` against the new URL succeeds, and `pnpm test` passes.

---

### P2: Docs and env describe the local Postgres

**User Story**: As the Owner, I want the docs and `.env.example` to describe the plain Postgres setup.

**Why P2**: Stale docs send setup back to Neon Local.

**Acceptance Criteria**:

1. The `.env.example` SHALL NOT list `NEON_API_KEY`, `NEON_PROJECT_ID` or `PARENT_BRANCH_ID`, and its `DATABASE_URL` comment SHALL show `postgres://postgres:postgres@localhost:5432/curriculum`. <!-- DOC-06 -->
2. The RUNNING.md and CLAUDE.md SHALL describe `pnpm db:up` as a `postgres:18-alpine` container and SHALL NOT mention Neon Local, `NEON_API_KEY` or `PARENT_BRANCH_ID`. <!-- DOC-07 -->
3. The `.github/workflows/ci.yml` comments SHALL NOT mention Neon Local. <!-- DOC-08 -->
4. The `.specs/STATE.md` SHALL hold AD-014 recording the change, and AD-005 SHALL be marked superseded by AD-014. <!-- DOC-09 -->

**Independent Test**: Read the files; `repo-layout.test.ts` asserts DOC-06 to DOC-08.

---

## Edge Cases

- IF port 5432 is already in use THEN `pnpm db:up` SHALL fail with Docker's port-allocation error; no port fallback is added. <!-- LPG-08 -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LPG-01 | P1: Plain Postgres | Tasks | Pending |
| LPG-02 | P1: Plain Postgres | Tasks | Pending |
| LPG-03 | P1: Plain Postgres | Tasks | Pending |
| LPG-04 | P1: Plain Postgres | Tasks | Pending |
| LPG-05 | P1: Plain Postgres | Tasks | Pending |
| LPG-06 | P1: Plain Postgres | Tasks | Pending |
| LPG-07 | P1: Plain Postgres | Tasks | Pending |
| LPG-08 | P1: Plain Postgres | Tasks | Pending |
| DOC-06 | P2: Docs | Tasks | Pending |
| DOC-07 | P2: Docs | Tasks | Pending |
| DOC-08 | P2: Docs | Tasks | Pending |
| DOC-09 | P2: Docs | Tasks | Pending |

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️

---

## Sources

- User, 2026-11-25: "I will replace non local to postgres 18 alpine as well"; "yes, use the spec-driven skill with sonnet, implement and create a PR"
- `.specs/STATE.md` AD-005 (Neon Local for dev) and AD-013 (Testcontainers for tests)

## Success Criteria

- [ ] `pnpm test` passes and CI passes with no `NEON_*` secret in the workflow.
- [ ] A fresh clone needs only Docker and `.env.example` values to run `pnpm db:up`, `db:migrate`, `db:seed`, `dev`.
