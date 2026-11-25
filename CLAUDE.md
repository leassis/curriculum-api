# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hono backend (TypeScript, ESM, Node >= 22, pnpm) for one person's career site: a public AI chat, private per-recruiter chats, tailored resumes, and an HTMX admin. Domain terms (Owner, Candidate, Career Body, Personal Header, Recruiter Chat, PII Guard…) are defined in [GLOSSARY.md](GLOSSARY.md); use them and respect its "Avoid" lists. Setup details and env vars are in [RUNNING.md](RUNNING.md).

Core invariant: **personal data never reaches an LLM.** Only the Career Body (markdown) is sent; Personal Info Fields are stored encrypted (`PII_ENCRYPTION_KEY`), the Owner is always "the Candidate" in prompts, and `src/llm/pii-guard.ts` rejects/redacts any PII value.

## Commands

```bash
pnpm db:up                    # postgres:18-alpine container on localhost:5432 (required for dev; data kept in the pgdata volume); pnpm db:down stops it
pnpm db:migrate               # / pnpm db:seed: CLI migrate/seed with .env.local
pnpm dev                      # tsx --env-file=.env examples/node/server.ts, http://localhost:3001
pnpm tsx --env-file=.env src/cli.ts <migrate|seed|hash-password|cleanup>
pnpm lint                     # biome check + scripts/check-architecture.ts (import-boundary rules)
pnpm typecheck
pnpm build                    # tsup -> dist/ (index + cli)
pnpm test                     # all vitest projects
pnpm test:unit                # no DB
pnpm test:int                 # Testcontainers postgres:18-alpine container per run (needs Docker, no Neon variables)
pnpm vitest run --project unit test/unit/path/to.test.ts   # single file
pnpm vitest run -t "name"                                  # single test by name
pnpm db:generate              # drizzle-kit generate (new migration in drizzle/)
pnpm build:css                # regenerate src/admin/static/*.generated.ts
```

CI order: lint, typecheck, test, build, then `node dist/cli.js migrate`.

The integration suite starts one Testcontainers `postgres:18-alpine` container per run (migrated, then stopped at teardown), so it can never wipe the dev DB. Integration files run serially (`fileParallelism: false`). Tests use a recording mock model (`test/support/mock-llm.ts`) and never call OpenRouter/Cloudflare.

## Architecture

Layering: `routes/` and `admin/` and `middleware/` → `services/` → `repositories/` → `db/`. `src/container.ts` is the composition root (builds db, repos, services; no I/O); `src/app.ts` (`createApp` / `buildApp`) mounts routers, a central `DomainError` → JSON error handler, and injects `config` + `services` into the Hono context. Services throw subclasses of `DomainError` (`services/errors.ts`) with a status/code.

`pnpm lint` runs `scripts/check-architecture.ts`, which fails on:

- routes/admin/middleware importing `db/` or `repositories/`
- admin `view.tsx` / `layout.tsx` / `error-fragment.tsx` importing services, repositories, security, db or llm (views are pure JSX: props in, markup out)
- `@openrouter/ai-sdk-provider` imported anywhere except `src/llm/openrouter.ts`; that file only by `services/llm.service.ts` and `container.ts`
- platform-specific packages (`@vercel/*`, `aws-sdk`); the package must stay host-agnostic (see `examples/node/server.ts` for the Node adapter)
- `app.ts` statically importing `admin/` (it must be loaded via dynamic `import()` so the API works without the admin bundle)

Other things that span files:

- **DB driver**: `drizzle-orm/node-postgres` (`pg` Pool, max 5) everywhere (prod, dev, tests, CI); interactive `db.transaction` is available. Prod uses the Neon pooled (`-pooler`) string; `migrate` prefers `DATABASE_URL_UNPOOLED`. Short-lived callers close the pool with `closeDb` (ADR 0003). Repositories are typed against generic `PgDatabase`. All tables live in Postgres schema `curriculum_api`, never `public` (ADR in `docs/adr/`, `.specs/STATE.md` AD-001/002). Schema in `src/db/schema.ts`; migrations in `drizzle/` and shipped in the package.
- **Config**: `CurriculumApiConfig` → `resolveConfig`; DB-stored _Settings Overrides_ (`services/settings.service.ts`, keys in `settings-keys.ts`) win over env config (`MODEL_*`, limits) without redeploy.
- **LLM**: `services/llm.service.ts` is the single entry for model calls (public, recruiter, tailor); prompts in `llm/default-prompts.ts` and Profile; `llm/data-block.ts` wraps untrusted data; `llm/first-chunk.ts` handles stream start.
- **Admin UI**: server-rendered Hono JSX + HTMX under `src/admin/<feature>/{routes,view,script}`; Tailwind v4 CSS, htmx and fonts are compiled into `src/admin/static/*.generated.ts` (do not hand-edit; rerun `pnpm build:css` / `pnpm vendor:htmx`). Design system source in `design-system/`.
- **Public/recruiter API**: `routes/public.ts`, `routes/recruiter.ts` (`/api/r/:token`); Turnstile captcha + signed session (`security/`), per-IP daily limits hashed with `IP_HASH_SALT`. `/r/:token` page redirects into admin chat view.
- **Admin auth**: password hash in `ADMIN_PASSWORD_HASH`; login throttling is a DB table (`admin_login_attempts`), not in-memory.

## Specs and workflow

Feature work is spec-driven: `.specs/features/<feature>/{spec,tasks,proofs,verification}.md` and `.specs/STATE.md` (decisions AD-xxx, handoff) are the source of truth; product background in `curriculum-specs/`. Schema changes are serialized on `main` as their own migration (parallel branches collide on `drizzle/meta/_journal.json`).

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject` in the imperative, with types such as `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `chore`. One atomic commit per task. Breaking changes are marked `!` or with a `BREAKING CHANGE:` footer.
