import { sql } from "drizzle-orm";
import { createDb, type Db } from "../../src/db/client";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@db.localtest.me:5432/curriculum_test";

export function testDb(): Db {
  return createDb(TEST_DATABASE_URL);
}

const TABLES = [
  "profile",
  "settings",
  "personal_info",
  "tailored_resumes",
  "recruiter_chats",
  "public_usage",
  "admin_login_attempts",
];

export async function resetDb(db: Db = testDb()): Promise<void> {
  const list = TABLES.map((t) => `"curriculum_api"."${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
}

/** Error code of a Postgres failure, however the driver wrapped it. */
export function pgErrorCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}
