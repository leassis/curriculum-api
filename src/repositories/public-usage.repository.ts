import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { publicUsage } from "../db/schema.js";

export interface UsageGrant {
  used: number;
  /** The database day (`current_date`) the use was counted on. */
  day: string;
}

export interface PublicUsageRepo {
  /** Counts one use in a single atomic statement; null when the day's limit is already reached. */
  acquire(ipHash: string, limit: number): Promise<UsageGrant | null>;
  /** Gives one use back to the row `acquire` counted on; never goes below zero. */
  release(ipHash: string, day: string): Promise<void>;
}

export class PublicUsageRepository implements PublicUsageRepo {
  constructor(protected readonly db: Db) {}

  async acquire(ipHash: string, limit: number): Promise<UsageGrant | null> {
    const [row] = await this.db
      .insert(publicUsage)
      .values({ ipHash, day: sql`current_date`, used: 1 })
      .onConflictDoUpdate({
        target: [publicUsage.ipHash, publicUsage.day],
        set: { used: sql`${publicUsage.used} + 1` },
        setWhere: lt(publicUsage.used, limit),
      })
      .returning({ used: publicUsage.used, day: publicUsage.day });
    return row ?? null;
  }

  async release(ipHash: string, day: string): Promise<void> {
    await this.db
      .update(publicUsage)
      .set({ used: sql`greatest(${publicUsage.used} - 1, 0)` })
      .where(and(eq(publicUsage.ipHash, ipHash), eq(publicUsage.day, day)));
  }
}
