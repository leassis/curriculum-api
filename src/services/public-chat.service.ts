import { wrapUserMessages } from "../llm/data-block.js";
import type { PublicUsageRepo } from "../repositories/public-usage.repository.js";
import { renderCareerBody } from "./career/body.js";
import type { CareerService } from "./career.service.js";
import { LimitReachedError, LlmUnavailableError, PiiLeakError } from "./errors.js";
import type { ChatMessage, LlmService } from "./llm.service.js";
import type { ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";

const EMPTY_CV = "The Master CV is empty: tell the visitor there is no career information yet.";

export interface PublicAnswer {
  stream: ReadableStream<string>;
  /** Questions this IP hash may still ask today. */
  remaining: number;
}

export class PublicChatService {
  constructor(
    protected readonly usage: PublicUsageRepo,
    protected readonly profile: ProfileService,
    protected readonly settings: SettingsService,
    protected readonly llm: LlmService,
    protected readonly career: CareerService,
  ) {}

  /** Counts one question for `ipHash` atomically, then streams the model's answer. */
  async ask(ipHash: string, messages: ChatMessage[]): Promise<PublicAnswer> {
    const profile = await this.profile.get();
    const { items } = await this.career.library();
    const limit = await this.settings.limit("publicQuestionsPerIpPerDay");
    const grant = await this.usage.acquire(ipHash, limit);
    if (!grant) throw new LimitReachedError();
    try {
      const { stream } = await this.llm.stream({
        area: "public",
        system: profile.publicSystemPrompt,
        body: items.length === 0 ? EMPTY_CV : renderCareerBody(profile, items),
        messages: wrapUserMessages(messages, "VISITOR_MESSAGE"),
        maxOutputTokens: await this.settings.limit("publicMaxOutputTokens"),
      });
      return { stream, remaining: limit - grant.used };
    } catch (error) {
      if (error instanceof LlmUnavailableError || error instanceof PiiLeakError) {
        await this.usage.release(ipHash, grant.day);
      }
      throw error;
    }
  }
}
