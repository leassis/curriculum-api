import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate as runMigrations } from "drizzle-orm/neon-http/migrator";
import "./client.js"; // routes db.localtest.me to the local proxy

/** `drizzle/` sits next to `dist/` once packaged, and two levels above `src/db/` in source. */
function migrationsFolder(): string {
  for (const relative of ["../drizzle", "../../drizzle"]) {
    const path = fileURLToPath(new URL(relative, import.meta.url));
    if (existsSync(`${path}/meta/_journal.json`)) return path;
  }
  throw new Error("drizzle migrations folder not found");
}

export async function migrate(databaseUrl: string): Promise<void> {
  const db = drizzle(neon(databaseUrl), { casing: "snake_case" });
  await runMigrations(db, {
    migrationsFolder: migrationsFolder(),
    migrationsSchema: "curriculum_api",
    migrationsTable: "__drizzle_migrations",
  });
}
