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
      content: "",
      headerFields: null,
      model: null,
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
    if (patch.content !== undefined) next.content = patch.content;
    if (patch.model !== undefined) next.model = patch.model;
    if (patch.customInstructions !== undefined) next.customInstructions = patch.customInstructions;
    if (patch.headerFields !== undefined) next.headerFields = patch.headerFields;
    next.updatedAt = new Date();
    this.rows[index] = next;
    return next;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.id !== id);
    return this.rows.length < before;
  }
}
