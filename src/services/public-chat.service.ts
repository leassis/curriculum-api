import type { PublicUsageRepository } from "../repositories/public-usage.repository.js";
import type { LlmService } from "./llm.service.js";
import type { ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";

/** Filled by the public-chat track. */
export class PublicChatService {
  constructor(
    protected readonly usage: PublicUsageRepository,
    protected readonly profile: ProfileService,
    protected readonly settings: SettingsService,
    protected readonly llm: LlmService,
  ) {}
}
