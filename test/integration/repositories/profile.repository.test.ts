import { beforeEach, describe, expect, it } from "vitest";
import { ProfileRepository } from "../../../src/repositories/profile.repository";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new ProfileRepository(db);

const input = {
  fullName: "Ada",
  headline: "Engineer",
  summary: "summary v1",
  publicSystemPrompt: "p",
  recruiterSystemPrompt: "r",
  tailorSystemPrompt: "t",
};

describe("ProfileRepository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("upsert writes row 1 and updated_at", async () => {
    expect(await repo.find()).toBeNull();

    const first = await repo.upsert(input);
    expect(first.id).toBe(1);
    expect(first.summary).toBe("summary v1");

    const second = await repo.upsert({ ...input, summary: "summary v2" });
    expect(second.id).toBe(1);
    expect(second.summary).toBe("summary v2");
    expect(second.updatedAt.getTime()).toBeGreaterThan(first.updatedAt.getTime());

    expect(await repo.find()).toEqual(second);
  });
});
