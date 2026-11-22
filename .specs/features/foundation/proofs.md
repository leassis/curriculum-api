# foundation proofs

**HEAD**: 012174d
**Tree**: clean
**Shell**: /bin/sh
**Result**: 80 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ repo layout > contains every foundation file` | pass |
| C2 | `run unit / ✓ repo layout > declares esm, node 22, pnpm and strict typescript` | pass |
| C3 | `pnpm build && test -f dist/index.js && test -f dist/index.d.ts && test -f dist/cli.js` | pass |
| C4 | `pnpm lint && pnpm typecheck && pnpm test` | pass |
| C5 | `run unit / ✓ check-architecture > rejects routes, admin and middleware importing db or repositories` | pass |
| C6 | `run unit / ✓ check-architecture > rejects platform imports in src` | pass |
| C7 | `run unit / ✓ repo layout > ci workflow runs lint, typecheck, test with db services and build` | pass |
| C8 | `run unit / ✓ repo layout > env example documents every variable` | pass |
| C9 | `run unit / ✓ drizzle config > targets curriculum_api with snake_case` | pass |
| C10 | `run unit / ✓ schema > declares seven tables in curriculum_api` | pass |
| C11 | `run int / ✓ migrate > creates seven tables and the migrations table in curriculum_api` | pass |
| C12 | `run int / ✓ migrate > creates nothing in public` | pass |
| C13 | `run int / ✓ migrate > second run applies nothing` | pass |
| C14 | `run int / ✓ constraints > profile rejects an id other than 1` | pass |
| C15 | `run int / ✓ constraints > rejects unknown status and visibility` | pass |
| C16 | `run int / ✓ constraints > rejects a duplicate recruiter token` | pass |
| C17 | `run int / ✓ constraints > deleting a resume nulls the chat link` | pass |
| C18 | `run unit / ✓ repo layout > ships exactly one migration` | pass |
| C19 | `run int / ✓ seed > creates the profile row with default prompts` | pass |
| C20 | `run int / ✓ seed > leaves an existing profile unchanged` | pass |
| C21 | `run unit / ✓ db client > routes db.localtest.me to the local proxy` | pass |
| C22 | `run unit / ✓ config > lists every missing required field` | pass |
| C23 | `run unit / ✓ config > rejects a short session secret and a bad pii key` | pass |
| C24 | `run unit / ✓ config > applies documented defaults` | pass |
| C25 | `run unit / ✓ app > serves health with an unreachable database` | pass |
| C26 | `run unit / ✓ app > health answers ok without a query` | pass |
| C27 | `run unit / ✓ app > serves routes under basePath` | pass |
| C28 | `run unit / ✓ api errors > maps each domain error to its status and code` | pass |
| C29 | `run unit / ✓ api errors > hides unknown errors as internal_error` | pass |
| C30 | `run unit / ✓ openapi > lists api routes and no admin route` | pass |
| C31 | `run unit / ✓ app > mounts every track router` | pass |
| C32 | `run unit / ✓ container > constructs every repository and service without io` | pass |
| C75 | `run unit / ✓ app > database failure answers internal_error` | pass |
| C33 | `run unit / ✓ session > round trips scope and cid` | pass |
| C34 | `run unit / ✓ session > rejects expired, foreign and altered tokens` | pass |
| C35 | `run unit / ✓ cookies > session cookie attributes` | pass |
| C36 | `run unit / ✓ cookies > admin cookie attributes` | pass |
| C43 | `run unit / ✓ requireSession > rejects missing, invalid and wrong scope sessions` | pass |
| C37 | `run unit / ✓ ip > reads forwarded then real ip` | pass |
| C38 | `run unit / ✓ ip > hashes salt plus ip as sha256 hex` | pass |
| C39 | `run unit / ✓ turnstile > accepts success and fails closed otherwise` | pass |
| C40 | `run unit / ✓ crypto > round trips with a random iv` | pass |
| C41 | `run unit / ✓ crypto > throws DecryptionError on wrong key or tampering` | pass |
| C42 | `run unit / ✓ security headers > sets base headers and admin csp` | pass |
| C44 | `run unit / ✓ ProfileService > get returns the row or throws NotFoundError` | pass |
| C76 | `run unit / ✓ ProfileService > update upserts row 1` | pass |
| C45 | `run int / ✓ ProfileRepository > upsert writes row 1 and updated_at` | pass |
| C46 | `run unit / ✓ SettingsService > model prefers override then config else ConfigError` | pass |
| C47 | `run unit / ✓ SettingsService > limit prefers override then config` | pass |
| C48 | `run unit / ✓ SettingsService > set validates keys and values and deletes on empty` | pass |
| C49 | `run int / ✓ SettingsService > override change applies on next call` | pass |
| C50 | `run int / ✓ PersonalInfoService > stores ciphertext only` | pass |
| C51 | `run unit / ✓ PersonalInfoService > create rejects invalid input` | pass |
| C52 | `run unit / ✓ PersonalInfoService > contactFor filters by channel and orders` | pass |
| C53 | `run unit / ✓ PersonalInfoService > allValues decrypts every field` | pass |
| C54 | `run unit / ✓ pii guard > matches case-insensitive text, phone digits and email` | pass |
| C55 | `run unit / ✓ pii guard > reports key and label only` | pass |
| C77 | `run unit / ✓ pii guard > ignores values shorter than 3 characters` | pass |
| C56 | `run unit / ✓ LlmService > refuses a body with pii without calling the provider` | pass |
| C57 | `run unit / ✓ LlmService > redacts pii in user messages` | pass |
| C58 | `run unit / ✓ LlmService > uses the settings model and max output tokens` | pass |
| C59 | `run unit / ✓ LlmService > throws LlmUnavailableError before the first chunk` | pass |
| C60 | `run unit / ✓ LlmService > logs model usage and latency and never secrets` | pass |
| C61 | `run unit / ✓ check-architecture > only the llm service imports the provider` | pass |
| C62 | `run unit / ✓ mock llm > records every prompt` | pass |
| C63 | `run unit / ✓ check-architecture > rejects a static admin import in app` | pass |
| C64 | `run unit / ✓ admin shell > serves htmx with immutable cache without a session` | pass |
| C65 | `run unit / ✓ admin shell > redirects page requests without a session to login` | pass |
| C66 | `run unit / ✓ admin shell > answers htmx requests without a session with HX-Redirect` | pass |
| C67 | `run unit / ✓ admin shell > rejects cross origin posts with 403` | pass |
| C68 | `run unit / ✓ admin shell > renders domain errors as html fragments` | pass |
| C69 | `run unit / ✓ admin shell > layout renders navigation and logout` | pass |
| C70 | `run int / ✓ cli > migrate runs and requires DATABASE_URL` | pass |
| C71 | `run unit / ✓ cli > hash-password prints a bcrypt hash that verifies` | pass |
| C72 | `run int / ✓ cleanup > deletes rows older than 30 days` | pass |
| C73 | `run unit / ✓ cli > unknown command prints usage and exits 1` | pass |
| C74 | `run unit / ✓ node example > uses port 3001 and insecure cookies` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
 ✓ |unit| test/unit/services/profile.service.test.ts > ProfileService > get returns the row or throws NotFoundError 2ms
 ✓ |unit| test/unit/services/profile.service.test.ts > ProfileService > update upserts row 1 0ms
 ✓ |unit| test/unit/app/openapi.test.ts > openapi > lists api routes and no admin route 18ms
 ✓ |unit| test/unit/db/schema.test.ts > drizzle config > targets curriculum_api with snake_case 2ms
 ✓ |unit| test/unit/db/schema.test.ts > schema > declares seven tables in curriculum_api 1ms
 ✓ |unit| test/unit/container.test.ts > container > constructs every repository and service without io 4ms
 ✓ |unit| test/unit/db/client.test.ts > db client > routes db.localtest.me to the local proxy 1ms
 ✓ |unit| test/unit/cli.test.ts > cli > hash-password prints a bcrypt hash that verifies 1074ms
 ✓ |unit| test/unit/cli.test.ts > cli > unknown command prints usage and exits 1 1ms
 ✓ |unit| test/unit/examples/node-server.test.ts > node example > uses port 3001 and insecure cookies 1ms

 Test Files  27 passed (27)
      Tests  66 passed (66)
   Start at  02:56:43
   Duration  1.74s (import 69%, tests 23%, transform 7%, worker 2%)
```

`Run int` - exit 0

```
 ✓ |integration| test/integration/db/constraints.test.ts > constraints > deleting a resume nulls the chat link 599ms
 ✓ |integration| test/integration/repositories/personal-info.repository.test.ts > PersonalInfoRepository > covers insert, find, update, delete and list order 1615ms
 ✓ |integration| test/integration/repositories/settings.repository.test.ts > SettingsRepository > round trips get, all, set and delete 1488ms
 ✓ |integration| test/integration/services/settings.service.test.ts > SettingsService > override change applies on next call 1255ms
 ✓ |integration| test/integration/services/personal-info.service.test.ts > PersonalInfoService > stores ciphertext only 1217ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > creates the profile row with default prompts 446ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > leaves an existing profile unchanged 600ms
 ✓ |integration| test/integration/db/cleanup.test.ts > cleanup > deletes rows older than 30 days 948ms
 ✓ |integration| test/integration/repositories/profile.repository.test.ts > ProfileRepository > upsert writes row 1 and updated_at 699ms
 ✓ |integration| test/integration/cli.test.ts > cli > migrate runs and requires DATABASE_URL 413ms

 Test Files  10 passed (10)
      Tests  16 passed (16)
   Start at  02:56:45
   Duration  20.19s (tests 87%, import 13%)
```

`pnpm build && test -f dist/index.js && test -f dist/index.d.ts && test -f dist/cli.js` - exit 0

```
CLI Using tsconfig: tsconfig.json
CLI tsup v9.0.0
CLI Using tsup config: /Users/leassis/workspace/curriculum-api/tsup.config.ts
CLI Target: node22
CLI Cleaning output folder
ESM Build start
ESM dist/cli.js            3.00 KB
ESM dist/chunk-NY6RKQJR.js 6.13 KB
ESM dist/chunk-5WHZS7JL.js 2.85 KB
ESM dist/index.js          23.05 KB
ESM dist/admin-MLWRZU5B.js 55.42 KB
ESM ⚡️ Build success in 16ms
DTS Build start
DTS ⚡️ Build success in 1212ms
DTS dist/index.d.ts 4.39 KB
```

`pnpm lint && pnpm typecheck && pnpm test` - exit 0

```


> curriculum-api@0.0.0 test /Users/leassis/workspace/curriculum-api
> vitest run


 RUN  v5.1.1 /Users/leassis/workspace/curriculum-api


 Test Files  37 passed (37)
      Tests  82 passed (82)
   Start at  02:57:10
   Duration  21.63s (tests 69%, import 29%, transform 2%)

Checked 112 files in 45ms. No fixes applied.
```
