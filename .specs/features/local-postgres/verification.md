# Local Postgres verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at fa4916d
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `repo-layout.test.ts` `compose runs postgres:18-alpine only` | yes - exact service list, image, ports and `environment`, plus no `NEON`/`PARENT_BRANCH_ID` anywhere in the parsed file |
| C2 | `repo-layout.test.ts` `compose waits for pg_isready` | partly - `toContain("pg_isready")`; `["CMD-SHELL", "echo pg_isready"]` passes it (mutated, test green) |
| C3 | `repo-layout.test.ts` `compose keeps data in the pgdata volume` | no - `/^pgdata:\//` accepts any target; `pgdata:/var/lib/postgresql/data` passes (mutated, test green) and `postgres:18-alpine` refuses to start with a mount there (ran it) |
| C4 | `repo-layout.test.ts` `db scripts need no env file` | partly - asserts the script strings exactly, but adding `env_file: .env.local` to the compose `db` service keeps every repo-layout test green while `docker compose` then fails with no `.env.local` (mutated, `docker compose config` exit 1) |
| C5 | `repo-layout.test.ts` `ci uses the compose Postgres and no Neon variable` | yes - exact `DATABASE_URL`, no `NEON_`/`PARENT_BRANCH_ID` key and none in the whole file text |
| C6 | `docker compose up -d --wait && pnpm build && DATABASE_URL=... DATABASE_URL_UNPOOLED= node dist/cli.js migrate` | yes - runs the packaged CLI against the compose database; output shows `migrations applied to localhost:5432/curriculum` |
| C7 | `postgres-container.test.ts` `starts postgres:18-alpine and returns its URL` | yes - asserts the image passed to `startContainer` exactly; `defaultStart` forwards it unchanged (read) |
| C8 | `pnpm test:int` | yes - 28 files / 95 tests ran on the container C7 names |
| C9 | `repo-layout.test.ts` `env example lists no Neon variable` | yes - no `NEON_API_KEY=`/`NEON_PROJECT_ID=`/`PARENT_BRANCH_ID=` line and the line above `DATABASE_URL=` holds the local URL |
| C10 | `repo-layout.test.ts` `docs describe the local Postgres` | partly - the banned words hold, but `toContain("postgres:18-alpine")` is met by the `test:int` lines; rewriting the `pnpm db:up` lines of both CLAUDE.md:14 and RUNNING.md:29 to "a Neon dev branch" keeps it green (mutated) |
| C11 | `repo-layout.test.ts` `ci comments skip Neon Local` | yes |
| C12 | `grep -q "^### AD-014" ... && grep -A8 "^### AD-005" ... \| grep -q "superseded by AD-014"` | yes - removing the AD-014 clause from AD-005's Status makes it exit 1 (mutated); note STATE.md has a second, pre-existing `### AD-005` (node-postgres) at line 126 |
| C13 | `repo-layout.test.ts` `compose runs postgres:18-alpine only` | yes - `ports` must equal `["5432:5432"]`; a second compose project on 5432 failed with Docker's "port is already allocated" (ran it) |

Own examples: (1) LPG-04 - the real `docker-compose.yml` copied to a directory with no `.env.local` passes `docker compose config` (exit 0). (2) LPG-08 - a second compose project started while the dev `db` holds 5432 fails with "Bind for 0.0.0.0:5432 failed: port is already allocated". Both hold. The running dev container mounts `curriculum-api_pgdata` at `/var/lib/postgresql` and `PGDATA` is `/var/lib/postgresql/18/docker`, so the current config is right; F1 is about the test, not the file.

Stale-mention sweep (`git grep` over tracked files, excluding `docs/adr`, `.specs/features`): no `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` or `neon:npg@.../neondb` outside tests that assert their absence and historical STATE.md entries (AD-005, AD-013). One Neon Local mention remains in source (F5). `curriculum-specs/` mentions Neon branches as original design docs, not dev setup.

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 - C3 accepts a `pgdata` mount at which `postgres:18-alpine` will not start, so the test does not prove data persists | `test/unit/repo-layout.test.ts:192` - `stringMatching(/^pgdata:\//)`; with `pgdata:/var/lib/postgresql/data` the test is green and the image exits with "in 18+ ... unused mount/volume" | assert `volumes` equals `["pgdata:/var/lib/postgresql"]` exactly | |
| F2 - LPG-04 is only checked at the script string; compose itself can come to need `.env.local` with no test failing | `test/unit/repo-layout.test.ts:196-199`; adding `env_file: .env.local` to `services.db` keeps all 17 repo-layout tests green and `docker compose config` fails with no `.env.local` | in C4's test also assert `db.env_file` is undefined and the compose text has no `${` interpolation | |
| F3 - C10 does not hold that the docs describe `pnpm db:up` as `postgres:18-alpine` | `test/unit/repo-layout.test.ts:321` - the file-wide `toContain("postgres:18-alpine")` is met by the `test:int` lines (CLAUDE.md:23, RUNNING.md:55) | assert the line starting `pnpm db:up` in each file contains `postgres:18-alpine` | |
| F4 - C2 asserts the word, not a `pg_isready` probe of the `curriculum` database | `test/unit/repo-layout.test.ts:187` - `["CMD-SHELL", "echo pg_isready"]` passes | assert `healthcheck.test` equals `["CMD-SHELL", "pg_isready -U postgres -d curriculum"]` | |
| F5 - a source comment still names Neon Local, which the repo no longer runs | `src/db/client.ts:14` - "PgBouncer (Neon pooled and Neon Local) rejects the `statement_timeout` startup parameter" | change it to "PgBouncer (Neon pooled) rejects ..." | |
