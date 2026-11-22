import type {
  RecruiterChatRepo,
  RecruiterChatRow,
  ResumeOption,
} from "../repositories/recruiter-chat.repository.js";
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
import type { ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";

export type { ResumeOption };

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
      const resume = await this.chats.resumeContent(granted.tailoredResumeId);
      const content = resume !== null && resume.trim() !== "" ? resume : profile.masterCv;
      const jd = granted.jobDescriptionShort;
      const { stream } = await this.llm.stream({
        area: "recruiter",
        system:
          jd === null
            ? profile.recruiterSystemPrompt
            : `${profile.recruiterSystemPrompt}\n\nJob Description:\n${jd}`,
        body: content.trim() === "" ? EMPTY_CV : content,
        messages,
        maxOutputTokens: await this.settings.limit("recruiterMaxOutputTokens"),
      });
      await this.chats.touch(granted.id);
      return { stream, remaining: granted.maxQuestions - granted.used };
    } catch (error) {
      // AC10: only an unavailable LLM gives the question back.
      if (error instanceof LlmUnavailableError) await this.chats.release(granted.id);
      throw error;
    }
  }

  private found(row: RecruiterChatRow | null): RecruiterChat {
    if (!row) throw new NotFoundError();
    return toChat(row);
  }
}
