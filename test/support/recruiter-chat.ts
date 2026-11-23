import { vi } from "vitest";
import type { CurriculumApiConfig } from "../../src/config";
import { signSession } from "../../src/security/session";
import { CareerService } from "../../src/services/career.service";
import { LlmService } from "../../src/services/llm.service";
import { PersonalInfoService } from "../../src/services/personal-info.service";
import { ProfileService } from "../../src/services/profile.service";
import { RecruiterChatService } from "../../src/services/recruiter-chat.service";
import { SettingsService } from "../../src/services/settings.service";
import { item } from "./career";
import { resolvedConfig, TEST_PII_KEY } from "./config";
import { FakeCareerRepo } from "./fakes/career.fake";
import { FakePersonalInfoRepo } from "./fakes/personal-info.fake";
import { FakeProfileRepo, profileInput } from "./fakes/profile.fake";
import { FakeSettingsRepo } from "./fakes/settings.fake";
import { createRecordingModel, type RecordingModelOptions } from "./mock-llm";
import { FakeRecruiterChatRepo } from "./recruiter-chat.fake";
import { createTestApp } from "./test-app";

export const LIBRARY = [
  item("experience", { title: "Backend Engineer", organisation: "Globex", startYear: 2020 }),
  item("project", { title: "Billing rewrite", startYear: 2022 }),
];
export const RECRUITER_PROMPT = "Answer as the candidate's assistant.";
export const RECRUITER = "Jane Roe";
export const COMPANY = "Acme Corp";
export const JD = "Looking for a senior Postgres engineer.";
export const EMAIL = "ada.private@example.com";
export const PHONE = "+55 11 91234-5678";

/** Recruiter chat wired to fakes and the recording mock model. */
export async function recruiterSetup(
  opts: {
    mock?: RecordingModelOptions;
    items?: unknown[];
    config?: Partial<CurriculumApiConfig>;
  } = {},
) {
  const config = resolvedConfig({ models: { recruiter: "vendor/recruiter" }, ...opts.config });
  const repo = new FakeRecruiterChatRepo();
  const profileRepo = new FakeProfileRepo();
  await profileRepo.upsert({
    ...profileInput,
    fullName: "Ada Lovelace",
    recruiterSystemPrompt: RECRUITER_PROMPT,
  });
  const settings = new SettingsService(new FakeSettingsRepo(), config);
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), TEST_PII_KEY);
  const profile = new ProfileService(profileRepo);
  const recording = createRecordingModel(opts.mock);
  const llm = new LlmService(config, settings, personalInfo, recording.factory, {
    info: () => {},
    warn: () => {},
  });
  const career = new CareerService(
    new FakeCareerRepo({ version: 1, items: opts.items ?? LIBRARY }),
    personalInfo,
    profile,
    llm,
  );
  const recruiterChat = new RecruiterChatService(
    repo,
    profile,
    settings,
    personalInfo,
    llm,
    career,
  );
  await personalInfo.create({ key: "EMAIL", label: "Email", value: EMAIL, visibility: "public" });
  await personalInfo.create({
    key: "LINKEDIN",
    label: "LinkedIn",
    value: "linkedin.com/in/ada",
    visibility: "recruiter",
  });
  await personalInfo.create({ key: "PHONE", label: "Phone", value: PHONE, visibility: "print" });
  return {
    config,
    repo,
    settings,
    personalInfo,
    profile,
    llm,
    career,
    recruiterChat,
    calls: recording.calls,
    newChat: (extra: Partial<Parameters<RecruiterChatService["create"]>[0]> = {}) =>
      recruiterChat.create({
        recruiterName: RECRUITER,
        company: COMPANY,
        jobDescriptionShort: JD,
        maxQuestions: 5,
        ...extra,
      }),
  };
}

/** The test app on fakes; `session(chat)` builds a recruiter cookie, `ask` posts a question. */
export async function recruiterApp(opts: Parameters<typeof recruiterSetup>[0] = {}) {
  const setup = await recruiterSetup(opts);
  const { app } = createTestApp({
    config: opts.config,
    services: {
      config: setup.config,
      profile: setup.profile,
      settings: setup.settings,
      personalInfo: setup.personalInfo,
      llm: setup.llm,
      career: setup.career,
      recruiterChat: setup.recruiterChat,
    },
  });
  const cookieFor = async (cid: string | undefined, scope: "recruiter" | "public" = "recruiter") =>
    `curr_session=${await signSession({ scope, cid }, setup.config.sessionSecret, 60)}`;
  const ask = async (
    token: string,
    cookie: string | null,
    body: unknown = { messages: [{ role: "user", content: "What do you do?" }] },
  ) => {
    const res = await app.request(`/api/r/${token}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    await res.clone().text();
    return res;
  };
  const startSession = (token: string, verify: boolean) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ success: verify })),
    );
    return app.request(`/api/r/${token}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turnstileToken: "tok" }),
    });
  };
  return { ...setup, app, cookieFor, ask, startSession };
}
