# curriculum-api

An open-source backend for a personal career site. One person (the **Owner**) puts their career into it, and it gives them:

- **A public AI chat**: anyone can ask questions about the Owner's experience and get answers grounded in their career data.
- **Private recruiter chats**: a unique link (`/r/:token`) per recruiter, with a question quota, an optional expiry, and a switch to revoke it.
- **Tailored resumes**: paste a job description and the model rewrites the Owner's career data for that role. You also get a fit score, the skills the job asks for that the career does not show, and what was left out. The result is editable and prints to PDF from an A4 page.
- **An admin UI** (server-rendered HTML + HTMX) to manage the career data, personal info, prompts, models, limits, resumes and recruiter links.

One deployment serves one person. The package is a headless API: bring your own frontend, or just use the admin.

## Privacy by design

**Personal data never reaches an LLM.** Only the career content (the _Career Body_, plain markdown) is sent to the model. Name, email, phone and other personal fields are stored encrypted (`PII_ENCRYPTION_KEY`) and shown only where the Owner allows. In every prompt the Owner is just "the Candidate", and a PII guard rejects or redacts any personal value before it is stored or sent.

## Stack

TypeScript (ESM), [Hono](https://hono.dev), Drizzle ORM and PostgreSQL (schema `curriculum_api`), LLMs through [OpenRouter](https://openrouter.ai), Cloudflare Turnstile for captchas. The package is host-agnostic; `examples/node/server.ts` is a Node adapter that runs it on port `3001`.

Domain terms (Owner, Candidate, Career Body, Recruiter Chat…) are defined in [GLOSSARY.md](GLOSSARY.md).

## Prerequisites

- Node >= 22, pnpm 10 (`corepack enable`), Docker (runs the `postgres:18-alpine` dev database and the Testcontainers Postgres container the integration tests use).

## Environment

`pnpm dev` and the `pnpm db:migrate` / `pnpm db:seed` scripts load `.env` and then `.env.local` (both gitignored, both optional): values in `.env.local` win. A command run directly through `pnpm tsx src/cli.ts ...` loads no env file, so pass `--env-file=.env` (and `--env-file=.env.local`) there.

Copy `.env.example` to `.env` (gitignored) and fill every variable, no value is optional except the `MODEL_*` ones, the `TEMPERATURE_*` ones and `DATABASE_URL_UNPOOLED`:

| Variable                                                             | Notes                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                       | Local dev: `postgres://postgres:postgres@localhost:5432/curriculum` (the `pnpm db:up` container)                      |
| `DATABASE_URL_UNPOOLED`                                              | Optional: direct (non-pooled) Neon connection used only by `migrate`; falls back to `DATABASE_URL`                    |
| `OPENROUTER_API_KEY`                                                 | Real key needed for real LLM answers                                                                                  |
| `SESSION_SECRET`                                                     | >= 32 bytes: `openssl rand -base64 32`                                                                                |
| `TURNSTILE_SECRET`                                                   | Real secret for real captchas (see below)                                                                             |
| `ADMIN_PASSWORD_HASH`                                                | `printf '%s' 'your-password' \| pnpm tsx src/cli.ts hash-password` (single-quote it in `.env`, the hash contains `$`) |
| `IP_HASH_SALT`                                                       | any random string                                                                                                     |
| `PII_ENCRYPTION_KEY`                                                 | 32 bytes base64: `openssl rand -base64 32` (losing it loses stored personal info)                                     |
| `MODEL_PUBLIC` / `MODEL_TAILOR` / `MODEL_RECRUITER` / `MODEL_IMPORT` | OpenRouter model IDs; `MODEL_IMPORT` converts pasted CV text on the Profile page (Settings in admin override them)    |
| `TEMPERATURE_PUBLIC` / `_TAILOR` / `_RECRUITER` / `_IMPORT`          | Optional sampling temperature 0..2 (defaults 0.4 / 0.1 / 0.3 / 0.1); Settings in admin override, `default` sends none |

## Start

```bash
pnpm db:up                         # postgres:18-alpine on localhost:5432, data kept in the pgdata volume (`pnpm db:down` stops it, `docker compose down -v` wipes it)
pnpm install
pnpm db:migrate                    # uses DATABASE_URL_UNPOOLED when set, else DATABASE_URL
pnpm db:seed
pnpm dev                           # http://localhost:3001
```

`pnpm dev` first rebuilds the admin page scripts (`pnpm build:js`) so the generated files match their sources. To edit a page script (`src/admin/<page>/client.ts`), run `pnpm dev:assets` in a second terminal (rebuilds on save; reload the browser), then commit the regenerated `src/admin/static/*-js.generated.ts`. `pnpm build:assets` rebuilds CSS and scripts; `pnpm lint` fails when a generated script is stale.

After `pnpm build` the same commands exist as `node dist/cli.js <migrate|seed|hash-password|cleanup>`.

Migration `0004` drops the generated markdown of every Tailored Resume (and clears its model); rows, Job Descriptions, Custom Instructions, header fields and Recruiter Chat links stay, and each resume shows "Not generated yet" until it is generated again. It cannot be undone: do not run `migrate` against production without the Owner's go-ahead.

## URLs (port 3001)

- `/admin` - HTML/HTMX admin (login, Master CV, personal info, settings, resumes, recruiter chats)
- `/api/health` - `{"ok":true}`
- `/api/openapi.json` - OpenAPI document
- Public chat: `POST /api/public/session` then `POST /api/public/chat`, `GET /api/public/profile`
- Recruiter link: `/r/:token` on the site origin; API at `/api/r/:token` (`GET`, `POST /session`, `POST /chat`)

## Tests

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:unit      # no database
pnpm test:int       # needs Docker; no Neon variables
```

Each `pnpm test:int` run starts one `postgres:18-alpine` container with Testcontainers, migrates it, and stops it at teardown (Testcontainers' reaper removes it if the run crashes). It never touches the dev database, so the suite cannot wipe your dev data.
Tests use a recording mock model and never call OpenRouter or Cloudflare.

## What needs a real key

- `OPENROUTER_API_KEY`: every LLM call (public chat, recruiter chat, resume generation). Without it these answer 502 `llm_unavailable`; resume generation answers 503 "Generation failed".
- `TURNSTILE_SECRET` (+ a widget token from the site): `POST /api/public/session` and `/api/r/:token/session`. For local runs Cloudflare's dummy secret `1x0000000000000000000000000000000AA` accepts any token (it still calls Cloudflare, so needs internet).
- Admin, Master CV, personal info, settings, resumes (except Generate) and recruiter link management need no external key.

## License

[MIT](LICENSE)
