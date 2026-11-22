# `node-postgres` driver everywhere, pooled Neon in production

Production, local dev, tests and CI all use `drizzle-orm/node-postgres` with a small `pg` Pool (max 5). Production points `DATABASE_URL` at Neon's pooled (`-pooler`, PgBouncer) string, which bounds server connections across instances; locally and in CI the same driver talks to plain Docker Compose `postgres:17` at `localhost:5432`. This supersedes [0002](0002-neon-http-driver-everywhere.md): the host runs on a Node runtime with TCP, so the HTTP driver's only advantage (no handshake) no longer outweighs its lack of interactive transactions.

## Considered Options

- **Keep `neon-http` with the local proxy**: no interactive transactions, and a proxy image plus a `db.localtest.me` hostname just for local dev.
- **`neon-serverless` Pool (WebSocket)**: needs a WebSocket shim on Node and still needs a proxy locally.

## Consequences

- `db.transaction` is available; single-statement atomic rules remain valid and stay as they are.
- Migrations prefer `DATABASE_URL_UNPOOLED` (direct connection) when set, falling back to `DATABASE_URL`, because DDL does not belong behind PgBouncer.
- Seed and cleanup use `DATABASE_URL` only; only `migrate` prefers `DATABASE_URL_UNPOOLED`, and it prints the target host so a mismatch is visible.
- `createApp` builds a pool per call, so a host must build the app once per module (as `examples/node/server.ts` does), not per request.
- `createDb` opens no connection until the first query. Long-lived servers keep the pool; the CLI closes it with `closeDb` so the process can exit. Tests share one module-level pool per test file and let vitest tear the process down.
- Repositories stay typed against Drizzle's generic `PgDatabase`.
