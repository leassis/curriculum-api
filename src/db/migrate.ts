import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { migrate as runMigrations } from "drizzle-orm/node-postgres/migrator";
import { closeDb, createDb } from "./client.js";

/** `drizzle/` sits next to `dist/` once packaged, and two levels above `src/db/` in source. */
function migrationsFolder(): string {
  for (const relative of ["../drizzle", "../../drizzle"]) {
    const path = fileURLToPath(new URL(relative, import.meta.url));
    if (existsSync(`${path}/meta/_journal.json`)) return path;
  }
  throw new Error("drizzle migrations folder not found");
}

/** Pass the unpooled (direct) connection string when there is one: DDL does not belong behind PgBouncer. */
export async function migrate(databaseUrl: string): Promise<void> {
  const db = createDb(databaseUrl);
  try {
    await runMigrations(db, {
      migrationsFolder: migrationsFolder(),
      migrationsSchema: "curriculum_api",
      migrationsTable: "__drizzle_migrations",
    });
  } finally {
    await closeDb(db);
  }
}
