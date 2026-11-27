import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { tailoredResumes } from "../../../src/db/schema";
import { resetDb, testDb } from "../../support/db";

const db = testDb();

describe("short-jd migration", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("adds a nullable job_description_short that starts NULL", async () => {
    const [row] = await db
      .insert(tailoredResumes)
      .values({ title: "T", jobDescription: "JD" })
      .returning();
    expect(row?.jobDescriptionShort).toBeNull();

    const [withValue] = await db
      .insert(tailoredResumes)
      .values({ title: "T", jobDescription: "JD", jobDescriptionShort: "- Requirement" })
      .returning();
    expect(withValue?.jobDescriptionShort).toBe("- Requirement");

    const columns = await db.execute(
      sql`select data_type, is_nullable, column_default from information_schema.columns
          where table_schema = 'curriculum_api' and table_name = 'tailored_resumes'
          and column_name = 'job_description_short'`,
    );
    expect(columns.rows[0]).toMatchObject({
      data_type: "text",
      is_nullable: "YES",
      column_default: null,
    });
  });
});
