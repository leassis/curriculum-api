# STATE

## Decisions

### AD-001
- **Decision**: All database objects live in the Postgres schema `curriculum_api` (underscore); the Drizzle migrations table lives there too. Nothing is created in `public`.
- **Reason**: User asked for a non-public schema; underscore avoids quoting the identifier in raw SQL, psql and docs (`"curriculum-api"` would need quotes everywhere). User: "agree" to Q3 recommendation.
- **Trade-off**: Schema name is fixed in code (Drizzle `pgSchema` is static); consumers cannot rename it.
- **Scope**: all features; `src/db/schema.ts`, `drizzle.config.ts`, raw SQL in repositories and docs.
- **Date**: 2026-11-22
- **Status**: active

### AD-002
- **Decision**: `drizzle-orm/neon-http` is the only driver in prod, dev, tests and CI. Local dev and tests run Docker Compose `postgres:17` + `local-neon-http-proxy`; repositories are typed against Drizzle's generic `PgDatabase` so a pooled driver can be swapped in later without touching repositories.
- **Reason**: Same driver everywhere means tests exercise the production query path; HTTP has no connection setup per cold start. User: "agree" to Q4 option (a).
- **Trade-off**: No interactive transactions (only `db.batch`); every atomic rule must be a single statement. Docker required for local dev.
- **Scope**: `src/db/client.ts`, all repositories, test setup, CI.
- **Date**: 2026-11-22
- **Status**: superseded by AD-005 (ADR 0003, `node-postgres`)

### AD-003
- **Decision**: Work is split into five features: `foundation` first (sequential), then `public-chat`, `admin-core`, `recruiter-chat`, `tailored-resumes` in parallel worktrees. `foundation` owns every table and the single initial migration, the container wiring, every route/admin mount point (as empty routers), `LlmService` + PII guard, and the shared services (profile, settings, personal info). Tracks only fill files they own; no track generates a migration.
- **Reason**: Parallel branches that each generate Drizzle migrations collide on `drizzle/meta/_journal.json`; parallel edits to one `tasks.md`, `app.ts` or `container.ts` collide on merge. User: "agree" to Q2.
- **Trade-off**: `foundation` is large and blocks everything; a schema change found during a track is serialized as its own change on `main`, then rebased into the tracks.
- **Scope**: all features; `.specs/features/*`.
- **Date**: 2026-11-22
- **Status**: active

### AD-004
- **Decision**: Admin login throttling is stored in a DB table `admin_login_attempts (ip_hash, window_start, count)` updated by one atomic upsert; 5 failed attempts per IP hash per 15 minutes.
- **Reason**: In-memory throttling does not hold across serverless instances. Adds a table the source data model (01-curriculum-api.md §4) does not list. User: "agree" to Q8.
- **Trade-off**: One extra DB write per failed login; one more table to clean up.
- **Scope**: `foundation` (table), `admin-core` (behaviour).
- **Date**: 2026-11-22
- **Status**: active

### AD-005
- **Decision**: Local development runs on Neon Local (`neondatabase/neon_local`, an ephemeral branch of `PARENT_BRANCH_ID`); integration tests run on a throwaway Neon branch created per run by Vitest `globalSetup` and deleted in teardown. The Docker `postgres:17` + `local-neon-http-proxy` stack is removed. `drizzle-orm/neon-http` stays the only driver (AD-002).
- **Reason**: Dev and tests shared one Postgres and were kept apart only by database name; `.env` pointed dev at `curriculum_test`, which the suite wipes. User chose "Neon for dev and tests", then 1a (branch per run), 2a (remove local Postgres), 3a (fold in `DATABASE_URL_UNPOOLED`); same strategy as curriculum-ai.
- **Trade-off**: Dev and integration tests need network and Neon credentials; no offline database.
- **Scope**: `docker-compose.yml`, `src/db/client.ts`, `test/support/`, RUNNING.md, CLAUDE.md, `.env.example`.
- **Date**: 2026-11-22
- **Status**: active

### AD-006
- **Decision**: The tailor model works on CV items parsed from the Master CV markdown per generation: every `### ` heading is an item whose heading line is fixed and copied by code; text before the first `## ` and between a `## ` and its first `###` are droppable items. Items in sections titled Experience/Education (English or Portuguese variants) are never dropped; code restores any the model omits. Ids `i1..in` live only for one call.
- **Reason**: Question: "The brief's safety net needs CV items with ids, but the Master CV is one free markdown text. How should items exist?" User chose "Parse markdown headings (Recommended)" over a structured CV editor or no ids.
- **Trade-off**: The Master CV must follow a heading convention (a CV with no `## ` heading cannot be generated); section names are matched from a fixed list.
- **Scope**: `honest-assessment`; `src/services/tailor/`, `resume.service.ts`.
- **Date**: 2026-11-23
- **Status**: active

### AD-007
- **Decision**: Custom Instructions in the tailor input are wrapped in `<custom_instructions>` … `</custom_instructions>` under the existing preamble, with both tags removed from the text first. Supersedes the input format of `resume-custom-instructions` AC 2 (plain text under the preamble).
- **Reason**: Question: "Rule 7 says Custom Instructions go in a delimited block … What now?" User chose "Own delimiter (Recommended)": a tag distinct from the `<<<…>>>` data markers, which the shared rules declare never instructions.
- **Trade-off**: The existing input-format test for Custom Instructions changes.
- **Scope**: `honest-assessment`; `tailorInput` in `resume.service.ts`.
- **Date**: 2026-11-23
- **Status**: active

## Handoff

- **Feature**: `foundation`, Execute phase: T1-T35 done, one commit each on `main` (local, nothing pushed).
- **Gate at HEAD**: `pnpm build && pnpm typecheck && pnpm lint && pnpm test` green; `check_proofs.py foundation` 80 pass, 0 fail (`proofs.md`).
- **Next**: dispatch the Verifier (validate.md) over HEAD, fix findings in one pass, rerun `check_proofs.py`, then `validate_verification.py foundation`. No captures cited, so no screens sub-agent.
- **Notes**: `ai` major 7 (`MockLanguageModelV4`); `typescript` pinned 6.0.3 because tsup dts breaks on TypeScript 7; vitest output is rewritten by the RTK hook, use `rtk proxy pnpm vitest ... --reporter=verbose` for raw lines.
- **Blockers**: none.

### AD-005
- **Decision**: `drizzle-orm/node-postgres` (`pg` Pool, max 5) replaces `neon-http` everywhere (supersedes AD-002; ADR 0003). Production uses Neon's pooled (`-pooler`) string; `migrate` uses `DATABASE_URL_UNPOOLED` when set. Docker Compose runs plain `postgres:17` at `localhost:5432`; the `neon-proxy` service and the `db.localtest.me` host are gone.
- **Reason**: Vercel's Node runtime has TCP, PgBouncer bounds connections, and interactive transactions are now possible.
- **Trade-off**: Per-instance pool and connection handshake on cold start.
- **Scope**: `src/db/*`, `src/cli.ts`, compose, CI, test support.
- **Date**: 2026-11-22
- **Status**: active

> Note: older feature specs under `.specs/features/` and `curriculum-specs/` still mention `db.localtest.me` / the Neon proxy; that is historical, read it as `localhost` + `pg`.
