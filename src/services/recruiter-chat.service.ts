import type { RecruiterChatRepository } from "../repositories/recruiter-chat.repository.js";
import type { LlmService } from "./llm.service.js";
import type { PersonalInfoService } from "./personal-info.service.js";
import type { ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";

/** Filled by the recruiter-chat track. */
export class RecruiterChatService {
  constructor(
    protected readonly chats: RecruiterChatRepository,
    protected readonly profile: ProfileService,
    protected readonly settings: SettingsService,
    protected readonly personalInfo: PersonalInfoService,
    protected readonly llm: LlmService,
  ) {}
}
