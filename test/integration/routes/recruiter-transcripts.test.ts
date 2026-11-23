import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { recruiterChatMessages } from "../../../src/db/schema";
import { RecruiterChatRepository } from "../../../src/repositories/recruiter-chat.repository";
import { signSession } from "../../../src/security/session";
import { LlmService } from "../../../src/services/llm.service";
import { RecruiterChatService } from "../../../src/services/recruiter-chat.service";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createRecordingModel, type RecordingModelOptions } from "../../support/mock-llm";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const EMAIL = "ada.private@example.com";
const PHONE = "+55 11 91234-5678";
const options = { models: { recruiter: "cfg/recruiter" } };

async function setup(mock: RecordingModelOptions = { chunks: ["Ten ", "years."] }) {
  const config = resolvedConfig(options);
  const base = createTestApp({ config: options });
  const { services } = base;
  const { factory } = createRecordingModel(mock);
  const llm = new LlmService(config, services.settings, services.personalInfo, factory, {
    info: () => {},
    warn: () => {},
  });
  const repo = new RecruiterChatRepository(db);
  const recruiterChat = new RecruiterChatService(
    repo,
    services.profile,
    services.settings,
    services.personalInfo,
    llm,
    services.career,
  );
  const { app } = createTestApp({ config: options, services: { llm, recruiterChat } });
  await services.profile.update({
    fullName: "Ada Lovelace",
    headline: "Engineer",
    masterCv: "Ten years of backend work.",
    publicSystemPrompt: "p",
    recruiterSystemPrompt: "Answer for recruiters.",
    tailorSystemPrompt: "t",
  });
  for (const [key, value] of [
    ["EMAIL", EMAIL],
    ["PHONE", PHONE],
  ] as const) {
    await services.personalInfo.create({ key, label: key, value, visibility: "public" });
  }
  const chat = await recruiterChat.create({ recruiterName: "Jane Roe", maxQuestions: 5 });
  const cookie = `curr_session=${await signSession({ scope: "recruiter", cid: chat.id }, config.sessionSecret, 60)}`;
  const ask = async (content: string) => {
    const res = await app.request(`/api/r/${chat.token}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ messages: [{ role: "user", content }] }),
    });
    const body = await res.text();
    return { res, body };
  };
  const admin = await signSession({ scope: "admin" }, config.sessionSecret, 60);
  const page = () =>
    app.request(`/admin/chats/${chat.id}/messages`, { headers: { cookie: `curr_admin=${admin}` } });
  const stored = () =>
    db
      .select()
      .from(recruiterChatMessages)
      .where(eq(recruiterChatMessages.chatId, chat.id))
      .orderBy(asc(recruiterChatMessages.seq));
  return { app, chat, ask, page, stored, recruiterChat, repo };
}

describe("recruiter transcripts with database", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("stores each answered question and answer in order", async () => {
    const s = await setup();
    expect((await s.ask("First?")).body).toBe("Ten years.");
    await s.ask("Second?");
    const rows = await s.stored();
    expect(rows.map((r) => [r.role, r.content])).toEqual([
      ["user", "First?"],
      ["assistant", "Ten years."],
      ["user", "Second?"],
      ["assistant", "Ten years."],
    ]);
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
    const html = await (await s.page()).text();
    expect(html).toContain('id="message-count">4 messages<');
    expect(html.indexOf("First?")).toBeLessThan(html.indexOf("Second?"));
  });

  it("never stores a personal info value", async () => {
    const s = await setup({ chunks: ["Write to ", EMAIL, " or call ", PHONE, "."] });
    await s.ask(`Is ${EMAIL} or ${PHONE} yours?`);
    const rows = await s.stored();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.content).toBe("Is [redacted] or [redacted] yours?");
    for (const row of rows) {
      for (const secret of [EMAIL, PHONE]) expect(row.content).not.toContain(secret);
    }
    const html = await (await s.page()).text();
    for (const secret of [EMAIL, PHONE]) expect(html).not.toContain(secret);
  });

  it("stores nothing for a refunded question", async () => {
    const s = await setup({ failBeforeFirstChunk: true });
    const { res } = await s.ask("Anyone there?");
    expect(res.status).toBe(502);
    expect(await s.stored()).toEqual([]);
    expect((await s.repo.findById(s.chat.id))?.used).toBe(0);
    expect(await (await s.page()).text()).toContain("No messages yet");
  });

  it("keeps messages after a quota reset and deletes them with the chat", async () => {
    const s = await setup();
    await s.ask("Keep me");
    await s.recruiterChat.reset(s.chat.id);
    expect(await s.stored()).toHaveLength(2);
    expect((await s.repo.messages(s.chat.id)).map((m) => m.content)).toEqual([
      "Keep me",
      "Ten years.",
    ]);
    await s.recruiterChat.delete(s.chat.id);
    expect(await s.stored()).toEqual([]);
    expect((await s.page()).status).toBe(404);
  });

  it("renders stored markup escaped on the messages page", async () => {
    const s = await setup({ chunks: ["<script>alert(2)</script>"] });
    await s.ask("<script>alert(1)</script>");
    const html = await (await s.page()).text();
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
    expect(html).not.toMatch(/<script\b[^>]*>[^<]+<\/script>/);
    expect(html).not.toContain("<script>alert");
  });
});
