import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { migrate } from "../../../src/db/migrate";
import { TEST_DATABASE_URL, testDb } from "../../support/db";

const db = testDb();

async function rows<T>(query: string): Promise<T[]> {
  const result = await db.execute(sql.raw(query));
  return (result as unknown as { rows: T[] }).rows;
}

async function dropSchema() {
  await db.execute(sql.raw('DROP SCHEMA IF EXISTS "curriculum_api" CASCADE'));
}

async function publicObjectCounts() {
  const [row] = await rows<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'S')) AS relations,
      (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public') AS types,
      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public') AS functions`);
  return {
    relations: Number(row?.relations),
    types: Number(row?.types),
    functions: Number(row?.functions),
  };
}

describe("migrate", () => {
  beforeEach(dropSchema);

  it("creates eight tables and the migrations table in curriculum_api", async () => {
    await migrate(TEST_DATABASE_URL);
    const tables = await rows<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'curriculum_api' ORDER BY table_name",
    );
    expect(tables.map((t) => t.table_name)).toEqual([
      "__drizzle_migrations",
      "admin_login_attempts",
      "personal_info",
      "profile",
      "public_usage",
      "recruiter_chat_messages",
      "recruiter_chats",
      "settings",
      "tailored_resumes",
    ]);
  });

  it("creates nothing in public", async () => {
    await migrate(TEST_DATABASE_URL);
    expect(await publicObjectCounts()).toEqual({ relations: 0, types: 0, functions: 0 });
  });

  it("second run applies nothing", async () => {
    await migrate(TEST_DATABASE_URL);
    const before = await rows("SELECT * FROM curriculum_api.__drizzle_migrations");
    await expect(migrate(TEST_DATABASE_URL)).resolves.toBeUndefined();
    const after = await rows("SELECT * FROM curriculum_api.__drizzle_migrations");
    expect(before).toHaveLength(4);
    expect(after).toEqual(before);
  });
});
