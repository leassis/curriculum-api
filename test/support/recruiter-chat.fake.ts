import type {
  ChatMessageInsert,
  ChatMessageRow,
  RecruiterChatInsert,
  RecruiterChatRepo,
  RecruiterChatRow,
  ResumeContext,
  ResumeOption,
} from "../../src/repositories/recruiter-chat.repository";

/** In-memory chats; expiry is read from the row against the real clock, as `now()` would. */
export class FakeRecruiterChatRepo implements RecruiterChatRepo {
  rows: RecruiterChatRow[] = [];
  /** id -> { title, structured }; the Tailored Resumes table. */
  resumes = new Map<
    string,
    {
      title: string;
      company?: string | null;
      jobDescriptionShort?: string | null;
      structured?: unknown;
      jobLink?: string;
      recruiterName?: string;
      notes?: string;
    }
  >();
  acquires = 0;
  /** chat id -> stored messages, oldest first; deleted with the chat. */
  transcripts = new Map<string, ChatMessageRow[]>();
  /** Makes the next `addMessages` fail. */
  failAddMessages = false;
  private tick = 0;

  private view(row: RecruiterChatRow): RecruiterChatRow {
    return { ...row, expired: row.expiresAt !== null && row.expiresAt.getTime() <= Date.now() };
  }

  private at(id: string): RecruiterChatRow | undefined {
    return this.rows.find((r) => r.id === id);
  }

  async list(): Promise<RecruiterChatRow[]> {
    return [...this.rows].reverse().map((r) => this.view(r));
  }

  async findByToken(token: string): Promise<RecruiterChatRow | null> {
    const row = this.rows.find((r) => r.token === token);
    return row ? this.view(row) : null;
  }

  async findById(id: string): Promise<RecruiterChatRow | null> {
    const row = this.at(id);
    return row ? this.view(row) : null;
  }

  async insert(input: RecruiterChatInsert): Promise<RecruiterChatRow> {
    const row: RecruiterChatRow = {
      id: `00000000-0000-4000-8000-${String(++this.tick).padStart(12, "0")}`,
      ...input,
      used: 0,
      status: "active",
      createdAt: new Date(),
      lastUsedAt: null,
      expired: false,
    };
    this.rows.push(row);
    return this.view(row);
  }

  async revoke(id: string): Promise<RecruiterChatRow | null> {
    const row = this.at(id);
    if (!row) return null;
    row.status = "revoked";
    return this.view(row);
  }

  async reset(id: string): Promise<RecruiterChatRow | null> {
    const row = this.at(id);
    if (!row) return null;
    row.used = 0;
    return this.view(row);
  }

  async delete(id: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.id !== id);
    this.transcripts.delete(id);
    return this.rows.length < before;
  }

  async acquire(id: string): Promise<RecruiterChatRow | null> {
    this.acquires++;
    const row = this.at(id);
    if (row?.status !== "active" || row.used >= row.maxQuestions) return null;
    if (this.view(row).expired) return null;
    row.used++;
    return this.view(row);
  }

  async release(id: string): Promise<void> {
    const row = this.at(id);
    if (row) row.used = Math.max(row.used - 1, 0);
  }

  async touch(id: string): Promise<void> {
    const row = this.at(id);
    if (row) row.lastUsedAt = new Date();
  }

  async resumeDocument(id: string | null): Promise<unknown> {
    return id === null ? null : (this.resumes.get(id)?.structured ?? null);
  }

  async resumeExists(id: string): Promise<boolean> {
    return this.resumes.has(id);
  }

  async resumeContext(id: string): Promise<ResumeContext | null> {
    const resume = this.resumes.get(id);
    if (!resume) return null;
    return {
      company: resume.company ?? null,
      jobDescriptionShort: resume.jobDescriptionShort ?? null,
    };
  }

  async resumeOptions(): Promise<ResumeOption[]> {
    return [...this.resumes].map(([id, r]) => ({ id, title: r.title }));
  }

  async addMessages(chatId: string, messages: ChatMessageInsert[]): Promise<void> {
    if (this.failAddMessages) throw new Error("database unavailable");
    const list = this.transcripts.get(chatId) ?? [];
    for (const m of messages) {
      list.push({ id: `m-${list.length + 1}`, ...m, createdAt: new Date() });
    }
    this.transcripts.set(chatId, list);
  }

  async messages(chatId: string): Promise<ChatMessageRow[]> {
    return [...(this.transcripts.get(chatId) ?? [])];
  }

  /** What deleting a Tailored Resume does to a chat: the link becomes NULL. */
  deleteResume(id: string): void {
    this.resumes.delete(id);
    for (const row of this.rows) if (row.tailoredResumeId === id) row.tailoredResumeId = null;
  }
}
