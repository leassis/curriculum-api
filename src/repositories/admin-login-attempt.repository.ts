import { and, count, eq, gt, isNull, or, sql, sum } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { adminLoginAttempts, publicUsage, recruiterChats, tailoredResumes } from "../db/schema.js";

export interface DashboardCounts {
  activeChats: number;
  resumes: number;
  publicQuestionsToday: number;
}

export interface AdminLoginAttemptRepo {
  /** Failed attempts of one IP hash in the window starting at `windowStart`. */
  failures(ipHash: string, windowStart: Date): Promise<number>;
  /** Adds one failure in a single atomic statement; returns the new count. */
  recordFailure(ipHash: string, windowStart: Date): Promise<number>;
  counts(): Promise<DashboardCounts>;
}

export class AdminLoginAttemptRepository implements AdminLoginAttemptRepo {
  constructor(protected readonly db: Db) {}

  async failures(ipHash: string, windowStart: Date): Promise<number> {
    const [row] = await this.db
      .select({ count: adminLoginAttempts.count })
      .from(adminLoginAttempts)
      .where(
        and(eq(adminLoginAttempts.ipHash, ipHash), eq(adminLoginAttempts.windowStart, windowStart)),
      );
    return row?.count ?? 0;
  }

  async recordFailure(ipHash: string, windowStart: Date): Promise<number> {
    const [row] = await this.db
      .insert(adminLoginAttempts)
      .values({ ipHash, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [adminLoginAttempts.ipHash, adminLoginAttempts.windowStart],
        set: { count: sql`${adminLoginAttempts.count} + 1` },
      })
      .returning({ count: adminLoginAttempts.count });
    return row?.count ?? 0;
  }

  async counts(): Promise<DashboardCounts> {
    const [[chats], [resumeRows], [usage]] = await Promise.all([
      this.db
        .select({ n: count() })
        .from(recruiterChats)
        .where(
          and(
            eq(recruiterChats.status, "active"),
            or(isNull(recruiterChats.expiresAt), gt(recruiterChats.expiresAt, sql`now()`)),
          ),
        ),
      this.db.select({ n: count() }).from(tailoredResumes),
      this.db
        .select({ total: sum(publicUsage.used) })
        .from(publicUsage)
        .where(eq(publicUsage.day, sql`current_date`)),
    ]);
    return {
      activeChats: chats?.n ?? 0,
      resumes: resumeRows?.n ?? 0,
      publicQuestionsToday: Number(usage?.total ?? 0),
    };
  }
}
