import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/** Generic Drizzle database: repositories never depend on the neon-http driver (AD-002). */
export type Db = PgDatabase<PgQueryResultHKT>;

const LOCAL_HOST = "db.localtest.me";

export function fetchEndpointFor(host: string): string {
  return host === LOCAL_HOST ? `http://${LOCAL_HOST}:4444/sql` : `https://${host}/sql`;
}

// A pure assignment, no I/O at import time.
neonConfig.fetchEndpoint = fetchEndpointFor;

export function createDb(url: string): Db {
  return drizzle(neon(url), { casing: "snake_case" });
}
