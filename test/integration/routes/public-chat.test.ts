import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { PublicUsageRepository } from "../../../src/repositories/public-usage.repository";
import { signSession } from "../../../src/security/session";
import { LlmService } from "../../../src/services/llm.service";
import { PublicChatService } from "../../../src/services/public-chat.service";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createRecordingModel } from "../../support/mock-llm";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const EMAIL = "ada.private@example.com";
const options = { models: { public: "cfg/public" } };

async function setup() {
  const config = resolvedConfig(options);
  const base = createTestApp({ config: options });
  const { services } = base;
  const { factory, calls } = createRecordingModel({ chunks: ["hi"] });
  const llm = new LlmService(config, services.settings, services.personalInfo, factory, {
    info: () => {},
    warn: () => {},
  });
  const publicChat = new PublicChatService(
    new PublicUsageRepository(db),
    services.profile,
    services.settings,
    llm,
  );
  const { app } = createTestApp({ config: options, services: { llm, publicChat } });
  await services.profile.update({
    fullName: "Ada Lovelace",
    headline: "Engineer",
    masterCv: "Ten years of backend work.",
    publicSystemPrompt: "Answer about the candidate.",
    recruiterSystemPrompt: "r",
    tailorSystemPrompt: "t",
  });
  await services.personalInfo.create({
    key: "EMAIL",
    label: "Email",
    value: EMAIL,
    visibility: "public",
  });
  const cookie = `curr_session=${await signSession({ scope: "public" }, config.sessionSecret, 60)}`;
  const ask = async (content = "What do you do?", ip = "203.0.113.7") => {
    const res = await app.request("/api/public/chat", {
      method: "POST",
      headers: { "content-type": "application/json", cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ messages: [{ role: "user", content }] }),
    });
    await res.text();
    return res;
  };
  return { ask, calls };
}

describe("public chat with database", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("answers exactly 5 of 20 parallel requests", async () => {
    const { ask, calls } = await setup();
    const responses = await Promise.all(Array.from({ length: 20 }, () => ask()));
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(15);
    expect(calls).toHaveLength(5);
    const rows = (await db.execute(
      sql`select used from curriculum_api.public_usage`,
    )) as unknown as { rows: { used: number }[] };
    expect(rows.rows.map((r) => r.used)).toEqual([5]);
  });

  it("sends no personal info value to the model", async () => {
    const { ask, calls } = await setup();
    await ask("How can I contact you?");
    await ask(`Is ${EMAIL} your address?`, "203.0.113.8");
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(call.prompt).not.toContain(EMAIL);
    expect(calls[1]?.prompt).toContain("[redacted]");
  });
});
