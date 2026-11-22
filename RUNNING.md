# Running curriculum-api

## Prerequisites

- Node >= 22, pnpm 10 (`corepack enable`), Docker (runs Neon Local for local dev) and a Neon project (Neon Local and the integration tests both use the Neon API).

## Environment

`pnpm dev` loads `.env` and then `.env.local` (both gitignored, both optional): values in `.env.local` win. The CLI commands below take `--env-file` explicitly, so pass `--env-file=.env.local` there if that is where your `DATABASE_URL` lives.

Copy `.env.example` to `.env` (gitignored) and fill every variable, no value is optional except the `MODEL_*` ones and `DATABASE_URL_UNPOOLED`:

| Variable                                            | Notes                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | Local dev: `postgres://neon:npg@localhost:5432/neondb` (Neon Local)                                                          |
| `DATABASE_URL_UNPOOLED`                             | Optional: direct (non-pooled) Neon connection used only by `migrate`; falls back to `DATABASE_URL`                           |
| `OPENROUTER_API_KEY`                                | Real key needed for real LLM answers                                                                                         |
| `SESSION_SECRET`                                    | >= 32 bytes: `openssl rand -base64 32`                                                                                       |
| `TURNSTILE_SECRET`                                  | Real secret for real captchas (see below)                                                                                    |
| `ADMIN_PASSWORD_HASH`                               | `printf '%s' 'your-password' \| pnpm tsx src/cli.ts hash-password` (single-quote it in `.env`, the hash contains `$`)        |
| `IP_HASH_SALT`                                      | any random string                                                                                                            |
| `PII_ENCRYPTION_KEY`                                | 32 bytes base64: `openssl rand -base64 32` (losing it loses stored personal info)                                            |
| `MODEL_PUBLIC` / `MODEL_TAILOR` / `MODEL_RECRUITER` | OpenRouter model IDs (Settings in admin override them)                                                                       |
| `NEON_API_KEY` / `NEON_PROJECT_ID`                  | Neon API credentials, read by Neon Local (docker compose, from `.env`) and by the integration tests (`.env` or `.env.local`) |
| `PARENT_BRANCH_ID`                                  | Neon branch Neon Local forks its ephemeral dev branch from; also the default parent of the test branch                       |
| `TEST_PARENT_BRANCH_ID`                             | Optional: parent of the integration test branch instead of `PARENT_BRANCH_ID`                                                |

## Start

```bash
docker compose up -d --wait        # Neon Local: an ephemeral Neon branch of PARENT_BRANCH_ID on localhost:5432
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
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:unit      # no database
pnpm test:int       # needs NEON_API_KEY, NEON_PROJECT_ID and PARENT_BRANCH_ID (or TEST_PARENT_BRANCH_ID) in .env or .env.local
```
Each `pnpm test:int` run creates a throwaway Neon branch through the Neon API, migrates it, and deletes it at teardown (a 1 hour `expires_at` removes it if teardown fails). It never touches the dev database, so the suite cannot wipe your dev data.
Tests use a recording mock model and never call OpenRouter or Cloudflare.

## What needs a real key

- `OPENROUTER_API_KEY`: every LLM call (public chat, recruiter chat, resume generation). Without it these answer 502 `llm_unavailable` / "Generation failed".
- `TURNSTILE_SECRET` (+ a widget token from the site): `POST /api/public/session` and `/api/r/:token/session`. For local runs Cloudflare's dummy secret `1x0000000000000000000000000000000AA` accepts any token (it still calls Cloudflare, so needs internet).
- Admin, Master CV, personal info, settings, resumes (except Generate) and recruiter link management need no external key.
