# Running curriculum-api

## Prerequisites

- Node >= 22, pnpm 10 (`corepack enable`), Docker (Postgres 17 + Neon HTTP proxy for local dev and tests).

## Environment

`pnpm dev` loads `.env` and then `.env.local` (both gitignored, both optional): values in `.env.local` win. The CLI commands below take `--env-file` explicitly, so pass `--env-file=.env.local` there if that is where your `DATABASE_URL` lives.

Copy `.env.example` to `.env` (gitignored) and fill every variable, no value is optional except the `MODEL_*` ones and `DATABASE_URL_UNPOOLED`:

| Variable                                            | Notes                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | Local dev: `postgres://postgres:postgres@db.localtest.me:5432/curriculum` (never `curriculum_test`, the test suite wipes it) |
| `DATABASE_URL_UNPOOLED`                             | Optional: direct (non-pooled) Neon connection used only by `migrate`; falls back to `DATABASE_URL`                           |
| `OPENROUTER_API_KEY`                                | Real key needed for real LLM answers                                                                                         |
| `SESSION_SECRET`                                    | >= 32 bytes: `openssl rand -base64 32`                                                                                       |
| `TURNSTILE_SECRET`                                  | Real secret for real captchas (see below)                                                                                    |
| `ADMIN_PASSWORD_HASH`                               | `printf '%s' 'your-password' \| pnpm tsx src/cli.ts hash-password` (single-quote it in `.env`, the hash contains `$`)        |
| `IP_HASH_SALT`                                      | any random string                                                                                                            |
| `PII_ENCRYPTION_KEY`                                | 32 bytes base64: `openssl rand -base64 32` (losing it loses stored personal info)                                            |
| `MODEL_PUBLIC` / `MODEL_TAILOR` / `MODEL_RECRUITER` | OpenRouter model IDs (Settings in admin override them)                                                                       |
| `TEST_DATABASE_URL`                                 | integration tests, `.../curriculum_test` (reset by the suite)                                                                |

## Start

```bash
docker compose up -d --wait        # db + neon proxy (use `down -v` for a clean slate)
pnpm install
pnpm tsx --env-file=.env src/cli.ts migrate   # uses DATABASE_URL_UNPOOLED when set, else DATABASE_URL
pnpm tsx --env-file=.env src/cli.ts seed
pnpm dev                           # http://localhost:3001
```
`pnpm dev` first rebuilds the admin page scripts (`pnpm build:js`) so the generated files match their sources. To edit a page script (`src/admin/<page>/client.ts`), run `pnpm dev:assets` in a second terminal (rebuilds on save; reload the browser), then commit the regenerated `src/admin/static/*-js.generated.ts`. `pnpm build:assets` rebuilds CSS and scripts; `pnpm lint` fails when a generated script is stale.
After `pnpm build` the same commands exist as `node dist/cli.js <migrate|seed|hash-password|cleanup>`.

## URLs (port 3001)

- `/admin` - HTML/HTMX admin (login, Master CV, personal info, settings, resumes, recruiter chats)
- `/api/health` - `{"ok":true}`
- `/api/openapi.json` - OpenAPI document
- Public chat: `POST /api/public/session` then `POST /api/public/chat`, `GET /api/public/profile`
- Recruiter link: `/r/:token` on the site origin; API at `/api/r/:token` (`GET`, `POST /session`, `POST /chat`)

## Tests

```bash
docker compose up -d --wait
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:unit      # no database
pnpm test:int       # needs Docker; uses TEST_DATABASE_URL (`curriculum_test`, a separate database from dev: it is reset by the suite)
```
Tests use a recording mock model and never call OpenRouter or Cloudflare.

## What needs a real key

- `OPENROUTER_API_KEY`: every LLM call (public chat, recruiter chat, resume generation). Without it these answer 502 `llm_unavailable` / "Generation failed".
- `TURNSTILE_SECRET` (+ a widget token from the site): `POST /api/public/session` and `/api/r/:token/session`. For local runs Cloudflare's dummy secret `1x0000000000000000000000000000000AA` accepts any token (it still calls Cloudflare, so needs internet).
- Admin, Master CV, personal info, settings, resumes (except Generate) and recruiter link management need no external key.
