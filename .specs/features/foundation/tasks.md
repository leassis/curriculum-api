# Foundation Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/foundation/design.md`
**Status**: Approved - aprovado pelo usuário via este prompt (2026-11-22)
**Approved**: 2026-11-22 - user: "aprovado pelo usuário via este prompt"
**Review**: 2026-11-22 - coverage matrix checked against spec.md (all ACs of the 8 stories plus the 3 edge cases map to a check C1-C77 with a proof); no gaps. Approval registered: aprovado pelo usuário via este prompt (orquestrador).
**Build**: `pnpm build; pnpm typecheck; pnpm lint`
**Run unit**: `pnpm vitest run --project unit --reporter=verbose`
**Run int**: `pnpm vitest run --project integration --reporter=verbose`

Test names below are contracts: each check's proof line is the `describe > it` its test must print. Integration tests need `docker compose up -d` and `TEST_DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/curriculum_test`.

---

## Test Coverage Matrix

> Generated from project guidelines and spec - confirm before Execute. Guidelines found: `curriculum-specs/01-curriculum-api.md` §2.1 "Testing per layer" and §9. No tests exist in the repo yet; strong defaults applied where §9 is silent.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services (`src/services/*`) | unit | All branches; 1:1 to spec ACs; every listed edge case; in-memory fakes, no DB | `test/unit/services/*.test.ts` | `pnpm test:unit` |
| LLM (`src/llm/*`) | unit | Every matching rule of the guard; first-chunk success and failure | `test/unit/llm/*.test.ts` | `pnpm test:unit` |
| Security / middleware (`src/security/*`, `src/middleware/*`) | unit | Happy path + every rejection branch in the ACs | `test/unit/security/*.test.ts`, `test/unit/middleware/*.test.ts` | `pnpm test:unit` |
| Routes / app / admin shell | unit (`app.request()` with fake services) | Every route in scope: happy + error paths + status codes + headers | `test/unit/app/*.test.ts`, `test/unit/admin/*.test.ts` | `pnpm test:unit` |
| Repositories / db (`src/repositories/*`, `src/db/*`) | integration (Compose DB) | Every query method; constraints; idempotency | `test/integration/**/*.test.ts` | `pnpm test:int` |
| Config / tooling scripts | unit | Every rule the AC names | `test/unit/*.test.ts` | `pnpm test:unit` |
| Schema / config / generated files (`schema.ts`, `drizzle.config.ts`, tsconfig, biome, CI YAML, `.env.example`, `htmx.generated.ts`) | unit (structure assertions) or none | Structure asserted where an AC names it; otherwise build gate only | `test/unit/db/*.test.ts` | `pnpm test:unit` |

## Gate Check Commands

> Generated from the design (no existing scripts) - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Setup | T1-T2 only, before test tooling exists | `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck` |
| Quick | Tasks with unit tests only | `pnpm typecheck && pnpm test:unit` |
| Full | Tasks with integration tests | `pnpm typecheck && pnpm test:unit && pnpm test:int` |
| Build | End of each phase and config-only tasks | `pnpm build && pnpm typecheck && pnpm lint && pnpm test` |

---

## Execution Plan

Phases run in order; tasks inside a phase run in order.

### Phase 1: Scaffold and tooling

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Database

```
T6 → T7 → T8 → T9 → T10
```

### Phase 3: Core primitives

```
T11 → T12 → T13 → T14 → T15 → T16 → T17
```

### Phase 4: Shared data

```
T18 → T19 → T20 → T21 → T22 → T23
```

### Phase 5: LLM gateway

```
T24 → T25 → T26
```

### Phase 6: App assembly

```
T27 → T28 → T29
```

### Phase 7: Admin shell

```
T30 → T31 → T32
```

### Phase 8: CLI and finish

```
T33 → T34 → T35
```

---

## Task Breakdown

### T1: Package manifest and TypeScript build

**What**: `package.json` (ESM, Node ≥ 22, `packageManager` pnpm, `bin`, `exports`, `files`, scripts `build|typecheck|lint|test|test:unit|test:int|dev|db:generate|vendor:htmx`, exact-pinned deps from 01 §1), `tsconfig.json` (strict, `jsxImportSource: hono/jsx`), `tsup.config.ts` (entries `src/index.ts`, `src/cli.ts`, ESM, dts, splitting), placeholder `src/index.ts` and `src/cli.ts`.
**Where**: `package.json`
**Depends on**: None
**Reuses**: 01-curriculum-api.md §1, §10
**Requirement**: FND-01, FND-02

**Done when**:
- [x] `pnpm install` writes `pnpm-lock.yaml`; installed `ai` major recorded in design Risks row
- [x] Setup gate passes; `dist/index.js`, `dist/index.d.ts`, `dist/cli.js` exist

**Tests**: none
**Gate**: Setup
**Commit**: `chore: scaffold package, tsconfig and tsup build`
**Status**: done

---

### T2: Biome and Vitest configuration

**What**: `biome.json` (lint + format), `vitest.config.ts` with projects `unit` (`test/unit/**`) and `integration` (`test/integration/**`, `fileParallelism: false`, `globalSetup: test/support/global-setup.ts`), `passWithNoTests: true` in both projects, and a no-op placeholder `test/support/global-setup.ts` (T8 fills it) so `pnpm test` exits 0 before tests exist.
**Where**: `vitest.config.ts`
**Depends on**: T1
**Reuses**: design Tech Decisions (test split)
**Requirement**: FND-02

**Done when**:
- [x] `pnpm biome check .` exits 0
- [x] `pnpm test:unit --passWithNoTests` exits 0

**Tests**: none
**Gate**: Setup
**Commit**: `chore: add biome and vitest projects`
**Status**: done

---

### T3: Architecture check script

**What**: `scripts/check-architecture.ts` resolving each import in `src/**` and failing on: routes/admin/middleware → db/repositories; any `@vercel/*`, `aws-sdk`, `@aws-sdk/*`; `@openrouter/ai-sdk-provider` outside `src/llm/openrouter.ts`; `src/llm/openrouter.ts` imported outside `src/services/llm.service.ts` and `src/container.ts`; static import of `src/admin/` from `src/app.ts`. `pnpm lint` = `biome check . && tsx scripts/check-architecture.ts`.
**Where**: `scripts/check-architecture.ts`
**Depends on**: T2
**Reuses**: design Risks (Biome limitation)
**Requirement**: FND-03, FND-23, FND-24

**Done when**:
- [x] Unit tests with fixture trees prove C5, C6, C61, C63
- [x] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(lint): enforce layering, portability and llm import rules`
**Status**: done

---

### T4: CI workflow

**What**: `.github/workflows/ci.yml` on pull_request and push to main: pnpm install, Compose services (postgres:17 + local-neon-http-proxy), lint, typecheck, test, build, `node dist/cli.js migrate` against the service DB.
**Where**: `.github/workflows/ci.yml`
**Depends on**: T3
**Reuses**: `docker-compose.yml` from T6 (service definitions duplicated as workflow services)
**Requirement**: FND-02

**Done when**:
- [x] Workflow YAML parses (`pnpm dlx yaml-lint .github/workflows/ci.yml` or equivalent) and lists the five steps
- [x] Build gate passes

**Tests**: none
**Gate**: Build
**Commit**: `ci: run lint, typecheck, test and build on pull requests`
**Status**: done

---

### T5: Environment example

**What**: `.env.example` with every variable of 01 §10 plus `TEST_DATABASE_URL`, one comment line each.
**Where**: `.env.example`
**Depends on**: T4
**Reuses**: 01-curriculum-api.md §10
**Requirement**: FND-02

**Done when**:
- [x] Every §10 variable present with a comment
- [x] Build gate passes

**Tests**: none
**Gate**: Build
**Commit**: `docs: add .env.example`
**Status**: done

---

### T6: Compose stack and DB client

**What**: `docker-compose.yml` (postgres:17 on 5432, `local-neon-http-proxy` on 4444 pinned by digest) and `src/db/client.ts` (`createDb`, `fetchEndpointFor`, generic `Db` type).
**Where**: `src/db/client.ts`
**Depends on**: None within phase (needs Phase 1 complete)
**Reuses**: design Components → DB client
**Requirement**: FND-08

**Done when**:
- [x] `docker compose up -d` healthy
- [x] Unit test proves C21
- [x] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(db): add neon-http client with local proxy routing`
**Status**: done

---

### T7: Schema and Drizzle config

**What**: `src/db/schema.ts` (7 tables under `pgSchema("curriculum_api")`, checks, FK, unique) and `drizzle.config.ts` (schemaFilter, casing, migrations schema).
**Where**: `src/db/schema.ts`
**Depends on**: T6
**Reuses**: design Data Models
**Requirement**: FND-04, FND-06

**Done when**:
- [x] Unit tests prove C9, C10
- [x] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(db): define curriculum_api schema and drizzle config`
**Status**: done

---

### T8: Initial migration and migrate()

**What**: `pnpm db:generate` → `drizzle/0000_init.sql`; `src/db/migrate.ts`; `test/support/db.ts` (`testDb`, `resetDb`) and `test/support/global-setup.ts` (runs `migrate` once).
**Where**: `src/db/migrate.ts`
**Depends on**: T7
**Reuses**: design Components → Migrate
**Requirement**: FND-05, FND-06

**Done when**:
- [x] Integration tests prove C11-C17
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(db): add initial migration and migrate()`
**Status**: done

---

### T9: Seed and default prompts

**What**: `src/llm/default-prompts.ts` (three prompts meeting 01 §7) and `src/db/seed.ts`.
**Where**: `src/db/seed.ts`
**Depends on**: T8
**Reuses**: 01-curriculum-api.md §7 prompt rules
**Requirement**: FND-07

**Done when**:
- [x] Integration tests prove C19, C20
- [x] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(db): add seed with default prompts`
**Status**: done

---

### T10: Cleanup

**What**: `src/db/cleanup.ts` deleting `public_usage` and `admin_login_attempts` rows older than N days (default 30), returning counts.
**Where**: `src/db/cleanup.ts`
**Depends on**: T9
**Reuses**: schema from T7
**Requirement**: FND-26

**Done when**:
- [x] Integration test proves C72
- [x] Build gate passes (end of phase)

**Tests**: integration
**Gate**: Build
**Commit**: `feat(db): add retention cleanup`
**Status**: done

---

### T11: Domain errors

**What**: `src/services/errors.ts` with the classes, codes and statuses of the design.
**Where**: `src/services/errors.ts`
**Depends on**: None within phase (needs Phase 2 complete)
**Reuses**: 01 §2.1 error table
**Requirement**: FND-11

**Done when**:
- [x] Unit test asserts each class's `code` and `status`
- [x] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(core): add domain errors`
**Status**: done

---

### T12: Config validation

**What**: `src/config.ts` (`CurriculumApiConfig`, zod schema, `resolveConfig`, defaults).
**Where**: `src/config.ts`
**Depends on**: T11
**Reuses**: 01 §3
**Requirement**: FND-09

**Done when**:
- [ ] Unit tests prove C22, C23, C24
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(core): validate config with defaults`

---

### T13: Session tokens and cookies

**What**: `src/security/session.ts` (`signSession`, `verifySession`, `setSessionCookie`, `setAdminCookie`, `clearAdminCookie`).
**Where**: `src/security/session.ts`
**Depends on**: T12
**Reuses**: `jose`, `hono/cookie`
**Requirement**: FND-14

**Done when**:
- [ ] Unit tests prove C33, C34, C35, C36
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(security): sign and verify session cookies`

---

### T14: requireSession middleware

**What**: `src/middleware/require-session.ts` and `src/env.ts` (Hono `Env` type).
**Where**: `src/middleware/require-session.ts`
**Depends on**: T13
**Reuses**: T13 helpers, T11 `UnauthorizedError`
**Requirement**: FND-14

**Done when**:
- [ ] Unit test on a minimal Hono app proves C43
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(security): add requireSession middleware`

---

### T15: Client IP and hashing

**What**: `src/security/ip.ts` (`clientIp`, `hashIp`).
**Where**: `src/security/ip.ts`
**Depends on**: T14
**Reuses**: Web Crypto `subtle.digest`
**Requirement**: FND-15

**Done when**:
- [ ] Unit tests prove C37, C38
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(security): extract and hash client ip`

---

### T16: Turnstile verification

**What**: `src/security/turnstile.ts` (`verifyTurnstile`, fails closed, injectable `fetch`).
**Where**: `src/security/turnstile.ts`
**Depends on**: T15
**Reuses**: 01 §6
**Requirement**: FND-16

**Done when**:
- [ ] Unit test proves C39
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(security): verify turnstile tokens`

---

### T17: Field encryption

**What**: `src/security/crypto.ts` (AES-256-GCM `encrypt`/`decrypt`, `DecryptionError`).
**Where**: `src/security/crypto.ts`
**Depends on**: T16
**Reuses**: Web Crypto `subtle`
**Requirement**: FND-17

**Done when**:
- [ ] Unit tests prove C40, C41
- [ ] Build gate passes (end of phase)

**Tests**: unit
**Gate**: Build
**Commit**: `feat(security): encrypt personal info values`

---

### T18: Profile repository

**What**: `src/repositories/profile.repository.ts` (`ProfileRepo` interface, `find`, `upsert`).
**Where**: `src/repositories/profile.repository.ts`
**Depends on**: None within phase (needs Phases 2-3 complete)
**Reuses**: `Db` from T6, schema from T7
**Requirement**: FND-19

**Done when**:
- [ ] Integration test proves C45
- [ ] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(repo): add profile repository`

---

### T19: Settings repository

**What**: `src/repositories/settings.repository.ts` (`SettingsRepo`, `get`, `all`, `set`, `delete`).
**Where**: `src/repositories/settings.repository.ts`
**Depends on**: T18
**Reuses**: T18 pattern
**Requirement**: FND-20

**Done when**:
- [ ] Integration test covers get/all/set/delete round trip
- [ ] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(repo): add settings repository`

---

### T20: Personal info repository

**What**: `src/repositories/personal-info.repository.ts` (`PersonalInfoRepo`, `list` ordered, `find`, `insert`, `update`, `delete`).
**Where**: `src/repositories/personal-info.repository.ts`
**Depends on**: T19
**Reuses**: T18 pattern
**Requirement**: FND-21

**Done when**:
- [ ] Integration test covers every method and the `sort_order, key` ordering
- [ ] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(repo): add personal info repository`

---

### T21: Profile service

**What**: `src/services/profile.service.ts` and `test/support/fakes/profile.fake.ts`.
**Where**: `src/services/profile.service.ts`
**Depends on**: T20
**Reuses**: `ProfileRepo`, `NotFoundError`
**Requirement**: FND-19

**Done when**:
- [ ] Unit tests prove C44, C76
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(service): add profile service`

---

### T22: Settings service and keys

**What**: `src/services/settings-keys.ts` (allowlist incl. `print.pageSize`) and `src/services/settings.service.ts`; `test/support/fakes/settings.fake.ts`.
**Where**: `src/services/settings.service.ts`
**Depends on**: T21
**Reuses**: `SettingsRepo`, `ResolvedConfig`
**Requirement**: FND-20

**Done when**:
- [ ] Unit tests prove C46, C47, C48; integration test proves C49
- [ ] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(service): add settings service with overrides`

---

### T23: Personal info service

**What**: `src/services/personal-info.service.ts` (CRUD, `reveal`, `contactFor`, `allValues`, encryption via T17); `test/support/fakes/personal-info.fake.ts`.
**Where**: `src/services/personal-info.service.ts`
**Depends on**: T22
**Reuses**: T17 crypto, `PersonalInfoRepo`
**Requirement**: FND-21

**Done when**:
- [ ] Unit tests prove C51, C52, C53; integration test proves C50
- [ ] Build gate passes (end of phase)

**Tests**: integration
**Gate**: Build
**Commit**: `feat(service): add personal info service`

---

### T24: PII Guard

**What**: `src/llm/pii-guard.ts` (`findPii`, `redactPii`).
**Where**: `src/llm/pii-guard.ts`
**Depends on**: None within phase (needs Phase 4 complete)
**Reuses**: design Components → PII Guard
**Requirement**: FND-22

**Done when**:
- [ ] Unit tests prove C54, C55, C77
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(llm): add pii guard`

---

### T25: Provider factory and recording mock

**What**: `src/llm/openrouter.ts` (`createProvider` → `ModelFactory`) and `test/support/mock-llm.ts` (`createRecordingModel`).
**Where**: `src/llm/openrouter.ts`
**Depends on**: T24
**Reuses**: `@openrouter/ai-sdk-provider`, `ai/test`
**Requirement**: FND-23

**Done when**:
- [ ] Unit test proves C62
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(llm): add provider factory and recording mock`

---

### T26: LlmService with first-chunk handling

**What**: `src/llm/first-chunk.ts` and `src/services/llm.service.ts` (`stream`, `generate`, guard, redaction, model resolution, logging).
**Where**: `src/services/llm.service.ts`
**Depends on**: T25
**Reuses**: T22 settings, T23 personal info, T24 guard, T25 mock
**Requirement**: FND-22, FND-23

**Done when**:
- [ ] Unit tests prove C56, C57, C58, C59, C60
- [ ] Build gate passes (end of phase)

**Tests**: unit
**Gate**: Build
**Commit**: `feat(llm): add llm service gateway`

---

### T27: Track skeleton and container

**What**: Stub repositories, services, `security/admin-auth.ts`, `middleware/require-active-recruiter-chat.ts` with the design's constructor signatures; `src/container.ts` constructing all of them.
**Where**: `src/container.ts`
**Depends on**: None within phase (needs Phases 3-5 complete)
**Reuses**: design Container contract
**Requirement**: FND-13

**Done when**:
- [ ] Unit test proves C32
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(core): wire container with track skeleton`

---

### T28: Security headers middleware

**What**: `src/middleware/security-headers.ts` (base headers everywhere, CSP on `/admin/*`).
**Where**: `src/middleware/security-headers.ts`
**Depends on**: T27
**Reuses**: 01 §5.3 admin security
**Requirement**: FND-18

**Done when**:
- [ ] Unit test proves C42
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(security): add security headers`

---

### T29: App factory, health, OpenAPI and error mapping

**What**: `src/app.ts` (`createApp`, `buildApp`, basePath, `/api` OpenAPIHono with JSON `onError`, lazy `/admin/*` loader), a minimal placeholder `src/admin/index.tsx` exporting an empty `adminRouter` so the dynamic `import()` typechecks (T32 fills it), `src/routes/health.ts`, `src/routes/openapi.ts`, empty `src/routes/public.ts` and `src/routes/recruiter.ts`, `src/index.ts` exports; `test/support/test-app.ts`.
**Where**: `src/app.ts`
**Depends on**: T28
**Reuses**: T12 config, T27 container, T28 headers, T11 errors
**Requirement**: FND-09, FND-10, FND-11, FND-12

**Done when**:
- [ ] Unit tests prove C25, C26, C27, C28, C29, C30, C75
- [ ] Build gate passes (end of phase)

**Tests**: unit
**Gate**: Build
**Commit**: `feat(app): add createApp with health, openapi and error mapping`

---

### T30: Vendored HTMX

**What**: `scripts/vendor-htmx.ts` and generated `src/admin/static/htmx.generated.ts` from pinned `htmx.org` 2.0.x.
**Where**: `src/admin/static/htmx.generated.ts`
**Depends on**: None within phase (needs Phase 6 complete)
**Reuses**: design Tech Decisions (HTMX serving)
**Requirement**: FND-24

**Done when**:
- [ ] `pnpm vendor:htmx` regenerates the file byte-identically
- [ ] Build gate passes

**Tests**: none
**Gate**: Build
**Commit**: `chore(admin): vendor htmx`

---

### T31: requireAdmin middleware

**What**: `src/middleware/require-admin.ts` (303 for pages, 401 + `HX-Redirect` for HTMX, exempt login/static).
**Where**: `src/middleware/require-admin.ts`
**Depends on**: T30
**Reuses**: T13 `verifySession`
**Requirement**: FND-25

**Done when**:
- [ ] Unit tests prove C65, C66
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(admin): add requireAdmin middleware`

---

### T32: Admin router, layout and stubs

**What**: `src/admin/index.tsx` (csrf, static route, requireAdmin, mounts, HTML `onError`), `layout.tsx`, `error-fragment.tsx`, empty routers `login|dashboard|profile|settings|personal-info|chats|resumes|print`.
**Where**: `src/admin/index.tsx`
**Depends on**: T31
**Reuses**: T30 HTMX, T31 middleware, T29 lazy loader
**Requirement**: FND-13, FND-24, FND-25

**Done when**:
- [ ] Unit tests prove C31, C64, C67, C68, C69
- [ ] Build gate passes (end of phase)

**Tests**: unit
**Gate**: Build
**Commit**: `feat(admin): add admin shell with layout and csrf`

---

### T33: CLI

**What**: `src/cli.ts` with `migrate`, `seed`, `hash-password` (stdin, bcrypt cost 12), `cleanup`, usage on unknown command.
**Where**: `src/cli.ts`
**Depends on**: None within phase (needs Phases 2 and 7 complete)
**Reuses**: T8, T9, T10
**Requirement**: FND-26

**Done when**:
- [ ] Unit tests prove C71, C73; integration test proves C70
- [ ] Full gate passes

**Tests**: integration
**Gate**: Full
**Commit**: `feat(cli): add migrate, seed, hash-password and cleanup commands`

---

### T34: Node example server

**What**: `examples/node/server.ts` exporting `serverOptions(env)` (port 3001, `secureCookies: false`) and starting `@hono/node-server`; `pnpm dev` runs it with `tsx --env-file=.env`.
**Where**: `examples/node/server.ts`
**Depends on**: T33
**Reuses**: T29 `createApp`
**Requirement**: FND-26

**Done when**:
- [ ] Unit test proves C74
- [ ] `pnpm dev` + `curl localhost:3001/api/health` returns `{"ok":true}` (logged in Handoff Walked)
- [ ] Quick gate passes

**Tests**: unit
**Gate**: Quick
**Commit**: `feat(examples): add node dev server`

---

### T35: Repository layout assertions

**What**: `test/unit/repo-layout.test.ts` asserting the final file layout, `package.json` fields, CI steps, `.env.example` variables and the single shipped migration.
**Where**: `test/unit/repo-layout.test.ts`
**Depends on**: T34
**Reuses**: design Folder Structure
**Requirement**: FND-01, FND-02, FND-04

**Done when**:
- [ ] Unit tests prove C1, C2, C7, C8, C18
- [ ] Build gate passes

**Tests**: unit
**Gate**: Build
**Commit**: `test: assert repository layout and package contract`

---

## Checks

### Folder structure and tooling

**C1** - Every file of the design's folder structure exists (FND-01, AC 1)
Proof: run unit | ✓ repo layout > contains every foundation file

**C2** - `package.json` has `type: module`, `engines.node >=22`, `packageManager` pnpm; tsconfig `strict: true` (FND-01, AC 2)
Proof: run unit | ✓ repo layout > declares esm, node 22, pnpm and strict typescript

**C3** - `pnpm build` emits `dist/index.js`, `dist/index.d.ts`, `dist/cli.js` (FND-02, AC 3)
Proof: `pnpm build && test -f dist/index.js && test -f dist/index.d.ts && test -f dist/cli.js`

**C4** - lint, typecheck and test exit 0 on a clean checkout with Compose up (FND-02, AC 4)
Proof: `pnpm lint && pnpm typecheck && pnpm test`

**C5** - A file in routes, admin or middleware importing db or repositories fails lint, naming the file (FND-03, AC 5)
Proof: run unit | ✓ check-architecture > rejects routes, admin and middleware importing db or repositories

**C6** - A `src` file importing `@vercel/*`, `aws-sdk` or `@aws-sdk/*` fails lint, naming the file (FND-03, AC 6)
Proof: run unit | ✓ check-architecture > rejects platform imports in src

**C7** - CI runs lint, typecheck, test with DB services, and build on pull requests (FND-02, AC 7)
Proof: run unit | ✓ repo layout > ci workflow runs lint, typecheck, test with db services and build

**C8** - `.env.example` lists every §10 variable with a comment (FND-02, AC 8)
Proof: run unit | ✓ repo layout > env example documents every variable

### Drizzle configuration and schema

**C9** - `drizzle.config.ts` sets dialect, schema path, out, `schemaFilter curriculum_api`, snake_case and migrations schema (FND-04, AC 1)
Proof: run unit | ✓ drizzle config > targets curriculum_api with snake_case

**C10** - `schema.ts` declares the 7 tables, all in `curriculum_api` (FND-04, AC 2)
Proof: run unit | ✓ schema > declares seven tables in curriculum_api

**C11** - `migrate` on an empty DB creates the 7 tables and the migrations table in `curriculum_api` (FND-05, AC 3)
Proof: run int | ✓ migrate > creates seven tables and the migrations table in curriculum_api

**C12** - After `migrate`, `public` holds zero package tables, sequences, types or functions (FND-05, AC 4)
Proof: run int | ✓ migrate > creates nothing in public

**C13** - A second `migrate` applies nothing and resolves (FND-05, AC 5)
Proof: run int | ✓ migrate > second run applies nothing

**C14** - Inserting `profile.id = 2` fails with a check violation (FND-06, AC 6)
Proof: run int | ✓ constraints > profile rejects an id other than 1

**C15** - Unknown `status` or `visibility` fails with a check violation (FND-06, AC 7)
Proof: run int | ✓ constraints > rejects unknown status and visibility

**C16** - A duplicate recruiter token fails with a unique violation (FND-06, AC 8)
Proof: run int | ✓ constraints > rejects a duplicate recruiter token

**C17** - Deleting a linked resume sets `tailored_resume_id` to NULL and keeps the chat (FND-06, AC 9)
Proof: run int | ✓ constraints > deleting a resume nulls the chat link

**C18** - `drizzle/` has exactly one migration and `files` ships `drizzle` (FND-04, AC 10)
Proof: run unit | ✓ repo layout > ships exactly one migration

**C19** - `seed` with no profile inserts row 1 with empty CV fields and non-empty prompts (FND-07, AC 11)
Proof: run int | ✓ seed > creates the profile row with default prompts

**C20** - `seed` with an existing profile leaves it unchanged (FND-07, AC 12)
Proof: run int | ✓ seed > leaves an existing profile unchanged

**C21** - Host `db.localtest.me` routes to `http://db.localtest.me:4444/sql`; other hosts to `https://<host>/sql` (FND-08, AC 13)
Proof: run unit | ✓ db client > routes db.localtest.me to the local proxy

### Config, app factory, errors and health

**C22** - An empty config throws `ConfigError` naming every required field (FND-09, AC 1)
Proof: run unit | ✓ config > lists every missing required field

**C23** - A short `sessionSecret` or non-32-byte `piiEncryptionKey` throws `ConfigError` naming it (FND-09, AC 2)
Proof: run unit | ✓ config > rejects a short session secret and a bad pii key

**C24** - Omitted optional fields resolve to the §3 defaults (FND-09, AC 3)
Proof: run unit | ✓ config > applies documented defaults

**C25** - `createApp` with an unreachable DB returns an app and `/api/health` answers 200 (FND-09, AC 4)
Proof: run unit | ✓ app > serves health with an unreachable database

**C26** - `GET /api/health` answers 200 `{ ok: true }` with zero DB queries (FND-10, AC 5)
Proof: run unit | ✓ app > health answers ok without a query

**C27** - With `basePath: "/x"`, `/x/api/health` answers 200 and `/api/health` answers 404 (FND-10, AC 6)
Proof: run unit | ✓ app > serves routes under basePath

**C28** - Each domain error maps to its status and `{ error: code }` (FND-11, AC 7)
Proof: run unit | ✓ api errors > maps each domain error to its status and code

**C29** - A non-domain error answers 500 `{ error: "internal_error" }` with no message or stack (FND-11, AC 8)
Proof: run unit | ✓ api errors > hides unknown errors as internal_error

**C30** - `/api/openapi.json` is OpenAPI 3.1, lists registered `/api` routes and no `/admin` path (FND-12, AC 9)
Proof: run unit | ✓ openapi > lists api routes and no admin route

**C31** - Public, recruiter and the 7 admin routers (plus the `print` router) are mounted and exist empty (FND-13, AC 10)
Proof: run unit | ✓ app > mounts every track router

**C32** - The container constructs all 7 repositories and all services without I/O (FND-13, AC 11)
Proof: run unit | ✓ container > constructs every repository and service without io

**C75** - With the DB down, a DB route answers 500 `internal_error` and `/api/health` still answers 200 (FND-11, Edge 1)
Proof: run unit | ✓ app > database failure answers internal_error

### Security primitives

**C33** - Signed sessions verify back to the same scope and `cid` (FND-14, AC 1)
Proof: run unit | ✓ session > round trips scope and cid

**C34** - Expired, foreign-secret and altered tokens verify to `null` (FND-14, AC 2)
Proof: run unit | ✓ session > rejects expired, foreign and altered tokens

**C35** - `curr_session` has `HttpOnly; SameSite=Strict; Path=<base>/api` and `Secure` unless disabled (FND-14, AC 3)
Proof: run unit | ✓ cookies > session cookie attributes

**C36** - `curr_admin` has `HttpOnly; SameSite=Strict; Path=<base>/admin; Max-Age=28800` and `Secure` unless disabled (FND-14, AC 4)
Proof: run unit | ✓ cookies > admin cookie attributes

**C43** - `requireSession` throws `UnauthorizedError` for missing, invalid or wrong-scope cookies and sets `c.var.session` otherwise (FND-14, AC 11)
Proof: run unit | ✓ requireSession > rejects missing, invalid and wrong scope sessions

**C37** - Client IP is the first `x-forwarded-for` entry, else `x-real-ip` (FND-15, AC 5)
Proof: run unit | ✓ ip > reads forwarded then real ip

**C38** - IP hash = lowercase hex SHA-256 of `salt + ip` (FND-15, AC 6)
Proof: run unit | ✓ ip > hashes salt plus ip as sha256 hex

**C39** - Turnstile resolves true on `success: true`; false on `success: false`, non-2xx or network error (FND-16, AC 7)
Proof: run unit | ✓ turnstile > accepts success and fails closed otherwise

**C40** - Encrypt then decrypt returns the value; two encryptions differ (FND-17, AC 8)
Proof: run unit | ✓ crypto > round trips with a random iv

**C41** - Wrong key or altered ciphertext throws `DecryptionError` (FND-17, AC 9)
Proof: run unit | ✓ crypto > throws DecryptionError on wrong key or tampering

**C42** - Every response has the three base headers; `/admin/*` also has the CSP string (FND-18, AC 10)
Proof: run unit | ✓ security headers > sets base headers and admin csp

### Shared services

**C44** - `profileService.get()` returns row 1, or throws `NotFoundError` when absent (FND-19, AC 1 + Edge 2)
Proof: run unit | ✓ ProfileService > get returns the row or throws NotFoundError

**C76** - `profileService.update` upserts row 1 through the repository and returns the stored profile (FND-19, AC 2)
Proof: run unit | ✓ ProfileService > update upserts row 1

**C45** - `upsert` writes row 1 and moves `updated_at` forward (FND-19, AC 2)
Proof: run int | ✓ ProfileRepository > upsert writes row 1 and updated_at

**C46** - `model(area)` returns the override, else config, else throws `ConfigError` naming `model.<area>` (FND-20, AC 3)
Proof: run unit | ✓ SettingsService > model prefers override then config else ConfigError

**C47** - `limit(name)` returns the integer override, else config/default (FND-20, AC 4)
Proof: run unit | ✓ SettingsService > limit prefers override then config

**C48** - `set` deletes on empty, rejects unknown keys, non-positive limits and page sizes other than A4/Letter (FND-20, AC 5)
Proof: run unit | ✓ SettingsService > set validates keys and values and deletes on empty

**C49** - A changed override is returned by the next call on the same service instance (FND-20, AC 6)
Proof: run int | ✓ SettingsService > override change applies on next call

**C50** - After create/update, `value_encrypted` does not contain the plaintext (FND-21, AC 7)
Proof: run int | ✓ PersonalInfoService > stores ciphertext only

**C51** - Bad key pattern, duplicate key, empty label/value or bad visibility throw `ValidationError` naming the field (FND-21, AC 8)
Proof: run unit | ✓ PersonalInfoService > create rejects invalid input

**C52** - `contactFor` returns public / public+recruiter / all, ordered by `sort_order` then `key` (FND-21, AC 9)
Proof: run unit | ✓ PersonalInfoService > contactFor filters by channel and orders

**C53** - `allValues` returns every decrypted value (FND-21, AC 10)
Proof: run unit | ✓ PersonalInfoService > allValues decrypts every field

### LLM gateway and PII Guard

**C54** - The guard matches case-insensitively, phones by digits, emails trimmed and lowercased (FND-22, AC 1)
Proof: run unit | ✓ pii guard > matches case-insensitive text, phone digits and email

**C55** - A match reports key and label and never the value (FND-22, AC 2)
Proof: run unit | ✓ pii guard > reports key and label only

**C77** - Values shorter than 3 characters are ignored (FND-22, Edge 3)
Proof: run unit | ✓ pii guard > ignores values shorter than 3 characters

**C56** - PII in system or body throws `PiiLeakError`, the mock gets 0 calls, the log names the key only (FND-22, AC 3)
Proof: run unit | ✓ LlmService > refuses a body with pii without calling the provider

**C57** - PII in a user message reaches the mock as `[redacted]` (FND-22, AC 4)
Proof: run unit | ✓ LlmService > redacts pii in user messages

**C58** - The mock receives the `settingsService.model(area)` ID and the caller's `maxOutputTokens` (FND-23, AC 5)
Proof: run unit | ✓ LlmService > uses the settings model and max output tokens

**C59** - A provider failing before the first chunk makes `stream()` throw `LlmUnavailableError` (FND-23, AC 6)
Proof: run unit | ✓ LlmService > throws LlmUnavailableError before the first chunk

**C60** - Logs hold model ID, usage and latency and never the API key, prompt or a field value (FND-23, AC 7)
Proof: run unit | ✓ LlmService > logs model usage and latency and never secrets

**C61** - Importing the provider package outside `llm/openrouter.ts`, or `llm/openrouter.ts` outside the LLM service and container, fails lint (FND-23, AC 8)
Proof: run unit | ✓ check-architecture > only the llm service imports the provider

**C62** - The recording mock stores every prompt it receives (FND-23, AC 9)
Proof: run unit | ✓ mock llm > records every prompt

### Admin shell

**C63** - `src/app.ts` importing `src/admin/` statically fails lint (FND-24, AC 1)
Proof: run unit | ✓ check-architecture > rejects a static admin import in app

**C64** - `GET /admin/static/htmx.min.js` answers 200 without a session, `text/javascript`, `max-age=31536000, immutable` (FND-24, AC 2)
Proof: run unit | ✓ admin shell > serves htmx with immutable cache without a session

**C65** - A page request without an admin session answers 303 to `<base>/admin/login` (FND-25, AC 3)
Proof: run unit | ✓ admin shell > redirects page requests without a session to login

**C66** - An HTMX request without an admin session answers 401 with `HX-Redirect` (FND-25, AC 4)
Proof: run unit | ✓ admin shell > answers htmx requests without a session with HX-Redirect

**C67** - A POST with a foreign `Origin` and a valid admin cookie answers 403 and the handler does not run (FND-25, AC 5)
Proof: run unit | ✓ admin shell > rejects cross origin posts with 403

**C68** - A domain error in an admin handler renders an HTML fragment with its message, status and no stack (FND-25, AC 6)
Proof: run unit | ✓ admin shell > renders domain errors as html fragments

**C69** - The layout renders links to the 6 sections and a logout form posting to `/admin/logout` (FND-24, AC 7)
Proof: run unit | ✓ admin shell > layout renders navigation and logout

### CLI and local runner

**C70** - `migrate` exits 0 with `DATABASE_URL`, and exits 1 printing `DATABASE_URL is required` without it (FND-26, AC 1)
Proof: run int | ✓ cli > migrate runs and requires DATABASE_URL

**C71** - `hash-password` prints a cost-12 bcrypt hash that `compare` accepts (FND-26, AC 2)
Proof: run unit | ✓ cli > hash-password prints a bcrypt hash that verifies

**C72** - `cleanup` deletes rows older than 30 days from both tables, keeps newer ones, returns both counts (FND-26, AC 3)
Proof: run int | ✓ cleanup > deletes rows older than 30 days

**C73** - An unknown command prints the command list and exits 1 (FND-26, AC 4)
Proof: run unit | ✓ cli > unknown command prints usage and exits 1

**C74** - The Node example serves on port 3001 with `secureCookies: false` (FND-26, AC 5)
Proof: run unit | ✓ node example > uses port 3001 and insecure cookies

---

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** none

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15 → T16 → T17
Phase 4:  T18 → T19 → T20 → T21 → T22 → T23
Phase 5:  T24 → T25 → T26
Phase 6:  T27 → T28 → T29
Phase 7:  T30 → T31 → T32
Phase 8:  T33 → T34 → T35
```

35 tasks → batches of whole phases near 7 tasks: [P1] 5 · [P2] 5 · [P3] 7 · [P4] 6 · [P5+P6] 6 · [P7+P8] 6 = 6 workers, run in sequence.
