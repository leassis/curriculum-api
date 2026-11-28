import type {
  ResumeInsert,
  ResumePatch,
  ResumeRepo,
  ResumeRow,
} from "../../src/repositories/resume.repository";

export class FakeResumeRepo implements ResumeRepo {
  rows: ResumeRow[] = [];
  inserts = 0;
  private tick = 0;

  async list(): Promise<ResumeRow[]> {
    return [...this.rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async find(id: string): Promise<ResumeRow | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async insert(input: ResumeInsert): Promise<ResumeRow> {
    this.inserts++;
    const at = new Date(Date.UTC(2026, 0, 1) + ++this.tick * 60_000);
    const row: ResumeRow = {
      id: `00000000-0000-4000-8000-${String(this.tick).padStart(12, "0")}`,
      ...input,
      jobLink: input.jobLink ?? "",
      recruiterName: input.recruiterName ?? "",
      notes: input.notes ?? "",
      headerFields: input.headerFields ?? null,
      model: null,
      structured: null,
      score: null,
      scoreRationale: "",
      missingSkills: [],
      omissions: [],
      jobDescriptionShort: null,
      targetPages: input.targetPages ?? 2,
      createdAt: at,
      updatedAt: at,
    };
    this.rows.push(row);
    return row;
  }

  async update(id: string, patch: ResumePatch): Promise<ResumeRow | null> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index < 0) return null;
    const next = { ...(this.rows[index] as ResumeRow) };
    if (patch.model !== undefined) next.model = patch.model;
    if (patch.structured !== undefined) next.structured = structuredClone(patch.structured);
    if (patch.customInstructions !== undefined) next.customInstructions = patch.customInstructions;
    if (patch.headerFields !== undefined) next.headerFields = patch.headerFields;
    if (patch.company !== undefined) next.company = patch.company;
    if (patch.jobLink !== undefined) next.jobLink = patch.jobLink;
    if (patch.recruiterName !== undefined) next.recruiterName = patch.recruiterName;
    if (patch.notes !== undefined) next.notes = patch.notes;
    if (patch.score !== undefined) next.score = patch.score;
    if (patch.scoreRationale !== undefined) next.scoreRationale = patch.scoreRationale;
    if (patch.missingSkills !== undefined) next.missingSkills = [...patch.missingSkills];
    if (patch.jobDescriptionShort !== undefined) {
      next.jobDescriptionShort = patch.jobDescriptionShort;
    }
    if (patch.targetPages !== undefined) next.targetPages = patch.targetPages;
    if (patch.omissions !== undefined) next.omissions = structuredClone(patch.omissions);
    next.updatedAt = new Date();
    this.rows[index] = next;
    return next;
  }

  async change(
    id: string,
    fn: (row: ResumeRow) => ResumePatch | Promise<ResumePatch>,
  ): Promise<ResumeRow | null> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return null;
    return this.update(id, await fn(row));
  }

  async delete(id: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.id !== id);
    return this.rows.length < before;
  }
}
