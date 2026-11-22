# foundation verification

**Verdict**: PASS
**Proofs**: `proofs.md` at b8be724
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `repo layout > contains every foundation file` | yes |
| C2 | `repo layout > declares esm, node 22, pnpm and strict typescript` | yes |
| C3 | `pnpm build && test -f dist/index.js && test -f dist/index.d.ts && test -f dist/cli.js` | yes |
| C4 | `pnpm lint && pnpm typecheck && pnpm test` | yes |
| C5 | `check-architecture > rejects routes, admin and middleware importing db or repositories` | yes |
| C6 | `check-architecture > rejects platform imports in src` | yes |
| C7 | `repo layout > ci workflow runs lint, typecheck, test with db services and build` | yes |
| C8 | `repo layout > env example documents every variable` | yes |
| C9 | `drizzle config > targets curriculum_api with snake_case` | yes |
| C10 | `schema > declares seven tables in curriculum_api` | yes |
| C11 | `migrate > creates seven tables and the migrations table in curriculum_api` | yes |
| C12 | `migrate > creates nothing in public` | yes |
| C13 | `migrate > second run applies nothing` | yes |
| C14 | `constraints > profile rejects an id other than 1` | yes |
| C15 | `constraints > rejects unknown status and visibility` | yes |
| C16 | `constraints > rejects a duplicate recruiter token` | yes |
| C17 | `constraints > deleting a resume nulls the chat link` | yes |
| C18 | `repo layout > ships exactly one migration` | yes |
| C19 | `seed > creates the profile row with default prompts` | yes |
| C20 | `seed > leaves an existing profile unchanged` | yes |
| C21 | `db client > routes db.localtest.me to the local proxy` | yes |
| C22 | `config > lists every missing required field` | yes |
| C23 | `config > rejects a short session secret and a bad pii key` | yes |
| C24 | `config > applies documented defaults` | yes |
| C25 | `app > serves health with an unreachable database` | yes |
| C26 | `app > health answers ok without a query` | yes |
| C27 | `app > serves routes under basePath` | yes |
| C28 | `api errors > maps each domain error to its status and code` | yes |
| C29 | `api errors > hides unknown errors as internal_error` | yes |
| C30 | `openapi > lists api routes and no admin route` | yes |
| C31 | `app > mounts every track router` | yes |
| C32 | `container > constructs every repository and service without io` | yes |
| C33 | `session > round trips scope and cid` | yes |
| C34 | `session > rejects expired, foreign and altered tokens` | yes |
| C35 | `cookies > session cookie attributes` | yes |
| C36 | `cookies > admin cookie attributes` | yes |
| C37 | `ip > reads forwarded then real ip` | yes |
| C38 | `ip > hashes salt plus ip as sha256 hex` | yes |
| C39 | `turnstile > accepts success and fails closed otherwise` | yes |
| C40 | `crypto > round trips with a random iv` | yes |
| C41 | `crypto > throws DecryptionError on wrong key or tampering` | yes |
| C42 | `security headers > sets base headers and admin csp` | yes |
| C43 | `requireSession > rejects missing, invalid and wrong scope sessions` | yes |
| C44 | `ProfileService > get returns the row or throws NotFoundError` | yes |
| C45 | `ProfileRepository > upsert writes row 1 and updated_at` | yes |
| C46 | `SettingsService > model prefers override then config else ConfigError` | yes |
| C47 | `SettingsService > limit prefers override then config` | yes |
| C48 | `SettingsService > set validates keys and values and deletes on empty` | yes |
| C49 | `SettingsService > override change applies on next call` | yes |
| C50 | `PersonalInfoService > stores ciphertext only` | yes |
| C51 | `PersonalInfoService > create rejects invalid input` | yes |
| C52 | `PersonalInfoService > contactFor filters by channel and orders` | yes |
| C53 | `PersonalInfoService > allValues decrypts every field` | yes |
| C54 | `pii guard > matches case-insensitive text, phone digits and email` | yes |
| C55 | `pii guard > reports key and label only` | yes |
| C56 | `LlmService > refuses a body with pii without calling the provider` | yes |
| C57 | `LlmService > redacts pii in user messages` | yes |
| C58 | `LlmService > uses the settings model and max output tokens` | yes |
| C59 | `LlmService > throws LlmUnavailableError before the first chunk` | yes |
| C60 | `LlmService > logs model usage and latency and never secrets` | yes |
| C61 | `check-architecture > only the llm service imports the provider` | yes |
| C62 | `mock llm > records every prompt` | yes |
| C63 | `check-architecture > rejects a static admin import in app` | yes |
| C64 | `admin shell > serves htmx with immutable cache without a session` | yes |
| C65 | `admin shell > redirects page requests without a session to login` | yes |
| C66 | `admin shell > answers htmx requests without a session with HX-Redirect` | yes |
| C67 | `admin shell > rejects cross origin posts with 403` | yes |
| C68 | `admin shell > renders domain errors as html fragments` | yes |
| C69 | `admin shell > layout renders navigation and logout` | yes |
| C70 | `cli > migrate runs and requires DATABASE_URL` | yes |
| C71 | `cli > hash-password prints a bcrypt hash that verifies` | yes |
| C72 | `cleanup > deletes rows older than 30 days` | yes |
| C73 | `cli > unknown command prints usage and exits 1` | yes |
| C74 | `node example > uses port 3001 and insecure cookies` | yes |
| C75 | `app > database failure answers internal_error` | yes |
| C76 | `ProfileService > update upserts row 1` | yes |
| C77 | `pii guard > ignores values shorter than 3 characters` | yes |

## Findings

None - read every named test body; each asserts the value its criterion fixes (status, code, header, SQLSTATE, exact lists). Own examples at HEAD: x-forwarded-for with padding spaces and an empty value falling back to x-real-ip, a PII value equal to a 3 character string, and a zero-TTL session all behave per spec. Manual: migrate on a dropped schema yields 7 tables plus the migrations table in curriculum_api and nothing in public; seed creates then reports exists; hash-password prints a $2b$12$ hash; `tsx examples/node/server.ts` answers 200 {"ok":true} on :3001/api/health and /api/openapi.json 200; /admin/profile answers 303 without a session; the empty public and recruiter routers answer 404 until a track fills them.
