import type { CurriculumApiConfig } from "../../src/config";
import { CareerService } from "../../src/services/career.service";
import { LlmService } from "../../src/services/llm.service";
import { PersonalInfoService } from "../../src/services/personal-info.service";
import { ProfileService } from "../../src/services/profile.service";
import { PublicChatService } from "../../src/services/public-chat.service";
import { SettingsService } from "../../src/services/settings.service";
import { item } from "./career";
import { resolvedConfig, TEST_PII_KEY } from "./config";
import { FakeCareerRepo } from "./fakes/career.fake";
import { FakePersonalInfoRepo } from "./fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "./fakes/profile.fake";
import { FakeSettingsRepo } from "./fakes/settings.fake";
import { createRecordingModel, type RecordingModelOptions } from "./mock-llm";
import { FakePublicUsageRepo } from "./public-usage.fake";

export const LIBRARY = [
  item("experience", { title: "Backend Engineer", organisation: "Globex", startYear: 2020 }),
  item("project", { title: "Billing rewrite", startYear: 2022 }),
];
export const FULL_NAME = "Ada Lovelace";

/** Public chat wired to fakes and the recording mock model. */
export async function publicChatSetup(
  opts: {
    mock?: RecordingModelOptions;
    seed?: boolean;
    items?: unknown[];
    config?: Partial<CurriculumApiConfig>;
  } = {},
) {
  const config = resolvedConfig({ models: { public: "vendor/public" }, ...opts.config });
  const usage = new FakePublicUsageRepo();
  const profileRepo = new FakeProfileRepo();
  if (opts.seed !== false) {
    await profileRepo.upsert({
      ...profileInput,
      fullName: FULL_NAME,
      masterCv: "legacy master cv",
      publicSystemPrompt: "Answer about the candidate only.",
    });
  }
  const settingsRepo = new FakeSettingsRepo();
  const settings = new SettingsService(settingsRepo, config);
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), TEST_PII_KEY);
  const profile = new ProfileService(profileRepo);
  const { factory, calls } = createRecordingModel(opts.mock);
  const llm = new LlmService(config, settings, personalInfo, factory, {
    info: () => {},
    warn: () => {},
  });
  const careerRepo = new FakeCareerRepo({ version: 1, items: opts.items ?? LIBRARY });
  const career = new CareerService(careerRepo, personalInfo, profile, llm);
  const publicChat = new PublicChatService(usage, profile, settings, llm, career);
  return {
    config,
    usage,
    settingsRepo,
    settings,
    personalInfo,
    profile,
    llm,
    career,
    careerRepo,
    publicChat,
    calls,
  };
}

export async function readAll(stream: ReadableStream<string>): Promise<string> {
  let out = "";
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out += value;
  }
}
