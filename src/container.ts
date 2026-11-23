import type { ResolvedConfig } from "./config.js";
import { createDb } from "./db/client.js";
import { createProvider } from "./llm/openrouter.js";
import { AdminLoginAttemptRepository } from "./repositories/admin-login-attempt.repository.js";
import { CareerRepository } from "./repositories/career.repository.js";
import { PersonalInfoRepository } from "./repositories/personal-info.repository.js";
import { ProfileRepository } from "./repositories/profile.repository.js";
import { PublicUsageRepository } from "./repositories/public-usage.repository.js";
import { RecruiterChatRepository } from "./repositories/recruiter-chat.repository.js";
import { ResumeRepository } from "./repositories/resume.repository.js";
import { SettingsRepository } from "./repositories/settings.repository.js";
import { AdminAuthService } from "./security/admin-auth.js";
import { CareerService } from "./services/career.service.js";
import { LlmService } from "./services/llm.service.js";
import { PersonalInfoService } from "./services/personal-info.service.js";
import { ProfileService } from "./services/profile.service.js";
import { PublicChatService } from "./services/public-chat.service.js";
import { RecruiterChatService } from "./services/recruiter-chat.service.js";
import { ResumeService } from "./services/resume.service.js";
import { SettingsService } from "./services/settings.service.js";

export interface Services {
  config: ResolvedConfig;
  profile: ProfileService;
  career: CareerService;
  settings: SettingsService;
  personalInfo: PersonalInfoService;
  llm: LlmService;
  publicChat: PublicChatService;
  recruiterChat: RecruiterChatService;
  resumes: ResumeService;
  adminAuth: AdminAuthService;
}

/** Composition root: db, repositories, services. Performs no I/O. */
export function createContainer(config: ResolvedConfig): Services {
  const db = createDb(config.databaseUrl);
  const repos = {
    profile: new ProfileRepository(db),
    career: new CareerRepository(db),
    settings: new SettingsRepository(db),
    personalInfo: new PersonalInfoRepository(db),
    publicUsage: new PublicUsageRepository(db),
    recruiterChats: new RecruiterChatRepository(db),
    resumes: new ResumeRepository(db),
    loginAttempts: new AdminLoginAttemptRepository(db),
  };
  const settings = new SettingsService(repos.settings, config);
  const personalInfo = new PersonalInfoService(repos.personalInfo, config.piiEncryptionKey);
  const profile = new ProfileService(repos.profile);
  const llm = new LlmService(
    config,
    settings,
    personalInfo,
    createProvider(config.openrouterApiKey),
  );
  return {
    config,
    profile,
    career: new CareerService(repos.career, personalInfo, profile),
    settings,
    personalInfo,
    llm,
    publicChat: new PublicChatService(repos.publicUsage, profile, settings, llm),
    recruiterChat: new RecruiterChatService(
      repos.recruiterChats,
      profile,
      settings,
      personalInfo,
      llm,
    ),
    resumes: new ResumeService(repos.resumes, profile, settings, personalInfo, llm),
    adminAuth: new AdminAuthService(repos.loginAttempts, config),
  };
}
