# local-postgres proofs

**HEAD**: fa4916d
**Tree**: clean
**Shell**: /bin/sh
**Result**: 16 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ repo layout > compose runs postgres:18-alpine only` | pass |
| C2 | `run unit / ✓ repo layout > compose waits for pg_isready` | pass |
| C3 | `run unit / ✓ repo layout > compose keeps data in the pgdata volume` | pass |
| C4 | `run unit / ✓ repo layout > db scripts need no env file` | pass |
| C5 | `run unit / ✓ repo layout > ci uses the compose Postgres and no Neon variable` | pass |
| C6 | `docker compose up -d --wait && pnpm build && DATABASE_URL=postgres://postgres:postgres@localhost:5432/curricul` | pass |
| C7 | `run unit / ✓ test database container > starts postgres:18-alpine and returns its URL` | pass |
| C8 | `pnpm test:int` | pass |
| C9 | `run unit / ✓ repo layout > env example lists no Neon variable` | pass |
| C10 | `run unit / ✓ repo layout > docs describe the local Postgres` | pass |
| C11 | `run unit / ✓ repo layout > ci comments skip Neon Local` | pass |
| C12 | `grep -q "^### AD-014" .specs/STATE.md && grep -A8 "^### AD-005" .specs/STATE.md / grep -q "superseded by AD-01` | pass |
| C13 | `run unit / ✓ repo layout > compose runs postgres:18-alpine only` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
 ✓ |unit| test/unit/repo-layout.test.ts > repo layout > docs describe the test container 1ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > starts postgres:18-alpine and returns its URL 1ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > migrates the container before returning 6ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > stops the container when migrations fail 7ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > fails naming Docker when no container runtime is reachable 1ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > never logs or throws a connection string 7ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > provides the container URL 2ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > teardown stops the container it started 1ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > needs no Neon variable 0ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > starts one container per run 1ms

 Test Files  3 passed (3)
      Tests  26 passed (26)
   Start at  11:05:07
   Duration  648ms (import 90%, tests 6%, transform 3%, worker 1%)
```

`docker compose up -d --wait && pnpm build && DATABASE_URL=postgres://postgres:postgres@localhost:5432/curricul` - exit 0

```
CLI Cleaning output folder
ESM Build start
ESM dist/cli.js            3.34 KB
ESM dist/index.js          83.82 KB
ESM dist/admin-TN4VKOFU.js 349.48 KB
ESM dist/chunk-WUNDND5G.js 26.56 KB
ESM dist/chunk-YAMX5625.js 10.32 KB
ESM ⚡️ Build success in 28ms
DTS Build start
DTS ⚡️ Build success in 1410ms
DTS dist/index.d.ts 5.08 KB
migrations applied to localhost:5432/curriculum
 Container curriculum-api-db-1 Running 
 Container curriculum-api-db-1 Waiting 
 Container curriculum-api-db-1 Healthy
```

`pnpm test:int` - exit 0

```
> curriculum-api@0.3.0 test:int /Users/leassis/workspace/lassis-curriculum/curriculum-api
> vitest run --project integration


 RUN  v5.1.1 /Users/leassis/workspace/lassis-curriculum/curriculum-api


 Test Files  28 passed (28)
      Tests  95 passed (95)
   Start at  11:05:11
   Duration  17.34s (import 59%, tests 40%, transform 1%)
```

`grep -q "^### AD-014" .specs/STATE.md && grep -A8 "^### AD-005" .specs/STATE.md / grep -q "superseded by AD-01` - exit 0

```
(no output)
```
