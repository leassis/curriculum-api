import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { tailoredResumes } from "../../../src/db/schema";
import { pgErrorCode, resetDb, testDb } from "../../support/db";

const db = testDb();
const base = { title: "T", jobDescription: "JD" };

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return pgErrorCode(error);
  }
  return undefined;
}

describe("target pages column", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("gives existing resumes target pages 2", async () => {
    // Put the table back as it was before 0010, add a resume, then run the migration's own SQL.
    await db.execute(
      sql.raw('ALTER TABLE "curriculum_api"."tailored_resumes" DROP COLUMN "target_pages"'),
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "curriculum_api"."tailored_resumes" (title, job_description) VALUES ('Old', 'JD')`,
      ),
    );
    const file = readFileSync(
      new URL("../../../drizzle/0010_cute_blue_shield.sql", import.meta.url),
      "utf8",
    );
    for (const statement of file.split("--> statement-breakpoint")) {
      await db.execute(sql.raw(statement));
    }
    const [old] = await db.select().from(tailoredResumes);
    expect(old?.targetPages).toBe(2);
    expect(await codeOf(db.insert(tailoredResumes).values({ ...base, targetPages: 4 }))).toBe(
      "23514",
    );
    const [three] = await db
      .insert(tailoredResumes)
      .values({ ...base, targetPages: 3 })
      .returning();
    expect(three?.targetPages).toBe(3);
  });

  it("rejects target pages outside 1 to 3", async () => {
    expect(await codeOf(db.insert(tailoredResumes).values({ ...base, targetPages: 4 }))).toBe(
      "23514",
    );
    expect(await codeOf(db.insert(tailoredResumes).values({ ...base, targetPages: 0 }))).toBe(
      "23514",
    );
  });
});
