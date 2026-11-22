import { describe, expect, it } from "vitest";
import {
  ChatExpiredError,
  ChatRevokedError,
  ForbiddenError,
  LimitReachedError,
  NotFoundError,
  ValidationError,
} from "../../../src/services/errors";
import { readAll } from "../../support/public-chat";
import {
  COMPANY,
  CV,
  EMAIL,
  JD,
  PHONE,
  RECRUITER,
  RECRUITER_PROMPT,
  recruiterSetup,
} from "../../support/recruiter-chat";

const MISSING = "00000000-0000-4000-8000-00000000ffff";
const messages = [{ role: "user" as const, content: "What do you do?" }];

describe("recruiter chat service", () => {
  it("creates a chat with a 24-character base64url token and the default quota", async () => {
    const { recruiterChat, repo } = await recruiterSetup();
    const chat = await recruiterChat.create({ recruiterName: "  Jane  " });
    expect(chat.token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(chat).toMatchObject({
      recruiterName: "Jane",
      maxQuestions: 10,
      used: 0,
      status: "active",
    });
    const other = await recruiterChat.create({ recruiterName: "Jane" });
    expect(other.token).not.toBe(chat.token);
    expect(repo.rows).toHaveLength(2);
  });

  it("rejects invalid input naming the field and creates nothing", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    repo.resumes.set("00000000-0000-4000-8000-000000000099", { title: "T", content: "c" });
    const cases: [Record<string, unknown>, string][] = [
      [{ recruiterName: " " }, "recruiterName"],
      [{ jobDescriptionShort: "x".repeat(2001) }, "jobDescriptionShort"],
      [{ maxQuestions: 0 }, "maxQuestions"],
      [{ maxQuestions: 101 }, "maxQuestions"],
      [{ maxQuestions: 1.5 }, "maxQuestions"],
      [{ expiresAt: new Date(Date.now() - 60_000).toISOString() }, "expiresAt"],
      [{ expiresAt: "not a date" }, "expiresAt"],
      [{ tailoredResumeId: MISSING }, "tailoredResumeId"],
      [{ tailoredResumeId: "nope" }, "tailoredResumeId"],
    ];
    for (const [patch, field] of cases) {
      const error = await newChat(patch).catch((e: unknown) => e);
      expect(error, field).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain(field);
    }
    expect(repo.rows).toHaveLength(0);
    await expect(
      recruiterChat.create({
        recruiterName: "A",
        maxQuestions: 100,
        jobDescriptionShort: "x".repeat(2000),
        tailoredResumeId: "00000000-0000-4000-8000-000000000099",
      }),
    ).resolves.toMatchObject({ maxQuestions: 100 });
  });

  it("computes status active, revoked and expired", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    const active = await newChat();
    const revoked = await newChat();
    const expired = await newChat();
    await recruiterChat.revoke(revoked.id);
    const row = repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    const byId = Object.fromEntries((await recruiterChat.list()).map((c) => [c.id, c.status]));
    expect(byId).toEqual({
      [active.id]: "active",
      [revoked.id]: "revoked",
      [expired.id]: "expired",
    });
    await recruiterChat.revoke(expired.id);
    expect((await recruiterChat.byToken(expired.token)).status).toBe("revoked");
  });

  it("answers not found for an unknown or malformed id on revoke, reset and delete", async () => {
    const { recruiterChat } = await recruiterSetup();
    for (const id of [MISSING, "not-a-uuid"]) {
      await expect(recruiterChat.revoke(id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(recruiterChat.reset(id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(recruiterChat.delete(id)).rejects.toBeInstanceOf(NotFoundError);
    }
  });

  it("resets used to zero and keeps a revoked chat revoked", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const chat = await newChat();
    await recruiterChat.ask(chat, messages);
    await recruiterChat.revoke(chat.id);
    const reset = await recruiterChat.reset(chat.id);
    expect(reset).toMatchObject({ used: 0, status: "revoked" });
    await expect(recruiterChat.ask(chat, messages)).rejects.toBeInstanceOf(ChatRevokedError);
  });

  it("opens an active chat with the recruiter contact and no print field", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const chat = await newChat();
    const opening = await recruiterChat.open(chat.token);
    expect(opening).toMatchObject({
      recruiterName: RECRUITER,
      company: COMPANY,
      remaining: 5,
      status: "active",
    });
    expect(opening.contact.map((c) => c.key)).toEqual(["EMAIL", "LINKEDIN"]);
    expect(JSON.stringify(opening)).not.toContain(PHONE);
  });

  it("answers not found, chat_revoked and chat_expired when opening", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    await expect(recruiterChat.open("unknown")).rejects.toBeInstanceOf(NotFoundError);
    const revoked = await newChat();
    await recruiterChat.revoke(revoked.id);
    await expect(recruiterChat.open(revoked.token)).rejects.toBeInstanceOf(ChatRevokedError);
    const expired = await newChat();
    const row = repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    await expect(recruiterChat.open(expired.token)).rejects.toBeInstanceOf(ChatExpiredError);
  });

  it("refuses a session that belongs to another chat", async () => {
    const { recruiterChat, newChat } = await recruiterSetup();
    const a = await newChat();
    const b = await newChat();
    await expect(recruiterChat.authorize(a.token, b.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(recruiterChat.authorize(a.token, undefined)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(recruiterChat.authorize("unknown", a.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(recruiterChat.authorize(a.token, a.id)).resolves.toMatchObject({ id: a.id });
  });

  it("calls the llm with area recruiter, the prompt, the resume, the job description and the output limit", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const resumeId = "00000000-0000-4000-8000-000000000042";
    repo.resumes.set(resumeId, { title: "Tailored", content: "Tailored body about Postgres." });
    const chat = await newChat({ tailoredResumeId: resumeId });
    const answer = await recruiterChat.ask(chat, messages);
    expect(await readAll(answer.stream)).toBe("Hello world");
    expect(answer.remaining).toBe(4);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ modelId: "vendor/recruiter", maxOutputTokens: 1200 });
    const prompt = calls[0]?.prompt ?? "";
    expect(prompt).toContain(RECRUITER_PROMPT);
    expect(prompt).toContain("Tailored body about Postgres.");
    expect(prompt).toContain(JD);
    expect(prompt).not.toContain(CV);
    expect(calls[0]?.system).toContain(JD);
    expect(calls[0]?.system).toContain(RECRUITER_PROMPT);
    expect(calls[0]?.system).toContain("Tailored body about Postgres.");
  });

  it("falls back to the master cv when the resume is missing or empty", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const emptyId = "00000000-0000-4000-8000-000000000043";
    repo.resumes.set(emptyId, { title: "Empty", content: "  " });
    const empty = await newChat({ tailoredResumeId: emptyId });
    await recruiterChat.ask(empty, messages);
    const plain = await newChat({ tailoredResumeId: undefined });
    await recruiterChat.ask(plain, messages);
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(call.prompt).toContain(CV);
  });

  it("answers revoked, expired or limit reached without calling the llm", async () => {
    const { recruiterChat, repo, calls, newChat } = await recruiterSetup();
    const limited = await newChat({ maxQuestions: 1 });
    await recruiterChat.ask(limited, messages);
    await expect(recruiterChat.ask(limited, messages)).rejects.toBeInstanceOf(LimitReachedError);
    const revoked = await newChat();
    await recruiterChat.revoke(revoked.id);
    await expect(recruiterChat.ask(revoked, messages)).rejects.toBeInstanceOf(ChatRevokedError);
    const expired = await newChat();
    const row = repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    await expect(recruiterChat.ask(expired, messages)).rejects.toBeInstanceOf(ChatExpiredError);
    const gone = await newChat();
    await recruiterChat.delete(gone.id);
    await expect(recruiterChat.ask(gone, messages)).rejects.toBeInstanceOf(NotFoundError);
    expect(calls).toHaveLength(1);
  });

  it("gives the question back when the llm is unavailable", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup({
      mock: { failBeforeFirstChunk: true },
    });
    const chat = await newChat();
    await expect(recruiterChat.ask(chat, messages)).rejects.toMatchObject({
      code: "llm_unavailable",
    });
    expect(repo.rows[0]).toMatchObject({ used: 0, lastUsedAt: null });
  });

  it("sets last used and reports the remaining questions", async () => {
    const { recruiterChat, repo, newChat } = await recruiterSetup();
    const chat = await newChat({ maxQuestions: 3 });
    const first = await recruiterChat.ask(chat, messages);
    const second = await recruiterChat.ask(chat, messages);
    expect([first.remaining, second.remaining]).toEqual([2, 1]);
    expect(repo.rows[0]?.lastUsedAt).toBeInstanceOf(Date);
    expect(repo.rows[0]?.used).toBe(2);
  });

  it("never puts personal data, the recruiter name or the company in the prompt", async () => {
    const { recruiterChat, calls, newChat } = await recruiterSetup();
    const chat = await newChat();
    await recruiterChat.ask(chat, messages);
    for (const secret of [EMAIL, PHONE, RECRUITER, COMPANY]) {
      for (const call of calls) expect(call.prompt).not.toContain(secret);
    }
  });
});
