import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrate as runMigrations } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, createDb } from "../../../src/db/client";
import { migrate } from "../../../src/db/migrate";
import { careerLibrary, profile } from "../../../src/db/schema";
import { pgErrorCode, resetDb, TEST_DATABASE_URL, testDb } from "../../support/db";

const db = testDb();
const DRIZZLE = join(import.meta.dirname, "../../../drizzle");

async function rows<T>(query: string): Promise<T[]> {
  const result = await db.execute(sql.raw(query));
  return (result as unknown as { rows: T[] }).rows;
}

function migrationsUpTo(last: number): string {
  const dir = mkdtempSync(join(tmpdir(), "drizzle-upto-"));
  cpSync(DRIZZLE, dir, { recursive: true });
  const journalPath = join(dir, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: { idx: number }[];
  };
  journal.entries = journal.entries.filter((e) => e.idx <= last);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return pgErrorCode(error);
  }
  return undefined;
}

describe("career migration", () => {
  const folder = migrationsUpTo(5);

  afterAll(async () => {
    rmSync(folder, { recursive: true, force: true });
    await migrate(TEST_DATABASE_URL);
  });

  beforeEach(async () => {
    await resetDb(db);
  });

  it("creates the singleton library and the profile summary", async () => {
    expect(await codeOf(db.insert(careerLibrary).values({ id: 2 }))).toBe("23514");

    await db.insert(careerLibrary).values({ id: 1 });
    const [library] = await db.select().from(careerLibrary);
    expect(library?.document).toEqual({ version: 1, items: [] });

    await db.execute(sql`
      INSERT INTO curriculum_api.profile
        (id, full_name, headline, public_system_prompt, recruiter_system_prompt, tailor_system_prompt)
      VALUES (1, 'Ada', 'Engineer', 'p', 'r', 't')`);
    const [row] = await db.select().from(profile);
    expect(row?.summary).toBe("");
  });

  it("drops the master cv and discards v1 documents keeping rows", async () => {
    await db.execute(sql.raw('DROP SCHEMA IF EXISTS "curriculum_api" CASCADE'));
    const direct = createDb(TEST_DATABASE_URL);
    try {
      await runMigrations(direct, {
        migrationsFolder: folder,
        migrationsSchema: "curriculum_api",
        migrationsTable: "__drizzle_migrations",
      });
    } finally {
      await closeDb(direct);
    }

    await rows(`
        INSERT INTO curriculum_api.profile
          (id, full_name, headline, master_cv, public_system_prompt, recruiter_system_prompt, tailor_system_prompt)
        VALUES (1, 'Ada', 'Engineer', '## Old cv', 'p', 'r', 't')`);
    const [resume] = await rows<{ id: string }>(`
        INSERT INTO curriculum_api.tailored_resumes
          (title, company, job_description, structured, custom_instructions, header_fields, model)
        VALUES ('Backend at Acme', 'Acme', 'Senior backend engineer',
          '{"version":1,"sections":[]}'::jsonb, 'One page', ARRAY['EMAIL'], 'vendor/old-model')
        RETURNING id`);
    const id = resume?.id ?? "";
    await rows(`
        INSERT INTO curriculum_api.recruiter_chats (token, recruiter_name, tailored_resume_id)
        VALUES ('tok-career', 'Recruiter', '${id}')`);

    await migrate(TEST_DATABASE_URL);

    const columns = await rows<{ column_name: string }>(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'curriculum_api' AND table_name = 'profile'`);
    expect(columns.map((c) => c.column_name)).not.toContain("master_cv");

    const [kept] = await rows<Record<string, unknown>>("SELECT * FROM curriculum_api.profile");
    expect(kept).toMatchObject({ full_name: "Ada", headline: "Engineer" });

    const after = await rows<Record<string, unknown>>(
      "SELECT * FROM curriculum_api.tailored_resumes",
    );
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({
      id,
      title: "Backend at Acme",
      company: "Acme",
      job_description: "Senior backend engineer",
      custom_instructions: "One page",
      header_fields: ["EMAIL"],
      model: null,
      structured: null,
    });
    const chats = await rows<{ tailored_resume_id: string }>(
      "SELECT tailored_resume_id FROM curriculum_api.recruiter_chats WHERE token = 'tok-career'",
    );
    expect(chats).toEqual([{ tailored_resume_id: id }]);
  });
});
