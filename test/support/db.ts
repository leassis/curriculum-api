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

const TABLES = [
  "profile",
  "career_library",
  "settings",
  "personal_info",
  "tailored_resumes",
  "recruiter_chats",
  "recruiter_chat_messages",
  "public_usage",
  "admin_login_attempts",
];

/** Wipes the run's throwaway Neon branch (never the dev database: its URL is injected by global setup). */
export async function resetDb(db: Db = testDb()): Promise<void> {
  const list = TABLES.map((t) => `"curriculum_api"."${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
}

/** Error code of a Postgres failure, however the driver wrapped it. */
export function pgErrorCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}
