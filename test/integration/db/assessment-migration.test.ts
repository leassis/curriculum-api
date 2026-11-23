import { eq } from "drizzle-orm";
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

describe("assessment columns", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("adds the four columns with their defaults and the score check", async () => {
    const [row] = await db.insert(tailoredResumes).values(base).returning();
    expect(row).toMatchObject({
      score: null,
      scoreRationale: "",
      missingSkills: [],
      omissions: [],
    });

    expect(await codeOf(db.insert(tailoredResumes).values({ ...base, score: 101 }))).toBe("23514");
    expect(await codeOf(db.insert(tailoredResumes).values({ ...base, score: -1 }))).toBe("23514");
    await db.insert(tailoredResumes).values({ ...base, score: 0 });
    await db.insert(tailoredResumes).values({ ...base, score: 100 });

    const stored = {
      score: 64,
      scoreRationale: "Why.",
      missingSkills: ["Kubernetes"],
      omissions: [{ what: "A bullet", reason: "Off topic" }],
    };
    await db
      .update(tailoredResumes)
      .set(stored)
      .where(eq(tailoredResumes.id, row?.id as string));
    const [after] = await db
      .select()
      .from(tailoredResumes)
      .where(eq(tailoredResumes.id, row?.id as string));
    expect(after).toMatchObject(stored);
  });
});
