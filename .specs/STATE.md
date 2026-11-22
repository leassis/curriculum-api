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
- **Status**: active

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

## Handoff
