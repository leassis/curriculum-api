import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrate as runMigrations } from "drizzle-orm/node-postgres/migrator";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, createDb } from "../../../src/db/client";
import { migrate } from "../../../src/db/migrate";
import { TEST_DATABASE_URL, testDb } from "../../support/db";

const db = testDb();
const DRIZZLE = join(import.meta.dirname, "../../../drizzle");

async function rows<T>(query: string): Promise<T[]> {
  const result = await db.execute(sql.raw(query));
  return (result as unknown as { rows: T[] }).rows;
}

/** A copy of `drizzle/` whose journal stops at migration `last` (by index). */
function migrationsUpTo(last: number): string {
  const dir = mkdtempSync(join(tmpdir(), "drizzle-upto-"));
  cpSync(DRIZZLE, dir, { recursive: true });
  const journalPath = join(dir, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
  journal.entries = journal.entries.filter((e) => e.idx <= last);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

describe("structured migration", () => {
  const folder = migrationsUpTo(3);

  afterAll(async () => {
    rmSync(folder, { recursive: true, force: true });
    // Leave the branch fully migrated for the files that run after this one.
    await migrate(TEST_DATABASE_URL);
  });

  it("keeps resume rows and links and drops content", async () => {
    await db.execute(sql.raw('DROP SCHEMA IF EXISTS "curriculum_api" CASCADE'));
    // Same call as src/db/migrate.ts, on a journal that stops at 0003.
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
    const tags = await rows<{ n: string }>(
      "SELECT count(*) AS n FROM curriculum_api.__drizzle_migrations",
    );
    expect(Number(tags[0]?.n)).toBe(4);

    // A row as it stood at 0003: generated markdown in content, the model that wrote it.
    const [resume] = await rows<{ id: string }>(`
      INSERT INTO curriculum_api.tailored_resumes
        (title, company, job_description, content, custom_instructions, header_fields, model)
      VALUES ('Backend at Acme', 'Acme', 'Senior backend engineer', '## Old markdown',
        'One page', ARRAY['EMAIL','PHONE'], 'vendor/old-model')
      RETURNING id`);
    const id = resume?.id ?? "";
    await rows(`
      INSERT INTO curriculum_api.recruiter_chats (token, recruiter_name, tailored_resume_id)
      VALUES ('tok-structured', 'Recruiter', '${id}')`);

    await migrate(TEST_DATABASE_URL);

    const columns = await rows<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'curriculum_api' AND table_name = 'tailored_resumes'`);
    const names = columns.map((c) => c.column_name);
    expect(names).not.toContain("content");
    expect(names).toContain("structured");

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
      header_fields: ["EMAIL", "PHONE"],
      model: null,
      structured: null,
    });
    expect(after[0]).not.toHaveProperty("content");

    const chats = await rows<{ tailored_resume_id: string }>(
      "SELECT tailored_resume_id FROM curriculum_api.recruiter_chats WHERE token = 'tok-structured'",
    );
    expect(chats).toEqual([{ tailored_resume_id: id }]);
  });
});
