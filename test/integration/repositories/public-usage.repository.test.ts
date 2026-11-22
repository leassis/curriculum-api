import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { PublicUsageRepository } from "../../../src/repositories/public-usage.repository";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new PublicUsageRepository(db);

const rows = async () =>
  (
    (await db.execute(
      sql`select ip_hash, day::text as day, used from curriculum_api.public_usage order by day`,
    )) as unknown as { rows: { ip_hash: string; day: string; used: number }[] }
  ).rows;

describe("public usage repository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("grants exactly the limit under 20 parallel acquires", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => repo.acquire("ip-a", 5)));
    expect(results.filter((r) => r !== null)).toHaveLength(5);
    expect(
      results
        .filter((r) => r !== null)
        .map((r) => r?.used)
        .sort(),
    ).toEqual([1, 2, 3, 4, 5]);
    expect((await rows()).map((r) => r.used)).toEqual([5]);
  });

  it("gives a new day a fresh quota", async () => {
    for (let i = 0; i < 5; i++) await repo.acquire("ip-a", 5);
    expect(await repo.acquire("ip-a", 5)).toBeNull();
    await db.execute(
      sql`update curriculum_api.public_usage set day = current_date - 1 where ip_hash = 'ip-a'`,
    );
    expect((await repo.acquire("ip-a", 5))?.used).toBe(1);
    const all = await rows();
    expect(all.map((r) => r.used).sort()).toEqual([1, 5]);
    expect(await repo.acquire("ip-b", 5)).not.toBeNull();
  });

  it("releases one use and never goes below zero", async () => {
    const grant = await repo.acquire("ip-a", 5);
    await repo.acquire("ip-a", 5);
    await repo.release("ip-a", (grant as { day: string }).day);
    expect((await rows())[0]?.used).toBe(1);
    await repo.release("ip-a", (grant as { day: string }).day);
    await repo.release("ip-a", (grant as { day: string }).day);
    expect((await rows())[0]?.used).toBe(0);
  });

  it("stores the ip hash only", async () => {
    await repo.acquire("hash-of-ip", 5);
    const cols = (
      (await db.execute(
        sql`select column_name from information_schema.columns
            where table_schema = 'curriculum_api' and table_name = 'public_usage' order by column_name`,
      )) as unknown as { rows: { column_name: string }[] }
    ).rows.map((r) => r.column_name);
    expect(cols).toEqual(["day", "ip_hash", "used"]);
    expect((await rows())[0]?.ip_hash).toBe("hash-of-ip");
  });
});
