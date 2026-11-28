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
    const [row] = await db.insert(tailoredResumes).values(base).returning();
    expect(row?.targetPages).toBe(2);
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
