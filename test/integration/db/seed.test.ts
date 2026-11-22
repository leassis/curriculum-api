import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { profile } from "../../../src/db/schema";
import { seed } from "../../../src/db/seed";
import { resetDb, TEST_DATABASE_URL, testDb } from "../../support/db";

const db = testDb();

describe("seed", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("creates the profile row with default prompts", async () => {
    expect(await seed(TEST_DATABASE_URL)).toBe("created");
    const rows = await db.select().from(profile);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.id).toBe(1);
    expect([row?.fullName, row?.headline, row?.masterCv]).toEqual(["", "", ""]);
    for (const prompt of [
      row?.publicSystemPrompt,
      row?.recruiterSystemPrompt,
      row?.tailorSystemPrompt,
    ]) {
      expect(prompt?.length).toBeGreaterThan(0);
    }
  });

  it("leaves an existing profile unchanged", async () => {
    await db.insert(profile).values({
      id: 1,
      fullName: "Ada",
      headline: "Engineer",
      masterCv: "my cv",
      publicSystemPrompt: "custom public",
      recruiterSystemPrompt: "custom recruiter",
      tailorSystemPrompt: "custom tailor",
    });
    const [before] = await db.select().from(profile).where(eq(profile.id, 1));
    expect(await seed(TEST_DATABASE_URL)).toBe("exists");
    const [after] = await db.select().from(profile).where(eq(profile.id, 1));
    expect(after).toEqual(before);
  });
});
