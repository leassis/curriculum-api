import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { careerLibrary, profile } from "../../../src/db/schema";
import { seed } from "../../../src/db/seed";
import {
  DEFAULT_PUBLIC_SYSTEM_PROMPT,
  DEFAULT_RECRUITER_SYSTEM_PROMPT,
  DEFAULT_TAILOR_SYSTEM_PROMPT,
} from "../../../src/llm/default-prompts";
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
    expect([row?.fullName, row?.headline]).toEqual(["", ""]);
    for (const prompt of [
      row?.publicSystemPrompt,
      row?.recruiterSystemPrompt,
      row?.tailorSystemPrompt,
    ]) {
      expect(prompt?.length).toBeGreaterThan(0);
    }
  });

  it("creates the empty career library and summary", async () => {
    await seed(TEST_DATABASE_URL);
    const [library] = await db.select().from(careerLibrary);
    expect(library?.document).toEqual({ version: 1, items: [] });
    const [row] = await db.select().from(profile);
    expect(row?.summary).toBe("");
  });

  it("updates an existing profile's prompts to the defaults and keeps its other fields", async () => {
    await db.insert(profile).values({
      id: 1,
      fullName: "Ada",
      headline: "Engineer",
      summary: "Builds things",
      publicSystemPrompt: "custom public",
      recruiterSystemPrompt: "custom recruiter",
      tailorSystemPrompt: "custom tailor",
    });
    expect(await seed(TEST_DATABASE_URL)).toBe("updated");
    const [after] = await db.select().from(profile).where(eq(profile.id, 1));
    expect([after?.fullName, after?.headline, after?.summary]).toEqual([
      "Ada",
      "Engineer",
      "Builds things",
    ]);
    expect(after?.publicSystemPrompt).toBe(DEFAULT_PUBLIC_SYSTEM_PROMPT);
    expect(after?.recruiterSystemPrompt).toBe(DEFAULT_RECRUITER_SYSTEM_PROMPT);
    expect(after?.tailorSystemPrompt).toBe(DEFAULT_TAILOR_SYSTEM_PROMPT);
    const libraries = await db.select().from(careerLibrary);
    expect(libraries).toHaveLength(1);
  });
});
