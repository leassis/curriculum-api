import { MockLanguageModelV4 } from "ai/test";
import type { CurriculumApiConfig } from "../../src/config";
import type { ModelFactory } from "../../src/llm/openrouter";
import { LlmService } from "../../src/services/llm.service";
import { PersonalInfoService } from "../../src/services/personal-info.service";
import { ProfileService } from "../../src/services/profile.service";
import { ResumeService } from "../../src/services/resume.service";
import { SettingsService } from "../../src/services/settings.service";
import { resolvedConfig, TEST_PII_KEY } from "./config";
import { FakePersonalInfoRepo } from "./fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "./fakes/profile.fake";
import { FakeSettingsRepo } from "./fakes/settings.fake";
import { createRecordingModel, type RecordingModelOptions } from "./mock-llm";
import { FakeResumeRepo } from "./resume.fake";

export const CV = "Ten years building backends in TypeScript.";
export const JD = "We need a senior backend engineer who knows Postgres.";
export const FULL_NAME = "Ada Lovelace";
export const TAILOR_PROMPT = "Tailor the CV to the job.";

/** A model whose provider always fails, to prove failures leave content unchanged. */
export const failingFactory: ModelFactory = (modelId) =>
  new MockLanguageModelV4({
    modelId,
    doGenerate: async () => {
      throw new Error("provider down");
    },
  });

/** Resumes wired to fakes, real services and the recording mock model. */
export async function resumeSetup(
  opts: {
    mock?: RecordingModelOptions;
    factory?: ModelFactory;
    cv?: string;
    seed?: boolean;
    config?: Partial<CurriculumApiConfig>;
  } = {},
) {
  const config = resolvedConfig({ models: { tailor: "vendor/tailor" }, ...opts.config });
  const repo = new FakeResumeRepo();
  const profileRepo = new FakeProfileRepo();
  if (opts.seed !== false) {
    await profileRepo.upsert({
      ...profileInput,
      fullName: FULL_NAME,
      masterCv: opts.cv ?? CV,
      tailorSystemPrompt: TAILOR_PROMPT,
    });
  }
  const settingsRepo = new FakeSettingsRepo();
  const settings = new SettingsService(settingsRepo, config);
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), TEST_PII_KEY);
  const profile = new ProfileService(profileRepo);
  const recording = createRecordingModel({ text: "# Tailored body", ...opts.mock });
  const llm = new LlmService(config, settings, personalInfo, opts.factory ?? recording.factory, {
    info: () => {},
    warn: () => {},
  });
  const resumes = new ResumeService(repo, profile, settings, personalInfo, llm);
  const addField = (key: string, label: string, value: string, sortOrder = 0) =>
    personalInfo.create({ key, label, value, visibility: "print", sortOrder });
  return {
    config,
    repo,
    settingsRepo,
    settings,
    personalInfo,
    profile,
    profileRepo,
    llm,
    resumes,
    calls: recording.calls,
    addField,
  };
}
