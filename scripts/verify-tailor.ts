import { randomBytes } from "node:crypto";
import { resolveConfig } from "../src/config.js";
import { DEFAULT_TAILOR_SYSTEM_PROMPT } from "../src/llm/default-prompts.js";
import { createProvider } from "../src/llm/openrouter.js";
import { CareerService } from "../src/services/career.service.js";
import { LlmService } from "../src/services/llm.service.js";
import { PersonalInfoService } from "../src/services/personal-info.service.js";
import { ProfileService } from "../src/services/profile.service.js";
import { ResumeService } from "../src/services/resume.service.js";
import { SettingsService } from "../src/services/settings.service.js";
import { FakeCareerRepo } from "../test/support/fakes/career.fake.js";
import { FakePersonalInfoRepo } from "../test/support/fakes/personal-info.fake.js";
import { FakeProfileRepo } from "../test/support/fakes/profile.fake.js";
import { FakeSettingsRepo } from "../test/support/fakes/settings.fake.js";
import { FakeResumeRepo } from "../test/support/resume.fake.js";
import { exitCode, fixture, formatResults, runChecks } from "./verify-tailor-checks.js";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY is required");
  process.exit(2);
}
const modelId = process.env.MODEL_TAILOR;
if (!modelId) {
  console.error("MODEL_TAILOR is required");
  process.exit(2);
}

const fix = fixture();
const config = resolveConfig({
  databaseUrl: "postgres://unused@unused.invalid/unused",
  openrouterApiKey: apiKey,
  sessionSecret: "s".repeat(40),
  turnstileSecret: "unused",
  adminPasswordHash: "unused",
  ipHashSalt: "unused",
  piiEncryptionKey: randomBytes(32).toString("base64"),
  models: { tailor: modelId },
});
const profileRepo = new FakeProfileRepo();
await profileRepo.upsert({
  fullName: "Fixture Person",
  headline: "Backend engineer",
  publicSystemPrompt: "unused",
  recruiterSystemPrompt: "unused",
  tailorSystemPrompt: DEFAULT_TAILOR_SYSTEM_PROMPT,
});
const settings = new SettingsService(new FakeSettingsRepo(), config);
const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), config.piiEncryptionKey);
const profile = new ProfileService(profileRepo);
const llm = new LlmService(config, settings, personalInfo, createProvider(apiKey), console);
const career = new CareerService(
  new FakeCareerRepo({ version: 1, items: fix.library }),
  personalInfo,
  profile,
  llm,
);
const resumes = new ResumeService(
  new FakeResumeRepo(),
  profile,
  settings,
  personalInfo,
  llm,
  career,
);

try {
  const created = await resumes.create({
    title: "Verify tailor",
    jobDescription: fix.jobDescription,
  });
  const generated = await resumes.generate(created.id);
  if (!generated.document || !generated.assessment) throw new Error("no document or assessment");
  console.log(`model: ${generated.model}`);
  console.log(`score: ${generated.assessment.score}`);
  console.log(`missing skills: ${JSON.stringify(generated.assessment.missingSkills)}`);
  console.log(`omissions: ${JSON.stringify(generated.assessment.omissions, null, 2)}`);
  const results = runChecks(generated.document, generated.assessment, fix, new Date());
  for (const line of formatResults(results)) console.log(line);
  process.exit(exitCode(results));
} catch (err) {
  const e = err as Error;
  console.error(`${e.constructor.name}: ${e.message}`);
  process.exit(1);
}
