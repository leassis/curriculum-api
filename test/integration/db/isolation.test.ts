import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, testDb } from "../../support/db";

describe("test database isolation", () => {
  it("connects to the run's Neon branch, not DATABASE_URL", async () => {
    const host = new URL(TEST_DATABASE_URL).hostname;
    expect(host.endsWith(".neon.tech")).toBe(true);
    // The one place under test/ that reads DATABASE_URL, to compare hosts (see repo-layout.test.ts).
    const dev = process.env.DATABASE_URL;
    if (dev) expect(new URL(dev).hostname).not.toBe(host);
    const result = (await testDb().execute(sql`select current_database() as name`)) as unknown as {
      rows: { name: string }[];
    };
    expect(result.rows[0]?.name).toEqual(expect.any(String));
  });
});
