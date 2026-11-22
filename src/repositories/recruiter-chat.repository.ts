import { and, asc, desc, eq, getTableColumns, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { recruiterChatMessages, recruiterChats, tailoredResumes } from "../db/schema.js";

/** A chat row; `expired` is computed by the database clock, never stored. */
export type RecruiterChatRow = typeof recruiterChats.$inferSelect & { expired: boolean };

export interface RecruiterChatInsert {
  token: string;
  recruiterName: string;
  company: string | null;
  jobDescriptionShort: string | null;
  tailoredResumeId: string | null;
  maxQuestions: number;
  expiresAt: Date | null;
}

export interface ResumeOption {
  id: string;
  title: string;
}

export type MessageRole = "user" | "assistant";

export interface ChatMessageInsert {
  role: MessageRole;
  content: string;
}

export interface ChatMessageRow {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export interface RecruiterChatRepo {
  list(): Promise<RecruiterChatRow[]>;
  findByToken(token: string): Promise<RecruiterChatRow | null>;
  findById(id: string): Promise<RecruiterChatRow | null>;
  insert(input: RecruiterChatInsert): Promise<RecruiterChatRow>;
  revoke(id: string): Promise<RecruiterChatRow | null>;
  reset(id: string): Promise<RecruiterChatRow | null>;
  delete(id: string): Promise<boolean>;
  /** Counts one question in one statement; null unless active, under quota and unexpired. */
  acquire(id: string): Promise<RecruiterChatRow | null>;
  /** Gives one question back; never goes below zero. */
  release(id: string): Promise<void>;
  touch(id: string): Promise<void>;
  /** Content of a Tailored Resume, or null when the id is null or the resume is gone. */
  resumeContent(id: string | null): Promise<string | null>;
  resumeExists(id: string): Promise<boolean>;
  resumeOptions(): Promise<ResumeOption[]>;
  /** Stores messages in one statement, in array order; the chat's messages go with the chat. */
  addMessages(chatId: string, messages: ChatMessageInsert[]): Promise<void>;
  /** A chat's messages, oldest first. */
  messages(chatId: string): Promise<ChatMessageRow[]>;
}

const expired = sql<boolean>`(${recruiterChats.expiresAt} is not null and ${recruiterChats.expiresAt} <= now())`;
const columns = { ...getTableColumns(recruiterChats), expired };

export class RecruiterChatRepository implements RecruiterChatRepo {
  constructor(protected readonly db: Db) {}

  list(): Promise<RecruiterChatRow[]> {
    return this.db
      .select(columns)
      .from(recruiterChats)
      .orderBy(desc(recruiterChats.createdAt), desc(recruiterChats.id));
  }

  async findByToken(token: string): Promise<RecruiterChatRow | null> {
    const [row] = await this.db
      .select(columns)
      .from(recruiterChats)
      .where(eq(recruiterChats.token, token));
    return row ?? null;
  }

  async findById(id: string): Promise<RecruiterChatRow | null> {
    const [row] = await this.db
      .select(columns)
      .from(recruiterChats)
      .where(eq(recruiterChats.id, id));
    return row ?? null;
  }

  async insert(input: RecruiterChatInsert): Promise<RecruiterChatRow> {
    const [row] = await this.db.insert(recruiterChats).values(input).returning(columns);
    return row as RecruiterChatRow;
  }

  async revoke(id: string): Promise<RecruiterChatRow | null> {
    const [row] = await this.db
      .update(recruiterChats)
      .set({ status: "revoked" })
      .where(eq(recruiterChats.id, id))
      .returning(columns);
    return row ?? null;
  }

  async reset(id: string): Promise<RecruiterChatRow | null> {
    const [row] = await this.db
      .update(recruiterChats)
      .set({ used: 0 })
      .where(eq(recruiterChats.id, id))
      .returning(columns);
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(recruiterChats)
      .where(eq(recruiterChats.id, id))
      .returning({ id: recruiterChats.id });
    return rows.length > 0;
  }

  async acquire(id: string): Promise<RecruiterChatRow | null> {
    const [row] = await this.db
      .update(recruiterChats)
      .set({ used: sql`${recruiterChats.used} + 1` })
      .where(
        and(
          eq(recruiterChats.id, id),
          eq(recruiterChats.status, "active"),
          lt(recruiterChats.used, recruiterChats.maxQuestions),
          or(isNull(recruiterChats.expiresAt), gt(recruiterChats.expiresAt, sql`now()`)),
        ),
      )
      .returning(columns);
    return row ?? null;
  }

  async release(id: string): Promise<void> {
    await this.db
      .update(recruiterChats)
      .set({ used: sql`greatest(${recruiterChats.used} - 1, 0)` })
      .where(eq(recruiterChats.id, id));
  }

  async touch(id: string): Promise<void> {
    await this.db
      .update(recruiterChats)
      .set({ lastUsedAt: sql`now()` })
      .where(eq(recruiterChats.id, id));
  }

  async resumeContent(id: string | null): Promise<string | null> {
    if (id === null) return null;
    const [row] = await this.db
      .select({ content: tailoredResumes.content })
      .from(tailoredResumes)
      .where(eq(tailoredResumes.id, id));
    return row?.content ?? null;
  }

  async resumeExists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: tailoredResumes.id })
      .from(tailoredResumes)
      .where(eq(tailoredResumes.id, id));
    return rows.length > 0;
  }

  resumeOptions(): Promise<ResumeOption[]> {
    return this.db
      .select({ id: tailoredResumes.id, title: tailoredResumes.title })
      .from(tailoredResumes)
      .orderBy(desc(tailoredResumes.createdAt), desc(tailoredResumes.id));
  }

  async addMessages(chatId: string, messages: ChatMessageInsert[]): Promise<void> {
    if (messages.length === 0) return;
    await this.db.insert(recruiterChatMessages).values(messages.map((m) => ({ chatId, ...m })));
  }

  async messages(chatId: string): Promise<ChatMessageRow[]> {
    const rows = await this.db
      .select({
        id: recruiterChatMessages.id,
        role: recruiterChatMessages.role,
        content: recruiterChatMessages.content,
        createdAt: recruiterChatMessages.createdAt,
      })
      .from(recruiterChatMessages)
      .where(eq(recruiterChatMessages.chatId, chatId))
      .orderBy(asc(recruiterChatMessages.seq));
    return rows as ChatMessageRow[];
  }
}
