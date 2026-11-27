import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolveConfig } from "../src/config.js";
import { DEFAULT_RECRUITER_SYSTEM_PROMPT } from "../src/llm/default-prompts.js";
import { createProvider } from "../src/llm/openrouter.js";
import { CareerService } from "../src/services/career.service.js";
import { LlmService } from "../src/services/llm.service.js";
import { PersonalInfoService } from "../src/services/personal-info.service.js";
import { ProfileService } from "../src/services/profile.service.js";
import { RecruiterChatService } from "../src/services/recruiter-chat.service.js";
import { SettingsService } from "../src/services/settings.service.js";
import { FakeCareerRepo } from "../test/support/fakes/career.fake.js";
import { FakePersonalInfoRepo } from "../test/support/fakes/personal-info.fake.js";
import { FakeProfileRepo } from "../test/support/fakes/profile.fake.js";
import { FakeSettingsRepo } from "../test/support/fakes/settings.fake.js";
import { FakeRecruiterChatRepo } from "../test/support/recruiter-chat.fake.js";
import {
  type Answers,
  exitCode,
  fixture,
  formatResults,
  runChecks,
} from "./verify-recruiter-checks.js";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY is required");
  process.exit(2);
}
const modelId = process.env.MODEL_RECRUITER;
if (!modelId) {
  console.error("MODEL_RECRUITER is required");
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
  models: { recruiter: modelId },
});
const profileRepo = new FakeProfileRepo();
await profileRepo.upsert({
  fullName: "Fixture Person",
  headline: "Backend engineer",
  publicSystemPrompt: "unused",
  // VERIFY_PROMPT_FILE checks another prompt (a draft, or the one stored in the database).
  recruiterSystemPrompt: process.env.VERIFY_PROMPT_FILE
    ? readFileSync(process.env.VERIFY_PROMPT_FILE, "utf8")
    : DEFAULT_RECRUITER_SYSTEM_PROMPT,
  tailorSystemPrompt: "unused",
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
const chats = new RecruiterChatService(
  new FakeRecruiterChatRepo(),
  profile,
  settings,
  personalInfo,
  llm,
  career,
);

async function text(stream: ReadableStream<string>): Promise<string> {
  let out = "";
  for await (const chunk of stream) out += chunk;
  return out.trim();
}

/** One question in a fresh chat, so no answer leans on an earlier one. */
async function ask(question: string): Promise<string> {
  const chat = await chats.create({
    recruiterName: "Verify",
    jobDescriptionShort: fix.jobDescription,
    maxQuestions: 1,
  });
  const { stream } = await chats.ask(chat, [{ role: "user", content: question }]);
  const answer = await text(stream);
  console.log(`\n> ${question}\n${answer}`);
  return answer;
}

try {
  console.log(`model: ${modelId}`);
  const answers: Answers = {
    fit: await ask(fix.questions.fit),
    fitPt: await ask(fix.questions.fitPt),
    absent: await ask(fix.questions.absent),
  };
  console.log("");
  const results = runChecks(answers, fix);
  for (const line of formatResults(results)) console.log(line);
  process.exit(exitCode(results));
} catch (err) {
  const e = err as Error;
  console.error(`${e.constructor.name}: ${e.message}`);
  process.exit(1);
}
