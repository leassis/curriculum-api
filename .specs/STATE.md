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
- **Status**: superseded by AD-009

### AD-007
- **Decision**: Custom Instructions in the tailor input are wrapped in `<custom_instructions>` … `</custom_instructions>` under the existing preamble, with both tags removed from the text first. Supersedes the input format of `resume-custom-instructions` AC 2 (plain text under the preamble).
- **Reason**: Question: "Rule 7 says Custom Instructions go in a delimited block … What now?" User chose "Own delimiter (Recommended)": a tag distinct from the `<<<…>>>` data markers, which the shared rules declare never instructions.
- **Trade-off**: The existing input-format test for Custom Instructions changes.
- **Scope**: `honest-assessment`; `tailorInput` in `resume.service.ts`.
- **Date**: 2026-11-23
- **Status**: active

### AD-008
- **Decision**: Tailored Resumes are stored only as JSON (`structured jsonb`, a versioned Resume Document of sections and items); the markdown `content` column is dropped and existing generated content is discarded (rows, inputs and recruiter links kept). The Owner edits the JSON through a structured form. Print View, markdown download and recruiter-chat context are rendered from the JSON. The Master CV stays markdown and is parsed into items (AD-006). Built as its own feature `structured-resume`, before `honest-assessment`.
- **Reason**: User: "at resumes we are phasing out markdowns. it should be only JSON and we edit the JSON" — opens custom PDF versions. Then chose "Split: structured-resume first", "Structured form", "Drop them" for old resumes, and Print View, markdown download, recruiter context rendered from JSON.
- **Trade-off**: Existing tailored resume texts are lost (regenerate); dropping a column is a production schema change that needs its own go-ahead at deploy.
- **Scope**: `structured-resume`, `honest-assessment`; `tailored_resumes`, `resume.service.ts`, `src/admin/resumes/`, recruiter chat context, print.
- **Date**: 2026-11-23
- **Status**: active

### AD-009
- **Decision**: The Master CV becomes a structured Career Library: typed Career Items (experience, education, certification, course, skill_group, language, publication, honour) with title, organisation, location, start/end year and month, current, text, bullets, skills, level. The Career Body sent to an LLM is rendered from it by code. Resume Document v2 holds flat items copied from Career Items with a `sourceId`; the model only selects, orders and rewrites text/bullets/headline/summary. `profile.master_cv` and v1 documents are dropped with no import. Supersedes AD-006.
- **Reason**: Competitor JSON is richer (typed dates, kinds, source link). Question: "Como fica o Master CV no v2?" User chose "Biblioteca estruturada" over "Markdown com parser"; then "nao estamos em producao entao os dados locais podem ser ignorados sem problema".
- **Trade-off**: The Owner re-enters the CV item by item; `honest-assessment` spec must be rewritten.
- **Scope**: `career-library`, `honest-assessment`; `profile`, new `career_items`, `tailored_resumes.structured`, `src/services/tailor/`, chats, print, `src/admin/profile/`, `src/admin/resumes/`.
- **Date**: 2026-11-23
- **Status**: active (AD-009)

### AD-010
- **Decision**: The Career Library has a `project` kind (Project, Client or organisation, start/end year and month, Ongoing, Details), shown as a Projects card after Experience with the form of `career-library/captures/project-form.png`. Its tech stack is a list field (AD-011).
- **Reason**: Question: "Tipos de item além dos 8?" User: "temos q ter project", then sent the competitor's Projects form capture.
- **Trade-off**: One more kind to validate, render and tailor.
- **Scope**: `career-library`.
- **Date**: 2026-11-23
- **Status**: active (AD-010)

### AD-011
- **Decision**: Experience and project items have an optional "Tech stack" (stored as the item's `skills` list), entered comma-separated under Details, rendered as "Stack: a, b", copied from the Career Item by code when tailoring (the model never changes it). Departs from the competitor project form, which has no such field.
- **Reason**: Question: "é melhor adicionar um campo tech stack?" Recommended on project and experience so the stack is a code-owned fact and `honest-assessment` can match Job Description skills without the model. User: "boa...entao adiciona".
- **Trade-off**: One field more than the capture; can repeat what the Skills groups list.
- **Scope**: `career-library`, `honest-assessment`.
- **Date**: 2026-11-23
- **Status**: active (AD-011)

### AD-012
- **Decision**: The Resume Document v2 holds only `headline` and `summary` of the header; the Tailored Resume Header card reads the name from the Profile and contact data from Personal Info Fields. Departs from the competitor capture/JSON, whose header carries name, email, phone and links.
- **Reason**: Core invariant: personal data never reaches an LLM. Question: approve the Header card departure with the other pending defaults. User: "Aprovar todos".
- **Trade-off**: The document alone cannot print a full header; print joins it with the Personal Header as today.
- **Scope**: `career-library`; `src/services/tailor/`, `src/admin/resumes/`.
- **Date**: 2026-11-23
- **Status**: active (AD-012)

## Handoff

- **Feature**: `structured-resume` done on branch `feat/structured-resume` (local, not pushed): T1-T22, Verifier round 1 F1-F4 fixed, `validate_verification.py` exits 0, proofs 47/47 at f976b30, walk logged in tasks.md.
- **Next**: user review/merge of `feat/structured-resume`; then `honest-assessment` (spec written, not approved) builds on it.
- **Before deploy**: migration `0004` drops `tailored_resumes.content` (generated texts lost); running it in production needs the Owner's go-ahead. The Owner's real Master CV is plain text with no `##`/`###` headings and contains the full name, so Generate will answer 400 until it is restructured.
- **Notes**: Neon Local dev branch has the fixture Master CV and a "Walk - Platform Engineer" resume from the walk (temporary branch). Lessons L-001..L-004 recorded as candidates.
- **Blockers**: none.
- **Stale**: the `honest-assessment` spec was written against the markdown Master CV and the section-based Resume Document; `career-library` replaced both (Career Items, Resume Document v2, migration 0006), so that spec must be rewritten before it is approved.

### AD-005
- **Decision**: `drizzle-orm/node-postgres` (`pg` Pool, max 5) replaces `neon-http` everywhere (supersedes AD-002; ADR 0003). Production uses Neon's pooled (`-pooler`) string; `migrate` uses `DATABASE_URL_UNPOOLED` when set. Docker Compose runs plain `postgres:17` at `localhost:5432`; the `neon-proxy` service and the `db.localtest.me` host are gone.
- **Reason**: Vercel's Node runtime has TCP, PgBouncer bounds connections, and interactive transactions are now possible.
- **Trade-off**: Per-instance pool and connection handshake on cold start.
- **Scope**: `src/db/*`, `src/cli.ts`, compose, CI, test support.
- **Date**: 2026-11-22
- **Status**: active

> Note: older feature specs under `.specs/features/` and `curriculum-specs/` still mention `db.localtest.me` / the Neon proxy; that is historical, read it as `localhost` + `pg`.
