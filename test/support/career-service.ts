import type { CurriculumApiConfig } from "../../src/config";
import { CareerService } from "../../src/services/career.service";
import { LlmService } from "../../src/services/llm.service";
import { PersonalInfoService } from "../../src/services/personal-info.service";
import { ProfileService } from "../../src/services/profile.service";
import { SettingsService } from "../../src/services/settings.service";
import { resolvedConfig, TEST_PII_KEY } from "./config";
import { FakeCareerRepo } from "./fakes/career.fake";
import { FakePersonalInfoRepo } from "./fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "./fakes/profile.fake";
import { FakeSettingsRepo } from "./fakes/settings.fake";
import { createRecordingModel, type RecordingModelOptions } from "./mock-llm";
import { failingFactory } from "./resumes";

export const FULL_NAME = "Ada Lovelace";

export function careerSetup(
  opts: {
    items?: unknown[];
    mock?: RecordingModelOptions;
    failing?: boolean;
    config?: Partial<CurriculumApiConfig>;
  } = {},
) {
  const config = resolvedConfig({ models: { import: "vendor/import" }, ...opts.config });
  const repo = new FakeCareerRepo({ version: 1, items: opts.items ?? [] });
  const profileRepo = new FakeProfileRepo();
  profileRepo.row = {
    ...profileInput,
    summary: "",
    fullName: FULL_NAME,
    id: 1,
    updatedAt: new Date(),
  };
  const settings = new SettingsService(new FakeSettingsRepo(), config);
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), TEST_PII_KEY);
  const profile = new ProfileService(profileRepo);
  const recording = createRecordingModel(opts.mock);
  const llm = new LlmService(
    config,
    settings,
    personalInfo,
    opts.failing ? failingFactory : recording.factory,
    {
      info: () => {},
      warn: () => {},
    },
  );
  const career = new CareerService(repo, personalInfo, profile, llm);
  const addField = (key: string, label: string, value: string) =>
    personalInfo.create({ key, label, value, visibility: "print", sortOrder: 0 });
  return {
    config,
    repo,
    profileRepo,
    profile,
    personalInfo,
    llm,
    career,
    calls: recording.calls,
    addField,
  };
}
