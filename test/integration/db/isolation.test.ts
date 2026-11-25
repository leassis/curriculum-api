import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { TEST_DATABASE_URL, testDb } from "../../support/db";

const endpoint = (url: URL) => `${url.hostname}:${url.port || "5432"}`;

describe("test database isolation", () => {
  it("connects to the run's container, not DATABASE_URL", async () => {
    const containerUrl = new URL(TEST_DATABASE_URL);
    // The one place under test/ that reads DATABASE_URL (see repo-layout.test.ts). It is the Owner's
    // dev URL, absent in a clean CI run, so the comparison runs only when it is set.
    const dev = process.env.DATABASE_URL;
    if (dev) expect(endpoint(containerUrl)).not.toBe(endpoint(new URL(dev)));
    const result = (await testDb().execute(sql`select current_database() as name`)) as unknown as {
      rows: { name: string }[];
    };
    expect(containerUrl.pathname.slice(1)).not.toBe("");
    expect(result.rows[0]?.name).toBe(containerUrl.pathname.slice(1));
  });
});
