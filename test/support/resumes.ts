import { MockLanguageModelV4 } from "ai/test";
import type { CurriculumApiConfig } from "../../src/config";
import type { ModelFactory } from "../../src/llm/openrouter";
import { signSession } from "../../src/security/session";
import { CareerService } from "../../src/services/career.service";
import { LlmService } from "../../src/services/llm.service";
import { PersonalInfoService } from "../../src/services/personal-info.service";
import { ProfileService } from "../../src/services/profile.service";
import { ResumeService } from "../../src/services/resume.service";
import { SettingsService } from "../../src/services/settings.service";
import { sampleLibrary, sampleReplyV2 } from "./career";
import { resolvedConfig, TEST_PII_KEY } from "./config";
import { FakeCareerRepo } from "./fakes/career.fake";
import { FakePersonalInfoRepo } from "./fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "./fakes/profile.fake";
import { FakeSettingsRepo } from "./fakes/settings.fake";
import { createRecordingModel, type RecordingModelOptions } from "./mock-llm";
import { FakeResumeRepo } from "./resume.fake";
import { sampleCv } from "./resume-document";
import { createTestApp } from "./test-app";

/** A Master CV with `##` sections and `###` items; the default reply tailors it. */
export const CV = sampleCv;
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
    items?: unknown[];
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
      headline: "Backend engineer",
      summary: "Ten years building payment systems.",
      masterCv: opts.cv ?? CV,
      tailorSystemPrompt: TAILOR_PROMPT,
    });
  }
  const settingsRepo = new FakeSettingsRepo();
  const settings = new SettingsService(settingsRepo, config);
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), TEST_PII_KEY);
  const profile = new ProfileService(profileRepo);
  const recording = createRecordingModel({ text: JSON.stringify(sampleReplyV2()), ...opts.mock });
  const llm = new LlmService(config, settings, personalInfo, opts.factory ?? recording.factory, {
    info: () => {},
    warn: () => {},
  });
  const logs: { level: "error" | "warn"; message: string; data: unknown }[] = [];
  const logger = {
    error: (message: string, data?: unknown) => logs.push({ level: "error", message, data }),
    warn: (message: string, data?: unknown) => logs.push({ level: "warn", message, data }),
  };
  const careerRepo = new FakeCareerRepo({ version: 1, items: opts.items ?? sampleLibrary().items });
  const career = new CareerService(careerRepo, personalInfo, profile, llm);
  const resumes = new ResumeService(
    repo,
    profile,
    settings,
    personalInfo,
    llm,
    career,
    undefined,
    logger,
  );
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
    career,
    careerRepo,
    calls: recording.calls,
    addField,
    logs,
  };
}

/** The test app with resume services wired in, plus helpers that send the admin cookie. */
export async function resumeApp(opts: Parameters<typeof resumeSetup>[0] = {}) {
  const setup = await resumeSetup(opts);
  const { app } = createTestApp({
    config: opts.config,
    services: {
      resumes: setup.resumes,
      profile: setup.profile,
      personalInfo: setup.personalInfo,
      settings: setup.settings,
      llm: setup.llm,
    },
  });
  const token = await signSession({ scope: "admin" }, setup.config.sessionSecret, 60);
  const headers = (extra: Record<string, string> = {}) => ({
    cookie: `curr_admin=${token}`,
    ...extra,
  });
  const form = (fields: Record<string, string | string[]>) => {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      for (const item of Array.isArray(v) ? v : [v]) body.append(k, item);
    }
    return {
      body: body.toString(),
      headers: headers({ "content-type": "application/x-www-form-urlencoded" }),
    };
  };
  return {
    ...setup,
    app,
    get: (path: string) => app.request(path, { headers: headers() }),
    post: (path: string, fields: Record<string, string | string[]> = {}) =>
      app.request(path, { method: "POST", ...form(fields) }),
    put: (path: string, fields: Record<string, string | string[]> = {}) =>
      app.request(path, { method: "PUT", ...form(fields) }),
    del: (path: string) => app.request(path, { method: "DELETE", headers: headers() }),
  };
}
