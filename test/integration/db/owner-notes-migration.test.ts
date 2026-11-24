import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrate as runMigrations } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, createDb } from "../../../src/db/client";
import { migrate } from "../../../src/db/migrate";
import { TEST_DATABASE_URL, testDb } from "../../support/db";

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
    entries: { idx: number; tag: string }[];
  };
  journal.entries = journal.entries.filter((e) => e.idx <= last);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

describe("owner notes columns", () => {
  const folder = migrationsUpTo(7);

  beforeAll(async () => {
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
      INSERT INTO curriculum_api.tailored_resumes (title, company, job_description)
      VALUES ('Backend at Acme', 'Acme', 'Senior backend engineer')`);
    await rows(`
      INSERT INTO curriculum_api.profile
        (full_name, headline, summary, public_system_prompt, recruiter_system_prompt, tailor_system_prompt)
      VALUES ('Ada', 'Engineer', 'Summary', 'p', 'r', 't')`);
    await migrate(TEST_DATABASE_URL);
  });

  afterAll(async () => {
    rmSync(folder, { recursive: true, force: true });
    await migrate(TEST_DATABASE_URL);
  });

  it("reads tracking fields of an existing resume as empty", async () => {
    const resumes = await rows<Record<string, unknown>>(
      "SELECT title, job_link, recruiter_name, notes FROM curriculum_api.tailored_resumes",
    );
    expect(resumes).toEqual([
      { title: "Backend at Acme", job_link: "", recruiter_name: "", notes: "" },
    ]);
  });

  it("reads both profile texts of an existing profile as empty", async () => {
    const profiles = await rows<Record<string, unknown>>(
      "SELECT summary, additional_information, looking_forward_next FROM curriculum_api.profile",
    );
    expect(profiles).toEqual([
      { summary: "Summary", additional_information: "", looking_forward_next: "" },
    ]);
  });
});
