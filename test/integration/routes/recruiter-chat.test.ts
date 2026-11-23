import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { RecruiterChatRepository } from "../../../src/repositories/recruiter-chat.repository";
import { ResumeRepository } from "../../../src/repositories/resume.repository";
import { signSession } from "../../../src/security/session";
import { LlmService } from "../../../src/services/llm.service";
import { RecruiterChatService } from "../../../src/services/recruiter-chat.service";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createRecordingModel } from "../../support/mock-llm";
import { textDocument } from "../../support/resume-document";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const EMAIL = "ada.private@example.com";
const RECRUITER = "Jane Roe";
const COMPANY = "Acme Corp";
const options = { models: { recruiter: "cfg/recruiter" } };

async function setup() {
  const config = resolvedConfig(options);
  const base = createTestApp({ config: options });
  const { services } = base;
  const { factory, calls } = createRecordingModel({ chunks: ["hi"] });
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
  await services.personalInfo.create({
    key: "EMAIL",
    label: "Email",
    value: EMAIL,
    visibility: "public",
  });
  const cookieFor = async (cid: string) =>
    `curr_session=${await signSession({ scope: "recruiter", cid }, config.sessionSecret, 60)}`;
  const ask = async (token: string, cookie: string, content = "What do you do?") => {
    const res = await app.request(`/api/r/${token}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ messages: [{ role: "user", content }] }),
    });
    await res.clone().text();
    return res;
  };
  const create = (extra = {}) =>
    recruiterChat.create({
      recruiterName: RECRUITER,
      company: COMPANY,
      jobDescriptionShort: "Postgres role",
      maxQuestions: 5,
      ...extra,
    });
  const used = async (id: string) => (await repo.findById(id))?.used;
  return { app, calls, ask, cookieFor, create, used, recruiterChat, repo };
}

describe("recruiter chat with database", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("answers exactly 5 of 20 parallel requests", async () => {
    const s = await setup();
    const chat = await s.create();
    const cookie = await s.cookieFor(chat.id);
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => s.ask(chat.token, cookie)),
    );
    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((x) => x === 200)).toHaveLength(5);
    expect(statuses.filter((x) => x === 429)).toHaveLength(15);
    expect(s.calls).toHaveLength(5);
    expect(await s.used(chat.id)).toBe(5);
  });

  it("blocks the very next question after a revoke", async () => {
    const s = await setup();
    const chat = await s.create();
    const cookie = await s.cookieFor(chat.id);
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    await s.recruiterChat.revoke(chat.id);
    const res = await s.ask(chat.token, cookie);
    expect([res.status, (await res.json()).error]).toEqual([410, "chat_revoked"]);
    await s.recruiterChat.reset(chat.id);
    const again = await s.ask(chat.token, cookie);
    expect([again.status, await s.used(chat.id)]).toEqual([410, 0]);
    expect(s.calls).toHaveLength(1);
  });

  it("answers 410 chat_expired when the expiry passes after the session", async () => {
    const s = await setup();
    const chat = await s.create({ expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    const cookie = await s.cookieFor(chat.id);
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    await db.execute(
      sql`update curriculum_api.recruiter_chats set expires_at = now() - interval '1 second' where id = ${chat.id}`,
    );
    const res = await s.ask(chat.token, cookie);
    expect([res.status, (await res.json()).error]).toEqual([410, "chat_expired"]);
    expect(s.calls).toHaveLength(1);
  });

  it("keeps working with the master cv after the linked resume is deleted", async () => {
    const s = await setup();
    const resumes = new ResumeRepository(db);
    const resume = await resumes.insert({
      title: "R",
      company: null,
      jobDescription: "jd",
      customInstructions: "",
    });
    await resumes.update(resume.id, { structured: textDocument("Resume-only text.") });
    const chat = await s.create({ tailoredResumeId: resume.id });
    const cookie = await s.cookieFor(chat.id);
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    await resumes.delete(resume.id);
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    expect(s.calls[0]?.prompt).toContain("Resume-only text.");
    expect(s.calls[1]?.prompt).toContain("Ten years of backend work.");
    expect(s.calls[1]?.prompt).not.toContain("Resume-only text.");
  });

  it("answers 404 for a deleted chat's link and session", async () => {
    const s = await setup();
    const chat = await s.create();
    const cookie = await s.cookieFor(chat.id);
    await s.recruiterChat.delete(chat.id);
    expect((await s.app.request(`/api/r/${chat.token}`)).status).toBe(404);
    expect((await s.ask(chat.token, cookie)).status).toBe(404);
  });

  it("refuses a session for another chat without touching a counter", async () => {
    const s = await setup();
    const a = await s.create();
    const b = await s.create();
    const res = await s.ask(a.token, await s.cookieFor(b.id));
    expect(res.status).toBe(403);
    expect([await s.used(a.id), await s.used(b.id)]).toEqual([0, 0]);
  });

  it("sends no personal info, recruiter name or company to the model", async () => {
    const s = await setup();
    const chat = await s.create();
    const cookie = await s.cookieFor(chat.id);
    await s.ask(chat.token, cookie);
    await s.ask(chat.token, cookie, `Is ${EMAIL} yours?`);
    expect(s.calls).toHaveLength(2);
    expect(s.calls[1]?.prompt).toContain("Is [redacted] yours?");
    for (const call of s.calls) {
      for (const secret of [EMAIL, RECRUITER, COMPANY]) expect(call.prompt).not.toContain(secret);
    }
  });
});
