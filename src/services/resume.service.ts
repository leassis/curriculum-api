import type { ResumeRepository } from "../repositories/resume.repository.js";
import type { LlmService } from "./llm.service.js";
import type { PersonalInfoService } from "./personal-info.service.js";
import type { ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";

/** Filled by the tailored-resumes track. */
export class ResumeService {
  constructor(
    protected readonly resumes: ResumeRepository,
    protected readonly profile: ProfileService,
    protected readonly settings: SettingsService,
    protected readonly personalInfo: PersonalInfoService,
    protected readonly llm: LlmService,
  ) {}
}
