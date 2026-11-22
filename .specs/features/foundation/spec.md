# Foundation Specification

**Approved**: 2026-11-22 - user: "approve foundation, write the design and tasks"

## Problem Statement

The repository is empty. Four feature tracks (`public-chat`, `admin-core`, `recruiter-chat`, `tailored-resumes`) must be built in parallel without merge conflicts. That needs one sequential first piece: the folder structure, tooling, Drizzle configuration in a dedicated schema, every table with a single initial migration, and the shared plumbing every track calls. This includes config, container, errors, sessions, crypto, the LLM gateway with its PII guard, the admin shell, and pre-mounted empty routers.

## Goals

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass on a clean checkout with Docker running.
- [ ] `migrate()` creates every table inside `curriculum_api` and nothing in `public`.
- [ ] Each track can be built touching only files it owns (no edits to `app.ts`, `container.ts`, `schema.ts` or `drizzle/`), per AD-003.
- [ ] `GET /api/health` answers through `examples/node/server.ts`.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Public chat routes, per-IP counter | `public-chat` track |
| Admin login/logout/throttle, dashboard, profile/settings/personal-info pages | `admin-core` track |
| Recruiter chat API and admin chats pages | `recruiter-chat` track |
| Tailored resumes, generation, print view, markdown download | `tailored-resumes` track |
| `chat_messages` table and log | Roadmap Phase 6; chat history is client-sent (Q9) |
| npm publish, Vercel/Lambda examples, README polish, branch protection | Roadmap Phase 5 |
| Svelte site (`leandroassis.dev`) | User: frontend not created now |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Scope of the whole effort | Roadmap Phases 0–4, API + admin side, plus `examples/node/server.ts` and `/api/openapi.json` | Q1 | y |
| Feature split | `foundation` then 4 parallel tracks (AD-003) | Q2 | y |
| Postgres schema | `curriculum_api`, migrations table in it (AD-001) | Q3 | y |
| DB driver and local DB | `neon-http` everywhere; Docker `postgres:17` + `local-neon-http-proxy` (AD-002) | Q4 | y |
| Package manager / name | pnpm; package name `curriculum-api` (unscoped) until an npm scope exists | Q5 - no scope given | y |
| Lint / format | Biome | Q6 | y |
| Admin auth | bcrypt hash in `ADMIN_PASSWORD_HASH` | Q7 | y |
| Login throttle storage | DB table `admin_login_attempts` (AD-004) | Q8 | y |
| Chat history | Client sends history, capped by `maxHistoryMessages` | Q9 | y |
| Retention | `curriculum-api cleanup` CLI deletes `public_usage` and `admin_login_attempts` rows older than 30 days | Q10 | y |
| Recruiter token | 24-char base64url from `crypto.getRandomValues`; `expiresAt` optional, no default | Q11 | y |
| `.specs/`, `GLOSSARY.md`, `docs/adr/` | Tracked in git | Q12 | y |
| Column naming | Drizzle `casing: "snake_case"` (TS camelCase, SQL snake_case) | Matches the SQL in 01-curriculum-api.md §5 | n |
| Local proxy routing | WHERE the `DATABASE_URL` host is `db.localtest.me`, the neon client sends queries to `http://db.localtest.me:4444/sql` | The documented `local-neon-http-proxy` convention; no extra public config field | n |
| Turnstile unreachable | Fail closed: treated as a failed captcha (403 `captcha_failed`) | A captcha that fails open is no captcha | n |
| Unknown error on `/api/*` | 500 `{ "error": "internal_error" }`, no message, no stack | §8: no stack traces in responses | n |
| Unauthenticated admin request | Full-page request → 303 to `/admin/login`; HTMX request (`HX-Request: true`) → 401 with `HX-Redirect: /admin/login` | HTMX ignores 3xx bodies for swaps | n |
| HTMX version | Vendored `htmx.min.js` 2.0.x pinned, served with `Cache-Control: public, max-age=31536000, immutable` | §5.3 "long cache headers" | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Folder structure and tooling ⭐ MVP

**User Story**: As a contributor, I want a strict TypeScript ESM project with one command each for lint, typecheck, test and build so that every track starts from the same checked baseline.

**Why P1**: Nothing else can be built or verified without it.

**Acceptance Criteria**:

1. The repository SHALL follow the layout of 01-curriculum-api.md §2, plus `docker-compose.yml`, `biome.json`, `vitest.config.ts`, `tsup.config.ts`, `.github/workflows/ci.yml` and `src/cli.ts`.
2. The project SHALL declare `"type": "module"`, `"engines": { "node": ">=22" }`, pnpm as `packageManager`, and TypeScript `strict: true`.
3. WHEN `pnpm build` runs THEN the build SHALL emit `dist/index.js`, `dist/index.d.ts` and `dist/cli.js` as ESM.
4. WHEN `pnpm lint`, `pnpm typecheck` and `pnpm test` run on a clean checkout with the Compose stack up THEN each SHALL exit 0.
5. IF a file under `src/routes/`, `src/admin/` or `src/middleware/` imports from `src/db/` or `src/repositories/` THEN `pnpm lint` SHALL fail naming that file.
6. IF a file under `src/` imports `@vercel/*`, `aws-sdk` or `@aws-sdk/*` THEN `pnpm lint` SHALL fail naming that file.
7. WHEN a pull request is opened THEN the CI workflow SHALL run lint, typecheck, test (with Postgres + `local-neon-http-proxy` services) and build, and SHALL fail if any step fails.
8. The repository SHALL contain `.env.example` listing every variable of 01-curriculum-api.md §10 with a one-line comment each.

**Independent Test**: Clean clone → `docker compose up -d` → the four commands exit 0; add `import "../db/client"` to a route file → lint fails.

---

### P1: Drizzle configuration and schema ⭐ MVP

**User Story**: As the Owner, I want all package tables in a dedicated `curriculum_api` schema, created by one idempotent migration, so that the package never collides with other tables in my database.

**Why P1**: Every track reads or writes these tables. The single migration is what allows parallel tracks (AD-003).

**Acceptance Criteria**:

1. `drizzle.config.ts` SHALL set dialect `postgresql`, schema `./src/db/schema.ts`, out `./drizzle`, `schemaFilter: ["curriculum_api"]`, `casing: "snake_case"` and `migrations: { schema: "curriculum_api" }`.
2. `src/db/schema.ts` SHALL declare every table through `pgSchema("curriculum_api")`: `profile`, `settings`, `personal_info`, `tailored_resumes`, `recruiter_chats`, `public_usage`, `admin_login_attempts`, with the columns of 01-curriculum-api.md §4 and AD-004.
3. WHEN `migrate(databaseUrl)` runs on an empty database THEN it SHALL create schema `curriculum_api` with the 7 tables and the Drizzle migrations table inside it.
4. WHEN `migrate(databaseUrl)` has run on an empty database THEN the `public` schema SHALL contain zero tables, sequences, types or functions created by the package.
5. WHEN `migrate(databaseUrl)` runs a second time THEN it SHALL apply no statement and SHALL resolve without error.
6. IF an insert into `profile` uses an `id` other than 1 THEN the database SHALL reject it with a check-constraint violation.
7. IF an insert sets `recruiter_chats.status` outside `active`/`revoked`, or `personal_info.visibility` outside `public`/`recruiter`/`print` THEN the database SHALL reject it with a check-constraint violation.
8. IF two `recruiter_chats` rows use the same `token` THEN the database SHALL reject the second with a unique violation.
9. WHEN a `tailored_resumes` row referenced by `recruiter_chats.tailored_resume_id` is deleted THEN that column SHALL become NULL and the chat row SHALL remain.
10. The `drizzle/` folder SHALL contain exactly one migration, and `files` in `package.json` SHALL ship it.
11. WHEN `curriculum-api seed` runs and no `profile` row exists THEN it SHALL insert row `id = 1` with `full_name = ''`, `headline = ''`, `master_cv = ''` and non-empty default prompts meeting 01-curriculum-api.md §7.
12. WHEN `curriculum-api seed` runs and the `profile` row exists THEN it SHALL leave the row unchanged and exit 0.
13. WHERE the `DATABASE_URL` host is `db.localtest.me`, `createDb` SHALL send queries to `http://db.localtest.me:4444/sql`.

**Independent Test**: Empty DB → `curriculum-api migrate` → `\dt curriculum_api.*` lists 7 tables plus the migrations table; `\dt public.*` lists none; run again → no change.

---

### P1: Config, app factory, errors and health ⭐ MVP

**User Story**: As a consumer of the package, I want `createApp(config)` to validate my config, do no I/O at startup, and map every domain error to one JSON shape so that I can mount it on any platform and debug misconfiguration fast.

**Why P1**: Every track's routes run inside this app and throw these errors.

**Acceptance Criteria**:

1. IF a required config field (§3) is missing or empty THEN `createApp` SHALL throw a `ConfigError` whose message names every invalid field.
2. IF `sessionSecret` decodes to fewer than 32 bytes, or `piiEncryptionKey` is not base64 of exactly 32 bytes THEN `createApp` SHALL throw a `ConfigError` naming that field.
3. WHEN optional config fields are omitted THEN `createApp` SHALL apply the defaults of 01-curriculum-api.md §3 (`basePath ""`, `secureCookies true`, limits 5/10/500/1200/1000/10/120).
4. WHEN `createApp` is called with a `databaseUrl` pointing at an unreachable host THEN it SHALL return an app without throwing, and `GET /api/health` SHALL answer 200.
5. WHEN `GET /api/health` is requested THEN the app SHALL answer 200 `{ "ok": true }` without issuing a database query.
6. WHERE `basePath` is set, the app SHALL serve every route under `<basePath>/api/*` and `<basePath>/admin/*`.
7. WHEN a handler under `/api/*` throws a domain error THEN the app SHALL answer with the status of 01-curriculum-api.md §2.1 (plus `ForbiddenError` → 403, `CaptchaFailedError` → 403) and body `{ "error": "<snake_case code>", "message"?: string }`.
8. IF a handler under `/api/*` throws a non-domain error THEN the app SHALL answer 500 `{ "error": "internal_error" }` with no stack trace or error message.
9. WHEN `GET /api/openapi.json` is requested THEN the app SHALL answer 200 with an OpenAPI 3.1 document that lists every route registered on the `/api` OpenAPI router and no `/admin` route.
10. The app SHALL mount `src/routes/public.ts`, `src/routes/recruiter.ts` and the admin routers `login`, `dashboard`, `profile`, `settings`, `personal-info`, `chats`, `resumes` as routers that exist (empty) after this feature, so that tracks edit only their own router file.
11. The container SHALL construct every repository and service named in 01-curriculum-api.md §2.1 (with `AdminLoginAttemptRepository` added), so that tracks fill class bodies without editing `container.ts`.

**Independent Test**: `createApp({})` throws listing all required fields; a valid config with an unreachable DB serves `/api/health`; a test route throwing `LimitReachedError` answers 429 `{ "error": "limit_reached" }`.

---

### P1: Security primitives ⭐ MVP

**User Story**: As a track implementer, I want tested helpers for sessions, captcha, client IP hashing and field encryption so that every track applies them the same way.

**Why P1**: Public, recruiter and admin flows all depend on them.

**Acceptance Criteria**:

1. WHEN a session is signed with scope `public`, `recruiter` (+ `cid`) or `admin` and verified with the same secret before expiry THEN verification SHALL return the same scope and `cid`.
2. IF a session token is expired, signed with another secret, or altered THEN verification SHALL return `null`.
3. WHEN the session cookie helper sets `curr_session` THEN the cookie SHALL carry `HttpOnly; SameSite=Strict; Path=<basePath>/api` and `Secure` unless `secureCookies` is false.
4. WHEN the admin cookie helper sets `curr_admin` THEN the cookie SHALL carry `HttpOnly; SameSite=Strict; Path=<basePath>/admin; Max-Age=28800` and `Secure` unless `secureCookies` is false.
5. WHEN a request carries `x-forwarded-for: a, b` THEN the client IP SHALL be `a`; WHEN it carries only `x-real-ip: c` THEN the client IP SHALL be `c`.
6. The IP hash SHALL be the lowercase hex SHA-256 of `ipHashSalt + ip`, and the raw IP SHALL not be stored or logged.
7. WHEN Turnstile siteverify answers `success: true` THEN captcha verification SHALL resolve true; IF it answers `success: false`, a non-2xx status, or the request fails THEN verification SHALL resolve false.
8. WHEN a value is encrypted and decrypted with the same `piiEncryptionKey` THEN decryption SHALL return the original value; two encryptions of one value SHALL produce different ciphertexts.
9. IF a ciphertext is decrypted with a different key or is altered THEN decryption SHALL throw `DecryptionError`.
10. The app SHALL set `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff` on every response, and on `/admin/*` a CSP of `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`.
11. IF a request guarded by `requireSession(scope)` has no `curr_session`, an invalid one, or one whose scope differs from `scope` THEN the middleware SHALL throw `UnauthorizedError`; otherwise it SHALL set `c.var.session` to `{ scope, cid? }`. (Added 2026-11-22 after approval: shared by `public-chat` and `recruiter-chat`, AD-003.)

**Independent Test**: Unit tests per helper; a request to `/api/health` shows the three headers.

---

### P1: Shared services - profile, settings, personal info ⭐ MVP

**User Story**: As a track implementer, I want one service each for the Profile, Settings Overrides and Personal Info Fields so that chats, admin and print read the same data the same way.

**Why P1**: Three or four tracks read each of these. Keeping them in `foundation` keeps the tracks independent.

**Acceptance Criteria**:

1. WHEN `profileService.get()` runs and row `id = 1` exists THEN it SHALL return its fields; IF no row exists THEN it SHALL throw `NotFoundError`.
2. WHEN `profileService.update(input)` runs THEN it SHALL upsert row `id = 1` and set `updated_at` to now.
3. WHEN `settingsService.model(area)` runs for `public`, `tailor` or `recruiter` THEN it SHALL return the `settings` row `model.<area>` if present, else `config.models.<area>`; IF neither exists THEN it SHALL throw `ConfigError` naming `model.<area>`.
4. WHEN `settingsService.limit(name)` runs THEN it SHALL return the integer in `settings` row `limits.<name>` if present, else the config value or default.
5. WHEN `settingsService.set(key, value)` runs with an empty value THEN it SHALL delete that override; IF the key is not one of `model.public|tailor|recruiter`, `limits.<§3 limit name>` or `print.pageSize` (allowlist in `src/services/settings-keys.ts`) THEN it SHALL throw `ValidationError`; IF a `limits.*` value is not a positive integer, or `print.pageSize` is not `A4` or `Letter`, THEN it SHALL throw `ValidationError`.
6. WHEN a Settings Override is changed THEN the next `model()` or `limit()` call SHALL return the new value without restarting the app.
7. WHEN `personalInfoService.create|update` stores a value THEN the `value_encrypted` column SHALL not contain the plaintext.
8. IF `personalInfoService.create` receives a key not matching `^[A-Z][A-Z0-9_]{0,31}$`, an existing key, an empty label or value, or a visibility outside `public|recruiter|print` THEN it SHALL throw `ValidationError` naming the field.
9. WHEN `personalInfoService.contactFor(channel)` runs THEN it SHALL return `{ key, label, value }[]` ordered by `sort_order` then `key`: channel `public` → visibility `public`; `recruiter` → `public` and `recruiter`; `print` → all.
10. WHEN `personalInfoService.allValues()` runs THEN it SHALL return every decrypted value, for the PII Guard only.

**Independent Test**: Service tests against the Compose DB: set `model.public` → `model("public")` returns it; delete → falls back to config; `contactFor("public")` excludes a `recruiter` field.

---

### P1: LLM gateway and PII Guard ⭐ MVP

**User Story**: As the Owner, I want every LLM call to pass one gateway that blocks my personal data so that no feature can leak it, by mistake or by a new code path.

**Why P1**: Three tracks call the LLM. The guard is mandatory (01-curriculum-api.md §4.1) and must exist before any of them.

**Acceptance Criteria**:

1. The PII Guard SHALL report a match WHEN a text contains a Personal Info Field value compared case-insensitively, with phone-like values (≥ 7 digits) compared on digits only and email values compared trimmed and lowercased.
2. WHEN the PII Guard reports a match THEN the result SHALL name the matching field's key and label and SHALL not include the value.
3. WHEN `llmService.stream()` or `llmService.generate()` is called and the system prompt or Career Body contains a Personal Info Field value THEN it SHALL throw `PiiLeakError` without calling the provider and SHALL log a warning naming the field key only.
4. WHEN a Visitor or Recruiter message contains a Personal Info Field value THEN `llmService` SHALL replace each occurrence with `[redacted]` before calling the provider.
5. WHEN `llmService` calls the provider THEN it SHALL use the model from `settingsService.model(area)` and the `maxOutputTokens` passed by the caller.
6. IF the provider fails before the first token THEN `llmService.stream()` SHALL throw `LlmUnavailableError`.
7. WHEN `llmService` completes a call THEN it SHALL log model ID, token usage and latency, and SHALL never log the API key, the prompt or a Personal Info Field value.
8. The codebase SHALL contain exactly one module that imports `@openrouter/ai-sdk-provider` (`src/llm/openrouter.ts`), and only `src/services/llm.service.ts` SHALL import it; `pnpm lint` SHALL fail otherwise.
9. The test kit SHALL provide a recording mock model that stores every prompt it receives, for the cross-track "no PII in any prompt" assertions.

**Independent Test**: With a field `EMAIL = a@b.com`: body `"Mail A@B.com"` → `PiiLeakError`, mock got 0 calls; visitor message `"is a@b.com yours?"` → mock got `"is [redacted] yours?"`.

---

### P1: Admin shell ⭐ MVP

**User Story**: As a track implementer, I want a lazily loaded admin router with layout, auth guard, CSRF, HTML error mapping and vendored HTMX so that admin pages in any track only render their own content.

**Why P1**: `admin-core`, `recruiter-chat` and `tailored-resumes` all add admin pages.

**Acceptance Criteria**:

1. The admin router SHALL be loaded with a dynamic `import()` on the first `/admin/*` request, and `src/app.ts` SHALL not import `src/admin/` statically.
2. WHEN `GET /admin/static/htmx.min.js` is requested THEN the app SHALL answer 200 with the vendored HTMX file, `Content-Type: text/javascript` and `Cache-Control: public, max-age=31536000, immutable`, without an admin session.
3. IF a full-page request to `/admin/*` (other than `/admin/login` and `/admin/static/*`) has no valid `curr_admin` session THEN the app SHALL answer 303 with `Location: <basePath>/admin/login`.
4. IF an HTMX request (`HX-Request: true`) to a protected admin route has no valid `curr_admin` session THEN the app SHALL answer 401 with `HX-Redirect: <basePath>/admin/login`.
5. IF a non-GET admin request has an `Origin` that differs from the request origin THEN the app SHALL answer 403 and SHALL not run the handler.
6. WHEN an admin handler throws a domain error THEN the app SHALL answer the mapped status with an HTML error fragment containing the error message, and SHALL not include a stack trace.
7. The layout SHALL render a navigation with links to Dashboard, Profile, Settings, Personal info, Resumes, Chats and a Logout button posting to `/admin/logout`.

**Independent Test**: `GET /admin` without cookie → 303 to login; same with `HX-Request: true` → 401 + `HX-Redirect`; `POST /admin/profile` with `Origin: https://evil.test` and a valid admin cookie → 403.

---

### P2: CLI and local runner

**User Story**: As the Owner, I want `curriculum-api migrate|seed|hash-password|cleanup` and a Node example server so that I can set up a database and run the app locally.

**Why P2**: `migrate`/`seed` are also reachable as library calls; the CLI is convenience plus the only way to make a password hash.

**Acceptance Criteria**:

1. WHEN `curriculum-api migrate` runs with `DATABASE_URL` set THEN it SHALL run `migrate()` and exit 0; IF `DATABASE_URL` is unset THEN it SHALL print `DATABASE_URL is required` and exit 1.
2. WHEN `curriculum-api hash-password` reads a password from stdin THEN it SHALL print a bcrypt hash (cost 12) that `bcryptjs.compare` accepts for that password.
3. WHEN `curriculum-api cleanup` runs THEN it SHALL delete `public_usage` rows with `day` older than 30 days and `admin_login_attempts` rows with `window_start` older than 30 days, and print the two counts.
4. IF the CLI gets an unknown command THEN it SHALL print the list of commands and exit 1.
5. WHEN `pnpm dev` runs THEN `examples/node/server.ts` SHALL serve the app on port 3001 using `.env`, with `secureCookies: false`.

**Independent Test**: Empty DB → `migrate` → `seed` → `echo pw | hash-password` → `pnpm dev` → `curl :3001/api/health`.

---

## Edge Cases

- IF `DATABASE_URL` is valid but the database is down THEN the first request needing the DB SHALL answer 500 `internal_error`, and `/api/health` SHALL still answer 200.
- IF the `profile` row is missing when a service reads it THEN the service SHALL throw `NotFoundError`.
- WHEN a Personal Info Field value is shorter than 3 characters THEN the PII Guard SHALL ignore it, to avoid redacting common words.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FND-01 | P1: Folder structure and tooling (AC 1-2) | Design | Pending |
| FND-02 | P1: Folder structure and tooling (AC 3-4, 7-8) | Design | Pending |
| FND-03 | P1: Folder structure and tooling (AC 5-6 layering/portability lint) | Design | Pending |
| FND-04 | P1: Drizzle config and schema (AC 1-2, 10) | Design | Pending |
| FND-05 | P1: Drizzle config and schema (AC 3-5 migrate) | Design | Pending |
| FND-06 | P1: Drizzle config and schema (AC 6-9 constraints) | Design | Pending |
| FND-07 | P1: Drizzle config and schema (AC 11-12 seed) | Design | Pending |
| FND-08 | P1: Drizzle config and schema (AC 13 local proxy) | Design | Pending |
| FND-09 | P1: Config, app factory (AC 1-4) | Design | Pending |
| FND-10 | P1: Config, app factory (AC 5-6 health, basePath) | Design | Pending |
| FND-11 | P1: Config, app factory (AC 7-8 error mapping) | Design | Pending |
| FND-12 | P1: Config, app factory (AC 9 OpenAPI) | Design | Pending |
| FND-13 | P1: Config, app factory (AC 10-11 mount points, container) | Design | Pending |
| FND-14 | P1: Security primitives (AC 1-4, 11 sessions, cookies, requireSession) | Design | Pending |
| FND-15 | P1: Security primitives (AC 5-6 IP) | Design | Pending |
| FND-16 | P1: Security primitives (AC 7 Turnstile) | Design | Pending |
| FND-17 | P1: Security primitives (AC 8-9 crypto) | Design | Pending |
| FND-18 | P1: Security primitives (AC 10 headers) | Design | Pending |
| FND-19 | P1: Shared services (AC 1-2 profile) | Design | Pending |
| FND-20 | P1: Shared services (AC 3-6 settings) | Design | Pending |
| FND-21 | P1: Shared services (AC 7-10 personal info) | Design | Pending |
| FND-22 | P1: LLM gateway and PII Guard (AC 1-4) | Design | Pending |
| FND-23 | P1: LLM gateway and PII Guard (AC 5-9) | Design | Pending |
| FND-24 | P1: Admin shell (AC 1-2, 7) | Design | Pending |
| FND-25 | P1: Admin shell (AC 3-6 guard, CSRF, errors) | Design | Pending |
| FND-26 | P2: CLI and local runner | Design | Pending |

**Coverage:** 26 total, 0 mapped to tasks, 26 unmapped ⚠️ (tasks not written yet)

---

## Sources

- `curriculum-specs/01-curriculum-api.md` §1-4, §5.3 (admin security), §5.4, §6-10 - stack, layout, layers, config, data model, sessions, LLM, errors, packaging
- `curriculum-specs/00-OVERVIEW.md` §2, §4 - decisions and security layers
- `curriculum-specs/03-ROADMAP.md` Phase 0-1 - setup and CLI
- `curriculum-specs/HANDOFF.md` §7 - open items resolved in Q1-Q12
- `.specs/STATE.md` AD-001..AD-004

---

## Success Criteria

- [ ] All four tracks start from `main` after this feature and finish without editing `app.ts`, `container.ts`, `schema.ts` or `drizzle/`.
- [ ] No Personal Info Field value reaches the recording mock model in any foundation test.
