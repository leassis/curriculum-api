import { sql } from "drizzle-orm";
import { inject } from "vitest";
import { createDb, type Db } from "../../src/db/client";

/** The run's throwaway Neon branch (integration only); unit tests never query. */
export const TEST_DATABASE_URL =
  inject("testDatabaseUrl") ?? "postgres://unused@unused.invalid/unused";

let shared: Db | undefined;

/** One pool per test file (module), reused by every call. */
export function testDb(): Db {
  shared ??= createDb(TEST_DATABASE_URL);
  return shared;
}

/** Throws unless the database name contains "test": resetDb wipes everything. */
export function assertTestDatabase(name: string): void {
  if (!name.includes("test")) {
    throw new Error(`refusing to TRUNCATE database "${name}": name must contain "test"`);
  }
}

const TABLES = [
  "profile",
  "settings",
  "personal_info",
  "tailored_resumes",
  "recruiter_chats",
  "recruiter_chat_messages",
  "public_usage",
  "admin_login_attempts",
];

export async function resetDb(db: Db = testDb()): Promise<void> {
  const current = (await db.execute(sql`SELECT current_database() AS name`)) as {
    rows: { name: string }[];
  };
  assertTestDatabase(String(current.rows[0]?.name));
  const list = TABLES.map((t) => `"curriculum_api"."${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
}

/** Error code of a Postgres failure, however the driver wrapped it. */
export function pgErrorCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}
