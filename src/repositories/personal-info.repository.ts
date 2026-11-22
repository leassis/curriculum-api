import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { personalInfo } from "../db/schema.js";

export type PersonalInfoRow = typeof personalInfo.$inferSelect;
export type PersonalInfoInsert = Omit<typeof personalInfo.$inferInsert, "updatedAt">;
export type PersonalInfoPatch = Partial<Omit<PersonalInfoInsert, "key">>;

export interface PersonalInfoRepo {
  list(): Promise<PersonalInfoRow[]>;
  find(key: string): Promise<PersonalInfoRow | null>;
  insert(row: PersonalInfoInsert): Promise<PersonalInfoRow>;
  update(key: string, patch: PersonalInfoPatch): Promise<PersonalInfoRow | null>;
  delete(key: string): Promise<boolean>;
}

export class PersonalInfoRepository implements PersonalInfoRepo {
  constructor(private readonly db: Db) {}

  list(): Promise<PersonalInfoRow[]> {
    return this.db
      .select()
      .from(personalInfo)
      .orderBy(asc(personalInfo.sortOrder), asc(personalInfo.key));
  }

  async find(key: string): Promise<PersonalInfoRow | null> {
    const [row] = await this.db.select().from(personalInfo).where(eq(personalInfo.key, key));
    return row ?? null;
  }

  async insert(row: PersonalInfoInsert): Promise<PersonalInfoRow> {
    const [created] = await this.db.insert(personalInfo).values(row).returning();
    return created as PersonalInfoRow;
  }

  async update(key: string, patch: PersonalInfoPatch): Promise<PersonalInfoRow | null> {
    const [row] = await this.db
      .update(personalInfo)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(eq(personalInfo.key, key))
      .returning();
    return row ?? null;
  }

  async delete(key: string): Promise<boolean> {
    const rows = await this.db
      .delete(personalInfo)
      .where(eq(personalInfo.key, key))
      .returning({ key: personalInfo.key });
    return rows.length > 0;
  }
}
