# testcontainers-db proofs

**HEAD**: 6aa675d
**Tree**: clean
**Shell**: /bin/sh
**Result**: 19 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ test database container > starts postgres:18 and returns its URL` | pass |
| C2 | `run unit / ✓ test database container > migrates the container before returning` | pass |
| C3 | `run unit / ✓ test database container > stops the container when migrations fail` | pass |
| C4 | `run unit / ✓ test database container > fails naming Docker when no container runtime is reachable` | pass |
| C5 | `run unit / ✓ test database container > never logs or throws a connection string` | pass |
| C6 | `run unit / ✓ global setup > provides the container URL` | pass |
| C7 | `run unit / ✓ global setup > teardown stops the container it started` | pass |
| C8 | `run unit / ✓ global setup > needs no Neon variable` | pass |
| C9 | `run unit / ✓ global setup > starts one container per run` | pass |
| C10 | `run unit / ✓ repo layout > test support makes no Neon API call` | pass |
| C11 | `run int / ✓ test database isolation > connects to the run's container, not DATABASE_URL` | pass |
| C12 | `DOCKER_HOST=tcp://127.0.0.1:1 pnpm test:unit` | pass |
| C13 | `! grep -q hookTimeout vitest.config.ts && pnpm test:int` | pass |
| C14 | `run unit / ✓ repo layout > env example drops the test branch variable` | pass |
| C15 | `run unit / ✓ repo layout > docs describe the test container` | pass |
| C16 | `grep -q "^### AD-013" .specs/STATE.md && grep -A8 "^### AD-005" .specs/STATE.md / grep -q "superseded for inte` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
 ✓ |unit| test/unit/repo-layout.test.ts > repo layout > docs describe the test container 1ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > starts postgres:18 and returns its URL 2ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > migrates the container before returning 6ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > stops the container when migrations fail 7ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > fails naming Docker when no container runtime is reachable 1ms
 ✓ |unit| test/unit/support/postgres-container.test.ts > test database container > never logs or throws a connection string 7ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > provides the container URL 1ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > teardown stops the container it started 1ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > needs no Neon variable 0ms
 ✓ |unit| test/unit/support/global-setup.test.ts > global setup > starts one container per run 1ms

 Test Files  3 passed (3)
      Tests  21 passed (21)
   Start at  04:09:23
   Duration  546ms (import 88%, tests 8%, transform 3%, worker 1%)
```

`Run int` - exit 0

```
RUN  v5.1.1 /Users/leassis/workspace/lassis-curriculum/curriculum-api

 ✓ |integration| test/integration/db/isolation.test.ts > test database isolation > connects to the run's container, not DATABASE_URL 18ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  04:09:24
   Duration  2.59s (import 90%, tests 6%, transform 2%, worker 1%)
```

`DOCKER_HOST=tcp://127.0.0.1:1 pnpm test:unit` - exit 0

```
> curriculum-api@0.2.0 test:unit /Users/leassis/workspace/lassis-curriculum/curriculum-api
> vitest run --project unit


 RUN  v5.1.1 /Users/leassis/workspace/lassis-curriculum/curriculum-api


 Test Files  76 passed (76)
      Tests  656 passed (656)
   Start at  04:09:27
   Duration  6.74s (import 72%, tests 25%, transform 3%, worker 1%)
```

`! grep -q hookTimeout vitest.config.ts && pnpm test:int` - exit 0

```
> curriculum-api@0.2.0 test:int /Users/leassis/workspace/lassis-curriculum/curriculum-api
> vitest run --project integration


 RUN  v5.1.1 /Users/leassis/workspace/lassis-curriculum/curriculum-api


 Test Files  28 passed (28)
      Tests  95 passed (95)
   Start at  04:09:34
   Duration  15.85s (import 63%, tests 36%, transform 1%)
```

`grep -q "^### AD-013" .specs/STATE.md && grep -A8 "^### AD-005" .specs/STATE.md / grep -q "superseded for inte` - exit 0

```
(no output)
```
