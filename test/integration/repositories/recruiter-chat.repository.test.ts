import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { RecruiterChatRepository } from "../../../src/repositories/recruiter-chat.repository";
import { ResumeRepository } from "../../../src/repositories/resume.repository";
import { sampleDocumentV2 as sampleDocument } from "../../support/career";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new RecruiterChatRepository(db);
const resumes = new ResumeRepository(db);

let n = 0;
const input = (patch: Partial<Parameters<RecruiterChatRepository["insert"]>[0]> = {}) => ({
  token: `token-${++n}`,
  recruiterName: "Jane",
  company: null,
  jobDescriptionShort: null,
  tailoredResumeId: null,
  maxQuestions: 3,
  expiresAt: null,
  ...patch,
});

describe("recruiter chat repository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("inserts, finds by token and by id, and lists newest first", async () => {
    const a = await repo.insert(input({ recruiterName: "A" }));
    const b = await repo.insert(input({ recruiterName: "B", company: "Acme" }));
    expect(a).toMatchObject({ used: 0, status: "active", lastUsedAt: null, expired: false });
    expect((await repo.findByToken(b.token))?.id).toBe(b.id);
    expect((await repo.findById(a.id))?.recruiterName).toBe("A");
    expect(await repo.findByToken("nope")).toBeNull();
    expect((await repo.list()).map((r) => r.recruiterName)).toEqual(["B", "A"]);
  });

  it("flags a chat as expired from its expires_at in SQL", async () => {
    const past = await repo.insert(input());
    await db.execute(
      sql`update curriculum_api.recruiter_chats set expires_at = now() - interval '1 minute' where id = ${past.id}`,
    );
    const future = await repo.insert(input({ expiresAt: new Date(Date.now() + 3_600_000) }));
    expect((await repo.findById(past.id))?.expired).toBe(true);
    expect((await repo.findById(future.id))?.expired).toBe(false);
    expect((await repo.list()).filter((r) => r.expired)).toHaveLength(1);
  });

  it("acquire counts a question only while active, under quota and unexpired", async () => {
    const chat = await repo.insert(input({ maxQuestions: 2 }));
    expect((await repo.acquire(chat.id))?.used).toBe(1);
    expect((await repo.acquire(chat.id))?.used).toBe(2);
    expect(await repo.acquire(chat.id)).toBeNull();
    await repo.reset(chat.id);
    await repo.revoke(chat.id);
    expect(await repo.acquire(chat.id)).toBeNull();
    const expiring = await repo.insert(input());
    await db.execute(
      sql`update curriculum_api.recruiter_chats set expires_at = now() - interval '1 second' where id = ${expiring.id}`,
    );
    expect(await repo.acquire(expiring.id)).toBeNull();
    expect((await repo.findById(expiring.id))?.used).toBe(0);
  });

  it("acquire never exceeds max_questions under 20 parallel calls", async () => {
    const chat = await repo.insert(input({ maxQuestions: 5 }));
    const grants = await Promise.all(Array.from({ length: 20 }, () => repo.acquire(chat.id)));
    expect(grants.filter((g) => g !== null)).toHaveLength(5);
    expect((await repo.findById(chat.id))?.used).toBe(5);
  });

  it("release gives one back and never goes below zero", async () => {
    const chat = await repo.insert(input());
    await repo.acquire(chat.id);
    await repo.release(chat.id);
    await repo.release(chat.id);
    expect((await repo.findById(chat.id))?.used).toBe(0);
  });

  it("revokes, resets, touches and deletes, reporting a missing chat", async () => {
    const chat = await repo.insert(input());
    await repo.acquire(chat.id);
    expect((await repo.revoke(chat.id))?.status).toBe("revoked");
    expect(await repo.reset(chat.id)).toMatchObject({ used: 0, status: "revoked" });
    await repo.touch(chat.id);
    expect((await repo.findById(chat.id))?.lastUsedAt).toBeInstanceOf(Date);
    expect(await repo.delete(chat.id)).toBe(true);
    expect(await repo.delete(chat.id)).toBe(false);
    const missing = "00000000-0000-4000-8000-00000000ffff";
    expect(await repo.revoke(missing)).toBeNull();
    expect(await repo.reset(missing)).toBeNull();
  });

  it("stores messages in order and lists them by seq", async () => {
    const a = await repo.insert(input());
    const b = await repo.insert(input());
    await repo.addMessages(a.id, [
      { role: "user", content: "first question" },
      { role: "assistant", content: "first answer" },
    ]);
    await repo.addMessages(b.id, [{ role: "user", content: "other chat" }]);
    await repo.addMessages(a.id, [
      { role: "user", content: "second question" },
      { role: "assistant", content: "second answer" },
    ]);
    await repo.addMessages(a.id, []);
    const stored = await repo.messages(a.id);
    expect(stored.map((m) => [m.role, m.content])).toEqual([
      ["user", "first question"],
      ["assistant", "first answer"],
      ["user", "second question"],
      ["assistant", "second answer"],
    ]);
    expect(stored[0]?.createdAt).toBeInstanceOf(Date);
    expect(await repo.messages(b.id)).toHaveLength(1);
    expect(await repo.messages("00000000-0000-4000-8000-00000000ffff")).toEqual([]);
  });

  it("keeps messages on reset and deletes them with the chat", async () => {
    const chat = await repo.insert(input());
    await repo.addMessages(chat.id, [{ role: "user", content: "q" }]);
    await repo.acquire(chat.id);
    await repo.reset(chat.id);
    expect(await repo.messages(chat.id)).toHaveLength(1);
    await repo.delete(chat.id);
    expect(await repo.messages(chat.id)).toEqual([]);
    const left = await db.execute(
      sql`select count(*)::int as n from curriculum_api.recruiter_chat_messages`,
    );
    expect((left as unknown as { rows: { n: number }[] }).rows[0]?.n).toBe(0);
  });

  it("lists resume titles and unlinks a deleted resume", async () => {
    const resume = await resumes.insert({
      title: "Backend",
      company: null,
      jobDescription: "jd",
      customInstructions: "",
    });
    expect(await repo.resumeExists(resume.id)).toBe(true);
    expect(await repo.resumeExists("00000000-0000-4000-8000-00000000ffff")).toBe(false);
    expect(await repo.resumeOptions()).toEqual([{ id: resume.id, title: "Backend" }]);
    const chat = await repo.insert(input({ tailoredResumeId: resume.id }));
    await resumes.delete(resume.id);
    expect((await repo.findById(chat.id))?.tailoredResumeId).toBeNull();
  });

  it("reads the linked resume document and null without one", async () => {
    const linked = await resumes.insert({
      title: "Linked",
      company: null,
      jobDescription: "jd",
      customInstructions: "",
    });
    const blank = await resumes.insert({
      title: "Blank",
      company: null,
      jobDescription: "jd",
      customInstructions: "",
    });
    await resumes.update(linked.id, { structured: sampleDocument() });
    expect(await repo.resumeDocument(linked.id)).toEqual(sampleDocument());
    expect(await repo.resumeDocument(blank.id)).toBeNull();
    expect(await repo.resumeDocument(null)).toBeNull();
    expect(await repo.resumeDocument("00000000-0000-4000-8000-00000000ffff")).toBeNull();
  });
});
