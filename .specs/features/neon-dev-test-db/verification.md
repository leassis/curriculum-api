# neon-dev-test-db verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 858b95c
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `test/unit/cli.test.ts` `cli > migrate > prefers DATABASE_URL_UNPOOLED` | yes - asserts `migrate` called with `"direct"` while `DATABASE_URL` is `"pooled"` |
| C2 | `test/unit/cli.test.ts` `cli > migrate > falls back to DATABASE_URL` | yes - asserts `"pooled"`; the real-world blank `DATABASE_URL_UNPOOLED=` (as in `.env.example`) is not a case, but my probe of `||` semantics held |
| C3 | `test/unit/cli.test.ts` `cli > migrate > errors when neither is set` | yes - exit 1, `err` equals `["DATABASE_URL is required"]`, `migrate` not called |
| C4 | `test/unit/db/client.test.ts` `fetchEndpointFor > routes localhost to Neon Local over http` | yes - port number, port string, no port, 127.0.0.1 |
| C5 | `test/unit/db/client.test.ts` `fetchEndpointFor > routes any other host to https` | yes - `*.neon.tech` and `db.localtest.me`; asserts the exact URL |
| C6 | `test/unit/support/neon-branch.test.ts` `startTestBranch > forks TEST_PARENT_BRANCH_ID, falling back to PARENT_BRANCH_ID` | yes - preferred case sets both variables so the choice is observable; fallback asserts `br-parent`; path and bearer asserted |
| C7 | `test/unit/support/neon-branch.test.ts` `startTestBranch > sets expires_at one hour ahead` | yes - exact `2026-11-22T11:00:00Z` from `now` `10:00:00.123Z`; my probe at `2026-12-31T23:59:59.999Z` gave `2027-01-01T00:59:59Z`, exactly now+1h truncated to the second. One case only, but a wrong TTL or sign fails it |
| C8 | `test/unit/support/neon-branch.test.ts` `startTestBranch > migrates the branch after its operations finish` | yes - 3 polls, `migrate` ordered after the last poll, called with the branch URI |
| C9 | `test/integration/db/isolation.test.ts` `test database isolation > connects to the run's Neon branch, not DATABASE_URL` | no - the host comparison is skipped when `DATABASE_URL` is unset, and `current_database()` is asserted only as `expect.any(String)` (see F3) |
| C10 | `test/unit/support/global-setup.test.ts` `global setup > teardown deletes the test branch` | yes for "teardown deletes"; "passed or failed" rests on Vitest and no test shows it (see F4) |
| C11 | `test/unit/support/neon-branch.test.ts` `startTestBranch > names each missing variable before calling Neon` | no - `PARENT_BRANCH_ID` is tried only with `TEST_PARENT_BRANCH_ID` unset, which is the AC; the fail-before-any-test half is not exercised at `globalSetup` (see F6) |
| C12 | `test/unit/support/neon-branch.test.ts` `startTestBranch > reports a failed Neon call with method, path, status and message` | no - only the create POST, and `toThrow(string)` is a substring match (see F5) |
| C13 | `test/unit/support/neon-branch.test.ts` `startTestBranch > never prints the API key or a connection string` | no - the migrate-failure error is `new Error("boom")` and the thrown error is discarded, so a rethrown error carrying the URI passes (see F1) |
| C14 | `env -i PATH="$PATH" HOME="$HOME" pnpm test:unit` | yes - rerun by me at d682c75: 53 files passed with no environment; `globalSetup` is on the integration project only |
| C15 | `test/unit/support/neon-branch.test.ts` `startTestBranch > logs a failed delete with the branch id` | yes - `stop()` resolves, log contains `could not delete test branch br-new` |
| C16 | `test/unit/support/neon-branch.test.ts` `startTestBranch > deletes the branch when migration fails` | no - asserts a DELETE was the last call, not that it finished before the rejection; an un-awaited `stop()` passes (see F2) |
| C17 | `test/unit/repo-layout.test.ts` `repo layout > compose runs Neon Local only` | no - the three non-`DELETE_BRANCH` keys are checked by name only, not that each reads its own variable (see F7) |
| C18 | `docker compose --env-file .env.local up -d --wait && DATABASE_URL=postgres://neon:npg@localhost:5432/neondb DATABASE_URL_UNPOOLED= pnpm tsx --env-file=.env src/cli.ts migrate` | yes - exit 0 with `migrations applied` against the Neon Local URL; `migrate.ts` uses `drizzle-orm/neon-http` and imports `client.js` |
| C19 | `test/unit/repo-layout.test.ts` `repo layout > has no local Postgres stack` | yes - services keys, `postgres:17`, proxy name, `docker/initdb.sql`, and `db.localtest.me` under `src/` |
| C20 | `test/unit/repo-layout.test.ts` `repo layout > env example documents every variable` | yes - each variable present with a `# ` comment line above, `TEST_DATABASE_URL` absent |
| C21 | `test/unit/repo-layout.test.ts` `repo layout > docs describe Neon, not the old Postgres stack` | yes - five banned strings in both files, plus `Neon Local` present |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (Major, TEST-08) A migrate error that carries the connection string is rethrown unchanged, so the URI reaches the run output | `test/support/neon-branch.ts:116-119` rethrows `err` as is. My throwaway probe: `migrate` throwing `connect failed postgres://owner:s3cret@ep-test-123.neon.tech/neondb` came out of `startTestBranch` with `s3cret` in `message`. C13's test (`neon-branch.test.ts:168-178`) uses `new Error("boom")` and never reads the thrown error | rethrow a sanitized error (replace the URI and the key in `message`), and assert in C13 that a migrate error holding the URI and the key reaches the caller without either | 7ad88b2 |
| F2 (Minor, TEST-11) The branch delete is not proven to finish before the run fails | `neon-branch.test.ts:198-206` checks `calls.at(-1)` after the rejection; the fake records a call when `fetch` is invoked, so `void stop(); throw err` passes | record `DELETE` completion in the fake and assert it settled before `startTestBranch` rejected | 7ad88b2 |
| F3 (Minor, TEST-04) The isolation test can pass without comparing against `DATABASE_URL` and asserts the database name only as a string | `test/integration/db/isolation.test.ts:10-15` - `if (dev)` skips the comparison; `expect.any(String)` | fail when `DATABASE_URL` is unset, or provide a known dev host; assert the name equals the branch's database (`neondb`) | 625edfd |
| F4 (Minor, TEST-05) "Whether tests passed or failed" is not shown by any test | `global-setup.test.ts:39-45` calls the returned teardown by hand; nothing shows Vitest runs it after a red run, and the proof does not check for a leftover branch | assert the returned value is the teardown Vitest registers (documented behaviour), or run a deliberately failing integration file once and list branches; record in proofs | 8be6542 |
| F5 (Minor, TEST-07) Non-2xx is proven only for the create POST, and the message by substring | `neon-branch.test.ts:152-158`. My probe: a GET operation 502 with an HTML body yields `Neon API GET /projects/p/operations/o returned 502` (no message), which is correct but untested | add a case for a poll and a DELETE returning non-2xx, and use an exact-match message | 7ad88b2 |
| F6 (Minor, TEST-06) Fail-before-any-test is shown at `startTestBranch` only | `global-setup.test.ts` never sets a missing variable; `loaded` (the env files read) is collected but never asserted, so `.env` before `.env.local` and "never overrides" have no test | add a `globalSetup` case with `NEON_API_KEY` missing that rejects with `NEON_API_KEY is not set`, and assert `loaded` equals `[".env", ".env.local"]` | 8be6542 |
| F7 (Minor, DEV-01) Compose test checks key names, not their values | `repo-layout.test.ts:158-164` | assert `NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID` each equal their own `${...}` | 625edfd |
| F8 (Minor, TEST-04) The no-env-read rule is a regex over two spellings | `repo-layout.test.ts:228-230` matches `process.env.X` and `process.env["X"]`; destructuring or `env.DATABASE_URL` passes. I grepped `test/` by hand: only `isolation.test.ts:10` reads `DATABASE_URL`, nothing reads `TEST_DATABASE_URL` from the environment, so the claim holds today | widen the pattern to any `DATABASE_URL` token outside string literals passed to `io()` fixtures, or accept as is | 625edfd |
| F9 (Minor, process) `proofs.md` is at 858b95c while HEAD is d682c75, and `globalSetup` also loads `.env.local`, which the approved spec's "Env file" row (`.env` only) does not name | `proofs.md:3`; `test/support/global-setup.ts:12`; Handoff in tasks.md records the user's request | rerun `check_proofs.py` at HEAD; append a requirement for `.env.local` loading with its own check rather than editing the approved row | 9680482 |

Other probes: spec ordering for TEST-05/10/11 is correct in code (delete awaited in `catch` before rethrow, `stop` never throws, failed delete logs only the branch id). A failed Neon operation, a missing connection URI, and a failing poll all delete the branch (probed). `test/` holds no other read of `DATABASE_URL` or `TEST_DATABASE_URL`. The unit project ran with `env -i` and passed. `.env` and `.env.local` values were not read or printed.
