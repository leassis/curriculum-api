import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/** Generic Drizzle database: repositories never depend on the neon-http driver (AD-002). */
export type Db = PgDatabase<PgQueryResultHKT>;

const NEON_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Neon Local serves the HTTP SQL endpoint on the Postgres port; every other host is Neon cloud. */
export function fetchEndpointFor(host: string, port?: number | string): string {
  return NEON_LOCAL_HOSTS.has(host) ? `http://${host}:${port || 5432}/sql` : `https://${host}/sql`;
}

// A pure assignment, no I/O at import time.
neonConfig.fetchEndpoint = fetchEndpointFor;

export function createDb(url: string): Db {
  return drizzle(neon(url), { casing: "snake_case" });
}
