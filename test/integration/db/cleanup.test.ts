import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup } from "../../../src/db/cleanup";
import { adminLoginAttempts, publicUsage } from "../../../src/db/schema";
import { resetDb, TEST_DATABASE_URL, testDb } from "../../support/db";

const db = testDb();

describe("cleanup", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("deletes rows older than 30 days", async () => {
    await db.insert(publicUsage).values([
      { ipHash: "old", day: sql`current_date - 31`, used: 1 },
      { ipHash: "new", day: sql`current_date - 29`, used: 1 },
    ]);
    await db.insert(adminLoginAttempts).values([
      { ipHash: "old", windowStart: sql`now() - interval '31 days'`, count: 1 },
      { ipHash: "new", windowStart: sql`now() - interval '29 days'`, count: 1 },
    ]);

    expect(await cleanup(TEST_DATABASE_URL)).toEqual({ publicUsage: 1, loginAttempts: 1 });

    expect((await db.select().from(publicUsage)).map((r) => r.ipHash)).toEqual(["new"]);
    expect((await db.select().from(adminLoginAttempts)).map((r) => r.ipHash)).toEqual(["new"]);
  });
});
