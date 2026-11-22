import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { adminLoginAttempts } from "../db/schema.js";

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
    const result = (await this.db.execute(sql`
      select
        (select count(*) from curriculum_api.recruiter_chats
          where status = 'active' and (expires_at is null or expires_at > now()))::int as chats,
        (select count(*) from curriculum_api.tailored_resumes)::int as resumes,
        (select coalesce(sum(used), 0) from curriculum_api.public_usage
          where day = current_date)::int as usage
    `)) as unknown as { rows: { chats: number; resumes: number; usage: number }[] };
    const row = result.rows[0];
    return {
      activeChats: Number(row?.chats ?? 0),
      resumes: Number(row?.resumes ?? 0),
      publicQuestionsToday: Number(row?.usage ?? 0),
    };
  }
}
