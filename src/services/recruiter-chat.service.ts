import { dataBlock, wrapUserMessages } from "../llm/data-block.js";
import { redactPii } from "../llm/pii-guard.js";
import type {
  ChatMessageRow,
  RecruiterChatRepo,
  RecruiterChatRow,
  ResumeOption,
} from "../repositories/recruiter-chat.repository.js";
import { appendSections, chatSections, renderCareerBody } from "./career/body.js";
import type { CareerService } from "./career.service.js";
import {
  ChatExpiredError,
  ChatRevokedError,
  ForbiddenError,
  LimitReachedError,
  LlmUnavailableError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import type { ChatMessage, LlmService } from "./llm.service.js";
import type { ContactItem, PersonalInfoService } from "./personal-info.service.js";
import type { Profile, ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";
import { parseDocument } from "./tailor/document.js";

export type { ChatMessageRow, ResumeOption };

export type ChatStatus = "active" | "revoked" | "expired";

export interface RecruiterChat {
  id: string;
  token: string;
  recruiterName: string;
  company: string | null;
  jobDescriptionShort: string | null;
  tailoredResumeId: string | null;
  maxQuestions: number;
  used: number;
  status: ChatStatus;
  expiresAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface NewRecruiterChat {
  recruiterName: string;
  company?: string;
  jobDescriptionShort?: string;
  maxQuestions?: number;
  /** ISO-like date string from the form; empty means no expiry. */
  expiresAt?: string;
  tailoredResumeId?: string;
}

export interface ChatOpening {
  recruiterName: string;
  company: string | null;
  remaining: number;
  status: "active";
  contact: ContactItem[];
}

export interface Transcript {
  chat: RecruiterChat;
  messages: ChatMessageRow[];
}

export interface RecruiterAnswer {
  stream: ReadableStream<string>;
  remaining: number;
}

export const MAX_JOB_DESCRIPTION_CHARS = 2000;
const MAX_QUESTIONS_LIMIT = 100;
const EMPTY_CV = "The Master CV is empty: tell the recruiter there is no career information yet.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(field: string, reason: string): never {
  throw new ValidationError(`${field}: ${reason}`, { [field]: reason });
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function toChat(row: RecruiterChatRow): RecruiterChat {
  const { expired, status, ...rest } = row;
  return {
    ...rest,
    status: status === "revoked" ? "revoked" : expired ? "expired" : "active",
  };
}

/** Rejects a chat that cannot be opened: revoked wins over expired. */
function assertOpen(chat: RecruiterChat): void {
  if (chat.status === "revoked") throw new ChatRevokedError();
  if (chat.status === "expired") throw new ChatExpiredError();
}

export class RecruiterChatService {
  constructor(
    protected readonly chats: RecruiterChatRepo,
    protected readonly profile: ProfileService,
    protected readonly settings: SettingsService,
    protected readonly personalInfo: PersonalInfoService,
    protected readonly llm: LlmService,
    protected readonly career: CareerService,
  ) {}

  async list(): Promise<RecruiterChat[]> {
    return (await this.chats.list()).map(toChat);
  }

  resumeOptions(): Promise<ResumeOption[]> {
    return this.chats.resumeOptions();
  }

  async create(input: NewRecruiterChat): Promise<RecruiterChat> {
    const recruiterName = (input.recruiterName ?? "").trim();
    if (recruiterName === "") invalid("recruiterName", "must not be empty");
    const jd = (input.jobDescriptionShort ?? "").trim();
    if ([...jd].length > MAX_JOB_DESCRIPTION_CHARS) {
      invalid("jobDescriptionShort", `must be at most ${MAX_JOB_DESCRIPTION_CHARS} characters`);
    }
    const maxQuestions =
      input.maxQuestions ?? (await this.settings.limit("recruiterQuestionsDefault"));
    if (!Number.isInteger(maxQuestions) || maxQuestions < 1 || maxQuestions > MAX_QUESTIONS_LIMIT) {
      invalid("maxQuestions", `must be an integer from 1 to ${MAX_QUESTIONS_LIMIT}`);
    }
    let expiresAt: Date | null = null;
    if (input.expiresAt !== undefined && input.expiresAt.trim() !== "") {
      expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) invalid("expiresAt", "must be a valid date");
      if (expiresAt.getTime() <= Date.now()) invalid("expiresAt", "must be in the future");
    }
    const resumeId = (input.tailoredResumeId ?? "").trim();
    if (resumeId !== "" && !(UUID.test(resumeId) && (await this.chats.resumeExists(resumeId)))) {
      invalid("tailoredResumeId", "Tailored Resume not found");
    }
    const company = (input.company ?? "").trim();
    return toChat(
      await this.chats.insert({
        token: newToken(),
        recruiterName,
        company: company === "" ? null : company,
        jobDescriptionShort: jd === "" ? null : jd,
        tailoredResumeId: resumeId === "" ? null : resumeId,
        maxQuestions,
        expiresAt,
      }),
    );
  }

  async revoke(id: string): Promise<RecruiterChat> {
    return this.found(UUID.test(id) ? await this.chats.revoke(id) : null);
  }

  /** Resets `used` only; a revoked chat stays revoked. */
  async reset(id: string): Promise<RecruiterChat> {
    return this.found(UUID.test(id) ? await this.chats.reset(id) : null);
  }

  async delete(id: string): Promise<void> {
    if (!UUID.test(id) || !(await this.chats.delete(id))) throw new NotFoundError();
  }

  /** The chat behind a token, whatever its status; NotFound when there is none. */
  async byToken(token: string): Promise<RecruiterChat> {
    return this.found(await this.chats.findByToken(token));
  }

  /** The chat behind a token, only if it can still be used (404, 410 otherwise). */
  async requireActive(token: string): Promise<RecruiterChat> {
    const chat = await this.byToken(token);
    assertOpen(chat);
    return chat;
  }

  async open(token: string): Promise<ChatOpening> {
    const chat = await this.requireActive(token);
    return {
      recruiterName: chat.recruiterName,
      company: chat.company,
      remaining: chat.maxQuestions - chat.used,
      status: "active",
      contact: await this.personalInfo.contactFor("recruiter"),
    };
  }

  /** The chat behind a token, if the session's chat id is that chat (403 otherwise). */
  async authorize(token: string, cid: string | undefined): Promise<RecruiterChat> {
    const chat = await this.byToken(token);
    if (cid === undefined || chat.id !== cid) throw new ForbiddenError();
    return chat;
  }

  /** Counts one question atomically, then streams the answer. */
  async ask(chat: RecruiterChat, messages: ChatMessage[]): Promise<RecruiterAnswer> {
    const granted = await this.chats.acquire(chat.id);
    if (!granted) {
      const current = await this.chats.findById(chat.id);
      if (!current) throw new NotFoundError();
      assertOpen(toChat(current));
      throw new LimitReachedError();
    }
    try {
      const profile = await this.profile.get();
      const resume = await this.resumeMarkdown(granted.tailoredResumeId);
      const jd = granted.jobDescriptionShort;
      const { stream } = await this.llm.stream({
        area: "recruiter",
        system:
          jd === null
            ? profile.recruiterSystemPrompt
            : `${profile.recruiterSystemPrompt}\n\nJob Description:\n${dataBlock("JOB_DESCRIPTION", jd)}`,
        body: await this.chatBody(profile, resume),
        messages: wrapUserMessages(messages, "RECRUITER_MESSAGE"),
        maxOutputTokens: await this.settings.limit("recruiterMaxOutputTokens"),
      });
      await this.chats.touch(granted.id);
      return {
        stream: await this.recordTranscript(granted.id, messages, stream),
        remaining: granted.maxQuestions - granted.used,
      };
    } catch (error) {
      // AC10: only an unavailable LLM gives the question back.
      if (error instanceof LlmUnavailableError) await this.chats.release(granted.id);
      throw error;
    }
  }

  /**
   * The Owner's test of the recruiter assistant: the recruiter prompt over the Career Library, with
   * no link, no quota and no transcript.
   */
  async test(messages: ChatMessage[]): Promise<ReadableStream<string>> {
    const [maxHistory, maxChars] = await Promise.all([
      this.settings.limit("maxHistoryMessages"),
      this.settings.limit("maxQuestionChars"),
    ]);
    const last = messages.at(-1);
    const total = messages.reduce((sum, m) => sum + [...m.content].length, 0);
    if (
      messages.length < 1 ||
      messages.length > maxHistory ||
      last?.role !== "user" ||
      last.content.trim() === "" ||
      [...last.content].length > maxChars ||
      total > maxChars * maxHistory
    ) {
      throw new ValidationError("Invalid request body");
    }
    const profile = await this.profile.get();
    const { stream } = await this.llm.stream({
      area: "recruiter",
      system: profile.recruiterSystemPrompt,
      body: await this.chatBody(profile, null),
      messages: wrapUserMessages(messages, "RECRUITER_MESSAGE"),
      maxOutputTokens: await this.settings.limit("recruiterMaxOutputTokens"),
    });
    return stream;
  }

  /** The chat and its messages, oldest first; NotFound for an unknown or malformed id. */
  async transcript(id: string): Promise<Transcript> {
    const row = UUID.test(id) ? await this.chats.findById(id) : null;
    const chat = this.found(row);
    return { chat, messages: await this.chats.messages(chat.id) };
  }

  /**
   * Passes the answer through unchanged and, when it completes, stores the question the model saw
   * (after the PII Guard redaction) and the answer. An error or a cancel never reaches `flush`, so
   * nothing is stored then; a storing failure is logged and never breaks the stream.
   */
  private async recordTranscript(
    chatId: string,
    messages: ChatMessage[],
    stream: ReadableStream<string>,
  ): Promise<ReadableStream<string>> {
    const question = messages.findLast((m) => m.role === "user")?.content;
    if (question === undefined) return stream;
    const fields = await this.personalInfo.allValues();
    const chunks: string[] = [];
    const chats = this.chats;
    return stream.pipeThrough(
      new TransformStream<string, string>({
        transform(chunk, controller) {
          chunks.push(chunk);
          controller.enqueue(chunk);
        },
        async flush() {
          const answer = chunks.join("");
          if (answer === "") return;
          try {
            await chats.addMessages(chatId, [
              { role: "user", content: redactPii(question, fields) },
              { role: "assistant", content: redactPii(answer, fields) },
            ]);
          } catch (error) {
            console.error("recruiter transcript was not stored", error);
          }
        },
      }),
    );
  }

  private async chatBody(profile: Profile, resume: string | null): Promise<string> {
    const { items } = await this.career.library();
    if (items.length === 0) return resume ?? EMPTY_CV;
    return appendSections(resume ?? renderCareerBody(profile, items), chatSections(profile));
  }

  /** The linked resume's document as markdown; null when unlinked, missing, invalid or empty. */
  private async resumeMarkdown(id: string | null): Promise<string | null> {
    const stored = await this.chats.resumeDocument(id);
    if (stored === null) return null;
    const parsed = parseDocument(stored);
    if (!parsed.ok) return null;
    const markdown = renderCareerBody(parsed.doc, parsed.doc.items);
    return markdown.trim() === "" ? null : markdown;
  }

  private found(row: RecruiterChatRow | null): RecruiterChat {
    if (!row) throw new NotFoundError();
    return toChat(row);
  }
}
