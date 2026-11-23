import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { tailoredResumes } from "../db/schema.js";

export type ResumeRow = typeof tailoredResumes.$inferSelect;
export interface ResumeInsert {
  title: string;
  company: string | null;
  jobDescription: string;
  customInstructions: string;
  /** `null` or omitted stores NULL, meaning every Personal Info Field. */
  headerFields?: string[] | null;
}
export interface ResumePatch {
  content?: string;
  model?: string | null;
  /** The Resume Document, already validated by the service; stored as jsonb. */
  structured?: unknown;
  customInstructions?: string;
  /** `null` stores NULL, meaning every Personal Info Field. */
  headerFields?: string[] | null;
}

export interface ResumeRepo {
  list(): Promise<ResumeRow[]>;
  find(id: string): Promise<ResumeRow | null>;
  insert(row: ResumeInsert): Promise<ResumeRow>;
  update(id: string, patch: ResumePatch): Promise<ResumeRow | null>;
  delete(id: string): Promise<boolean>;
}

export class ResumeRepository implements ResumeRepo {
  constructor(private readonly db: Db) {}

  list(): Promise<ResumeRow[]> {
    return this.db
      .select()
      .from(tailoredResumes)
      .orderBy(desc(tailoredResumes.createdAt), desc(tailoredResumes.id));
  }

  async find(id: string): Promise<ResumeRow | null> {
    const [row] = await this.db.select().from(tailoredResumes).where(eq(tailoredResumes.id, id));
    return row ?? null;
  }

  async insert(row: ResumeInsert): Promise<ResumeRow> {
    const [created] = await this.db.insert(tailoredResumes).values(row).returning();
    return created as ResumeRow;
  }

  async update(id: string, patch: ResumePatch): Promise<ResumeRow | null> {
    const [row] = await this.db
      .update(tailoredResumes)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(eq(tailoredResumes.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(tailoredResumes)
      .where(eq(tailoredResumes.id, id))
      .returning({ id: tailoredResumes.id });
    return rows.length > 0;
  }
}
