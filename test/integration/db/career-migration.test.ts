import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { careerLibrary, profile } from "../../../src/db/schema";
import { pgErrorCode, resetDb, testDb } from "../../support/db";

const db = testDb();

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return pgErrorCode(error);
  }
  return undefined;
}

describe("career migration", () => {
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
        (id, full_name, headline, master_cv, public_system_prompt, recruiter_system_prompt, tailor_system_prompt)
      VALUES (1, 'Ada', 'Engineer', 'cv', 'p', 'r', 't')`);
    const [row] = await db.select().from(profile);
    expect(row?.summary).toBe("");
  });
});
