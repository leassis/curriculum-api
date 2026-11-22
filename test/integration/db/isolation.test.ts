import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, testDb } from "../../support/db";

describe("test database isolation", () => {
  it("connects to the run's Neon branch, not DATABASE_URL", async () => {
    const branchUrl = new URL(TEST_DATABASE_URL);
    const host = branchUrl.hostname;
    expect(host.endsWith(".neon.tech")).toBe(true);
    // Development runs on Neon Local, which is never a *.neon.tech host.
    expect(["localhost", "127.0.0.1"]).not.toContain(host);
    // The one place under test/ that reads DATABASE_URL (see repo-layout.test.ts). It is the Owner's
    // dev URL, absent in a clean CI run, so the comparison runs only when it is set.
    const dev = process.env.DATABASE_URL;
    if (dev) expect(new URL(dev).hostname).not.toBe(host);
    const result = (await testDb().execute(sql`select current_database() as name`)) as unknown as {
      rows: { name: string }[];
    };
    expect(branchUrl.pathname.slice(1)).not.toBe("");
    expect(result.rows[0]?.name).toBe(branchUrl.pathname.slice(1));
  });
});
