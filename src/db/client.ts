import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";

/** Generic Drizzle database: repositories never depend on the concrete driver (ADR 0003). */
export type Db = PgDatabase<PgQueryResultHKT>;

/** A `Db` that owns its connection pool, so short-lived callers (CLI, tests) can close it. */
export type PooledDb = NodePgDatabase & { $client: Pool };

/** Kept small: the pooled (PgBouncer) connection string multiplexes server connections. */
const POOL_MAX = 5;
const CONNECT_TIMEOUT_MS = 5_000;
const STATEMENT_TIMEOUT_MS = 30_000;

/** Builds the pool lazily: no connection is opened until the first query. */
export function createDb(url: string): PooledDb {
  const pool = new Pool({
    connectionString: url,
    max: POOL_MAX,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });
  // An idle client can be dropped by the server or the pooler; without a listener that crashes the process.
  pool.on("error", (error) => console.error("postgres pool error:", error.message));
  return drizzle(pool, { casing: "snake_case" });
}

/** Ends the pool so the process can exit. */
export async function closeDb(db: PooledDb): Promise<void> {
  await db.$client.end();
}
