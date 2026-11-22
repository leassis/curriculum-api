# admin-core proofs

**HEAD**: 1652ca3
**Tree**: clean
**Shell**: /bin/sh
**Result**: 39 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✓ admin login > answers 401 Invalid password on a wrong password` | pass |
| C2 | `run unit / ✓ admin login > renders a password form` | pass |
| C3 | `run unit / ✓ admin login > sets curr_admin and redirects on the right password` | pass |
| C4 | `run unit / ✓ admin login > clears the cookie and redirects on logout` | pass |
| C5 | `run unit / ✓ admin login > treats a missing password field as a failed attempt` | pass |
| C6 | `run unit / ✓ admin auth service > waits 500 ms before recording a failure` | pass |
| C7 | `run unit / ✓ admin auth service > refuses the sixth attempt even with the right password` | pass |
| C8 | `run unit / ✓ admin auth service > starts a new window after 15 minutes` | pass |
| C9 | `run unit / ✓ admin login > answers 429 when the ip is throttled` | pass |
| C10 | `run int / ✓ admin login throttle > refuses the sixth attempt with the right password` | pass |
| C11 | `run int / ✓ admin login attempt repository > counts parallel failures atomically` | pass |
| C12 | `run int / ✓ admin login attempt repository > isolates ip hashes and windows` | pass |
| C13 | `run unit / ✓ admin profile > prefills the form` | pass |
| C14 | `run unit / ✓ admin profile > saves valid fields and shows Saved` | pass |
| C15 | `run unit / ✓ admin profile > rejects an empty prompt without saving` | pass |
| C16 | `run unit / ✓ admin profile > rejects a master cv containing a personal info value` | pass |
| C17 | `run int / ✓ admin profile with database > keeps the profile unchanged when the pii guard rejects` | pass |
| C18 | `run int / ✓ admin profile with database > serves the saved master cv and prompts to the next read` | pass |
| C19 | `run int / ✓ admin profile with database > creates profile row 1 on first save` | pass |
| C20 | `run unit / ✓ admin profile > uses the new personal info value on the next save` | pass |
| C21 | `run unit / ✓ admin settings > renders every key with override or fallback` | pass |
| C22 | `run unit / ✓ admin settings > saves each key and shows Saved` | pass |
| C23 | `run unit / ✓ admin settings > rejects an invalid limit and saves nothing` | pass |
| C24 | `run int / ✓ admin settings with database > applies the model override to the next public call` | pass |
| C25 | `run unit / ✓ admin personal info > lists fields with a masked value` | pass |
| C26 | `run unit / ✓ admin personal info > never renders a decrypted value in the list` | pass |
| C27 | `run unit / ✓ admin personal info > creates a field and returns the list` | pass |
| C28 | `run unit / ✓ admin personal info > rejects invalid input naming the field` | pass |
| C29 | `run unit / ✓ admin personal info > shows an empty state` | pass |
| C30 | `run unit / ✓ admin personal info > updates a field and keeps the value when empty` | pass |
| C31 | `run unit / ✓ admin personal info > deletes a field after confirmation` | pass |
| C32 | `run unit / ✓ admin personal info > reveals the value with no-store` | pass |
| C33 | `run unit / ✓ admin personal info > answers 404 for a missing key` | pass |
| C34 | `run int / ✓ admin dashboard > shows active chats, resumes and usage today` | pass |
| C35 | `run int / ✓ admin dashboard > shows zero for each count when empty` | pass |
| C36 | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | pass |
| Build | `pnpm build` | pass |
| Build | `pnpm typecheck` | pass |
| Build | `pnpm lint` | pass |

## Output

`Run unit` - exit 0

```
 ✓ |unit| test/unit/llm/pii-guard.test.ts > pii guard > redacts every occurrence 1ms
 ✓ |unit| test/unit/cli.test.ts > cli > unknown command prints usage and exits 1 1ms
 ✓ |unit| test/unit/services/errors.test.ts > domain errors > each class carries its code and status 3ms
 ✓ |unit| test/unit/services/errors.test.ts > domain errors > PiiLeakError names the field key and ConfigError lists every field 0ms
 ✓ |unit| test/unit/app/openapi.test.ts > openapi > lists api routes and no admin route 19ms
 ✓ |unit| test/unit/db/schema.test.ts > drizzle config > targets curriculum_api with snake_case 1ms
 ✓ |unit| test/unit/db/schema.test.ts > schema > declares seven tables in curriculum_api 1ms
 ✓ |unit| test/unit/db/client.test.ts > db client > routes db.localtest.me to the local proxy 1ms
 ✓ |unit| test/unit/container.test.ts > container > constructs every repository and service without io 4ms
 ✓ |unit| test/unit/examples/node-server.test.ts > node example > uses port 3001 and insecure cookies 1ms

 Test Files  32 passed (32)
      Tests  93 passed (93)
   Start at  03:22:30
   Duration  2.35s (import 70%, tests 22%, transform 7%, worker 1%)
```

`Run int` - exit 0

```
 ✓ |integration| test/integration/admin/settings.test.ts > admin settings with database > applies the model override to the next public call 1450ms
 ✓ |integration| test/integration/services/settings.service.test.ts > SettingsService > override change applies on next call 1250ms
 ✓ |integration| test/integration/services/personal-info.service.test.ts > PersonalInfoService > stores ciphertext only 1135ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > creates the profile row with default prompts 414ms
 ✓ |integration| test/integration/db/seed.test.ts > seed > leaves an existing profile unchanged 599ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows zero for each count when empty 313ms
 ✓ |integration| test/integration/admin/dashboard.test.ts > admin dashboard > shows active chats, resumes and usage today 616ms
 ✓ |integration| test/integration/db/cleanup.test.ts > cleanup > deletes rows older than 30 days 888ms
 ✓ |integration| test/integration/repositories/profile.repository.test.ts > ProfileRepository > upsert writes row 1 and updated_at 655ms
 ✓ |integration| test/integration/cli.test.ts > cli > migrate runs and requires DATABASE_URL 420ms

 Test Files  15 passed (15)
      Tests  25 passed (25)
   Start at  03:22:33
   Duration  29.76s (tests 86%, import 14%)
```

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` - exit 0

```
CLI tsup v9.0.0
CLI Using tsup config: /Users/leassis/workspace/curriculum-api/tsup.config.ts
CLI Target: node22
CLI Cleaning output folder
ESM Build start
ESM dist/cli.js            3.00 KB
ESM dist/chunk-NY6RKQJR.js 6.13 KB
ESM dist/chunk-JM7MLCCK.js 9.53 KB
ESM dist/index.js          19.50 KB
ESM dist/admin-23LVKXO6.js 75.45 KB
ESM ⚡️ Build success in 17ms
DTS Build start
DTS ⚡️ Build success in 1164ms
DTS dist/index.d.ts 4.39 KB
Checked 123 files in 48ms. No fixes applied.
```
