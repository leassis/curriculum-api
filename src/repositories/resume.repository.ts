import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { tailoredResumes } from "../db/schema.js";

export type ResumeRow = typeof tailoredResumes.$inferSelect;
export interface ResumeInsert {
  title: string;
  company: string | null;
  jobDescription: string;
  customInstructions: string;
  jobLink?: string;
  recruiterName?: string;
  notes?: string;
  /** `null` or omitted stores NULL, meaning every Personal Info Field. */
  headerFields?: string[] | null;
}
export interface ResumePatch {
  model?: string | null;
  /** The Resume Document, already validated by the service; stored as jsonb. */
  structured?: unknown;
  customInstructions?: string;
  jobLink?: string;
  recruiterName?: string;
  notes?: string;
  /** `null` stores NULL, meaning every Personal Info Field. */
  headerFields?: string[] | null;
  score?: number | null;
  scoreRationale?: string;
  missingSkills?: string[];
  /** Array of `{ what, reason }`, already validated by the service; stored as jsonb. */
  omissions?: unknown;
  /** The Short Job Description, already trimmed and bounded by the service; `null` clears it. */
  jobDescriptionShort?: string | null;
}

export interface ResumeRepo {
  list(): Promise<ResumeRow[]>;
  find(id: string): Promise<ResumeRow | null>;
  insert(row: ResumeInsert): Promise<ResumeRow>;
  update(id: string, patch: ResumePatch): Promise<ResumeRow | null>;
  /** Locks the row, lets `fn` turn it into a patch, and stores that patch in one transaction. */
  change(
    id: string,
    fn: (row: ResumeRow) => ResumePatch | Promise<ResumePatch>,
  ): Promise<ResumeRow | null>;
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

  change(
    id: string,
    fn: (row: ResumeRow) => ResumePatch | Promise<ResumePatch>,
  ): Promise<ResumeRow | null> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(tailoredResumes)
        .where(eq(tailoredResumes.id, id))
        .for("update");
      if (!current) return null;
      const patch = await fn(current);
      const [row] = await tx
        .update(tailoredResumes)
        .set({ ...patch, updatedAt: sql`now()` })
        .where(eq(tailoredResumes.id, id))
        .returning();
      return row ?? null;
    });
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(tailoredResumes)
      .where(eq(tailoredResumes.id, id))
      .returning({ id: tailoredResumes.id });
    return rows.length > 0;
  }
}
