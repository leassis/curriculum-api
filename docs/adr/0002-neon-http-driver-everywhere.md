# `neon-http` driver everywhere, local proxy for dev and tests

Status: superseded by [0003](0003-node-postgres-driver.md).

Production, local dev, tests and CI all use `drizzle-orm/neon-http`. Locally that driver talks to Docker Compose `postgres:17` through `local-neon-http-proxy`. Tests therefore run the same query path as production, including the single-statement atomic counters.

## Considered Options

- **Neon `dev` branch for tests**: needs network access, and test runs share remote state.
- **`node-postgres` locally, `neon-http` in prod**: driver behaviour differs, so tests would not prove the production path.
- **Pooled driver (`neon-serverless` Pool or `pg` Pool) in prod**: wins when a request runs many sequential queries or needs interactive transactions. Our requests run 1–3 single-statement queries, where HTTP avoids the connection handshake.

## Consequences

- No interactive transactions. Anything atomic is one SQL statement, or a non-interactive `db.batch`.
- Repositories are typed against Drizzle's generic `PgDatabase`, so a pooled driver can replace `createDb` later without touching them.
