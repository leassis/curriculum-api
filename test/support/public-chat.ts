import type { CurriculumApiConfig } from "../../src/config";
import { LlmService } from "../../src/services/llm.service";
import { PersonalInfoService } from "../../src/services/personal-info.service";
import { ProfileService } from "../../src/services/profile.service";
import { PublicChatService } from "../../src/services/public-chat.service";
import { SettingsService } from "../../src/services/settings.service";
import { resolvedConfig, TEST_PII_KEY } from "./config";
import { FakePersonalInfoRepo } from "./fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "./fakes/profile.fake";
import { FakeSettingsRepo } from "./fakes/settings.fake";
import { createRecordingModel, type RecordingModelOptions } from "./mock-llm";
import { FakePublicUsageRepo } from "./public-usage.fake";

export const CV = "Ten years building backends in TypeScript.";
export const FULL_NAME = "Ada Lovelace";

/** Public chat wired to fakes and the recording mock model. */
export async function publicChatSetup(
  opts: {
    mock?: RecordingModelOptions;
    seed?: boolean;
    cv?: string;
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
      masterCv: opts.cv ?? CV,
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
  const publicChat = new PublicChatService(usage, profile, settings, llm);
  return { config, usage, settingsRepo, settings, personalInfo, profile, llm, publicChat, calls };
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
