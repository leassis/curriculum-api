import { lt, sql } from "drizzle-orm";
import { closeDb, createDb } from "./client.js";
import { adminLoginAttempts, publicUsage } from "./schema.js";

/** Deletes `public_usage` and `admin_login_attempts` rows older than `days` days. */
export async function cleanup(
  databaseUrl: string,
  days = 30,
): Promise<{ publicUsage: number; loginAttempts: number }> {
  const db = createDb(databaseUrl);
  try {
    const usage = await db
      .delete(publicUsage)
      .where(lt(publicUsage.day, sql`(current_date - ${days}::int)`))
      .returning({ ipHash: publicUsage.ipHash });
    const attempts = await db
      .delete(adminLoginAttempts)
      .where(lt(adminLoginAttempts.windowStart, sql`(now() - make_interval(days => ${days}::int))`))
      .returning({ ipHash: adminLoginAttempts.ipHash });
    return { publicUsage: usage.length, loginAttempts: attempts.length };
  } finally {
    await closeDb(db);
  }
}
