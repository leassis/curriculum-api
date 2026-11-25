# Running curriculum-api

## Prerequisites

- Node >= 22, pnpm 10 (`corepack enable`), Docker (runs Neon Local for local dev and the Testcontainers Postgres container the integration tests use) and a Neon project (Neon Local uses the Neon API).

## Environment

`pnpm dev` loads `.env` and then `.env.local` (both gitignored, both optional): values in `.env.local` win. The CLI commands below take `--env-file` explicitly, so pass `--env-file=.env.local` there if that is where your `DATABASE_URL` lives.

Copy `.env.example` to `.env` (gitignored) and fill every variable, no value is optional except the `MODEL_*` ones and `DATABASE_URL_UNPOOLED`:

| Variable                                                             | Notes                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                       | Local dev: `postgres://neon:npg@localhost:5432/neondb` (Neon Local)                                                   |
| `DATABASE_URL_UNPOOLED`                                              | Optional: direct (non-pooled) Neon connection used only by `migrate`; falls back to `DATABASE_URL`                    |
| `OPENROUTER_API_KEY`                                                 | Real key needed for real LLM answers                                                                                  |
| `SESSION_SECRET`                                                     | >= 32 bytes: `openssl rand -base64 32`                                                                                |
| `TURNSTILE_SECRET`                                                   | Real secret for real captchas (see below)                                                                             |
| `ADMIN_PASSWORD_HASH`                                                | `printf '%s' 'your-password' \| pnpm tsx src/cli.ts hash-password` (single-quote it in `.env`, the hash contains `$`) |
| `IP_HASH_SALT`                                                       | any random string                                                                                                     |
| `PII_ENCRYPTION_KEY`                                                 | 32 bytes base64: `openssl rand -base64 32` (losing it loses stored personal info)                                     |
| `MODEL_PUBLIC` / `MODEL_TAILOR` / `MODEL_RECRUITER` / `MODEL_IMPORT` | OpenRouter model IDs; `MODEL_IMPORT` converts pasted CV text on the Profile page (Settings in admin override them)    |
| `TEMPERATURE_PUBLIC` / `_TAILOR` / `_RECRUITER` / `_IMPORT`          | Optional sampling temperature 0..2 (defaults 0.4 / 0.1 / 0.3 / 0.1); Settings in admin override, `default` sends none |
| `NEON_API_KEY` / `NEON_PROJECT_ID`                                   | Neon API credentials, read by Neon Local (`pnpm db:up`, from `.env.local`)                                            |
| `PARENT_BRANCH_ID`                                                   | Neon branch Neon Local forks its ephemeral dev branch from                                                            |

## Start

```bash
pnpm db:up                         # Neon Local: an ephemeral Neon branch of PARENT_BRANCH_ID on localhost:5432 (reads .env.local; `pnpm db:down` stops it)
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
Each `pnpm test:int` run starts one `postgres:18` container with Testcontainers, migrates it, and stops it at teardown (Testcontainers' reaper removes it if the run crashes). It never touches the dev database, so the suite cannot wipe your dev data.
Tests use a recording mock model and never call OpenRouter or Cloudflare.

## What needs a real key

- `OPENROUTER_API_KEY`: every LLM call (public chat, recruiter chat, resume generation). Without it these answer 502 `llm_unavailable`; resume generation answers 503 "Generation failed".
- `TURNSTILE_SECRET` (+ a widget token from the site): `POST /api/public/session` and `/api/r/:token/session`. For local runs Cloudflare's dummy secret `1x0000000000000000000000000000000AA` accepts any token (it still calls Cloudflare, so needs internet).
- Admin, Master CV, personal info, settings, resumes (except Generate) and recruiter link management need no external key.
