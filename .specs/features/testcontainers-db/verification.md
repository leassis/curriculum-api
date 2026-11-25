# Testcontainers Test Database verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 690035a
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `postgres-container.test.ts` `starts postgres:18 and returns its URL` | yes - asserts the image list is exactly `["postgres:18"]` and the returned URL |
| C2 | `postgres-container.test.ts` `migrates the container before returning` | no - stays green when `deps.migrate(url)` is not awaited (mutation `void deps.migrate(url)`); the fake finishes after one microtask, before the caller resumes |
| C3 | `postgres-container.test.ts` `stops the container when migrations fail` | no - stays green when `stop()` is not awaited before the rethrow (mutation `void stop()`); the fake records `stop` synchronously |
| C4 | `postgres-container.test.ts` `fails naming Docker when no container runtime is reachable` | partly - holds for the one phrase it feeds; narrowing the code's regex to `/container runtime strategy/` stays green, and a runtime error naming neither word comes out without "Docker" |
| C5 | `postgres-container.test.ts` `never logs or throws a connection string` | yes - removing `scrub` fails it; own examples (URL in `cause`, `stop()` throwing during a migration failure, quoted upper-case `POSTGRESQL://`) are not leaked |
| C6 | `global-setup.test.ts` `provides the container URL` | yes - asserts `[["testDatabaseUrl", URI]]` exactly |
| C7 | `global-setup.test.ts` `teardown stops the container it started` | yes - no stop before teardown, exactly one after; the passed/failed half rests on Vitest running the returned teardown either way |
| C8 | `global-setup.test.ts` `needs no Neon variable` | yes - the four Neon variables are deleted from `process.env` and `.env` loading is faked |
| C9 | `global-setup.test.ts` `starts one container per run` | partly - counts one start across setup and teardown; no case stops the container mid-run, so TC-11's "the failing test reports the connection error" is not exercised |
| C10 | `repo-layout.test.ts` `test support makes no Neon API call` | yes - literal `console.neon.tech` only; TC-06's variable half is held by C8 |
| C11 | `isolation.test.ts` `connects to the run's container, not DATABASE_URL` | yes - probed: `DATABASE_URL` from `.env` reaches the worker, so the host:port comparison runs; it compares strings, so `127.0.0.1` vs `localhost` on the same port would pass (container host is `localhost`; Neon Local is on 5432, container on a random port) |
| C12 | `DOCKER_HOST=unix:///nonexistent.sock pnpm test:unit` | no - with that env Testcontainers falls back to another strategy and started `postgres:18` on this machine; the proof does not make Docker unreachable, and network access is not blocked at all |
| C13 | `! grep -q hookTimeout vitest.config.ts && pnpm test:int` | yes |
| C14 | `repo-layout.test.ts` `env example drops the test branch variable` | yes - no `TEST_PARENT_BRANCH_ID` line; both comments name docker compose and match no `/integration|test/i` |
| C15 | `repo-layout.test.ts` `docs describe the test container` | partly - word presence anywhere; RUNNING.md already said "Docker" (for Neon Local) before the feature, and only the exact phrase "throwaway Neon branch" is banned |
| C16 | `grep -q "^### AD-013" ... grep -q "superseded for integration tests"` | yes - heading plus AD-005 status line; AD-013's body is not checked but reads correctly |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (Major, TC-02) C2's test does not prove migrations finish before the URL is returned | `test/unit/support/postgres-container.test.ts:36-50` - with `void deps.migrate(url)` in `postgres-container.ts:49` C2 stays green (only C3/C5 fail, incidentally) | make the fake migrate finish after a macrotask (`await new Promise((r) => setTimeout(r, 5))`) and assert `migrationDone` right after `startTestDatabase` resolves | |
| F2 (Minor, TC-04) C3's test does not prove the container is stopped before the run fails | `test/unit/support/postgres-container.test.ts:52-62` - with `void stop().catch(() => {})` at `postgres-container.ts:52` C3 stays green; the fake `stop` pushes its event synchronously | have the fake `stop` record `stopped` only after an async tick and assert it is present when the rejection is observed | |
| F3 (Major, TC-09) C12's proof leaves Docker reachable | `DOCKER_HOST=unix:///nonexistent.sock` + `startTestDatabase` started a real `postgres:18` container here; `DOCKER_HOST=tcp://127.0.0.1:1` did fail with "Could not find a working container runtime strategy"; no part of the proof blocks network | use `DOCKER_HOST=tcp://127.0.0.1:1` (or a unit-project setup that fails any container start / socket connect) and add a network guard for the "no network access" half | |
| F4 (Minor, TC-05) a runtime failure phrased without "docker" or "container runtime" loses "Docker" | `test/support/postgres-container.ts:34-40`; own example `connect ECONNREFUSED 127.0.0.1:2375` is rethrown as-is; C4 feeds one phrase only | name Docker in every container-start failure (e.g. "could not start the postgres:18 test container - is Docker running?") and test a message containing neither word | |
| F5 (Minor, DOC-04) C15 passes without the docs tying integration tests to Docker | `test/unit/repo-layout.test.ts:302-314` - RUNNING.md held "Docker" at 3f5a110; ban is the exact phrase "throwaway Neon branch" | assert the `pnpm test:int` line/paragraph of each file names Testcontainers and Docker; ban `/Neon (test )?branch/` alongside "integration" | |
| F6 (Minor, TC-11) no check exercises a container that stops mid-run | `test/unit/support/global-setup.test.ts` `starts one container per run` counts starts only | add an integration case that stops a container and asserts the query rejects with a connection error and no new container starts, or reword C9 to the structural claim it proves | |

Notes (not spec failures): `test/support/db.ts:5` and `:29` still call the database "the run's throwaway Neon branch"; `.github/workflows/ci.yml:25-26` comment still says the integration tests create a throwaway branch through the Neon API (the Neon env is still needed for the docker compose step); `.env.local` (git-ignored) still sets `TEST_PARENT_BRANCH_ID`; `.specs/STATE.md` has two `### AD-005` headings (pre-existing at 3f5a110), and C16's `grep -A8` reads both.
