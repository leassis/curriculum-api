import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { profile } from "../db/schema.js";

export type ProfileRow = typeof profile.$inferSelect;
export type ProfileInput = Omit<typeof profile.$inferInsert, "id" | "updatedAt">;

export interface ProfileRepo {
  find(): Promise<ProfileRow | null>;
  upsert(input: ProfileInput): Promise<ProfileRow>;
}

export class ProfileRepository implements ProfileRepo {
  constructor(private readonly db: Db) {}

  async find(): Promise<ProfileRow | null> {
    const [row] = await this.db.select().from(profile).where(eq(profile.id, 1));
    return row ?? null;
  }

  async upsert(input: ProfileInput): Promise<ProfileRow> {
    const [row] = await this.db
      .insert(profile)
      .values({ ...input, id: 1 })
      .onConflictDoUpdate({ target: profile.id, set: { ...input, updatedAt: sql`now()` } })
      .returning();
    return row as ProfileRow;
  }
}
