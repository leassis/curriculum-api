import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySession } from "../../../src/security/session";
import { COMPANY, EMAIL, PHONE, RECRUITER, recruiterApp } from "../../support/recruiter-chat";

afterEach(() => vi.unstubAllGlobals());

const expireNow = (s: Awaited<ReturnType<typeof recruiterApp>>, id: string) => {
  const row = s.repo.rows.find((r) => r.id === id);
  if (row) row.expiresAt = new Date(Date.now() - 1000);
};

describe("recruiter link", () => {
  it("answers 200 with name, company, remaining, status and the recruiter contact", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const res = await s.app.request(`/api/r/${chat.token}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      recruiterName: RECRUITER,
      company: COMPANY,
      remaining: 5,
      status: "active",
    });
    expect(body.contact.map((c: { key: string }) => c.key)).toEqual(["EMAIL", "LINKEDIN"]);
    expect(JSON.stringify(body)).not.toContain(PHONE);
  });

  it("answers 404 not_found for an unknown token", async () => {
    const s = await recruiterApp();
    const res = await s.app.request("/api/r/nope");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });

  it("answers 410 chat_revoked and 410 chat_expired", async () => {
    const s = await recruiterApp();
    const revoked = await s.newChat();
    await s.recruiterChat.revoke(revoked.id);
    const expired = await s.newChat();
    expireNow(s, expired.id);
    const a = await s.app.request(`/api/r/${revoked.token}`);
    const b = await s.app.request(`/api/r/${expired.token}`);
    expect([a.status, (await a.json()).error]).toEqual([410, "chat_revoked"]);
    expect([b.status, (await b.json()).error]).toEqual([410, "chat_expired"]);
  });

  it("sends no-store and noindex on every response", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const revoked = await s.newChat();
    await s.recruiterChat.revoke(revoked.id);
    const responses = [
      await s.app.request(`/api/r/${chat.token}`),
      await s.app.request("/api/r/nope"),
      await s.app.request(`/api/r/${revoked.token}`),
      await s.startSession(chat.token, true),
      await s.startSession(chat.token, false),
      await s.app.request(`/api/r/${chat.token}/chat`, { method: "POST" }),
      await s.app.request(`/api/r/${chat.token}/missing`),
    ];
    expect(responses.map((r) => r.status)).toEqual([200, 404, 410, 204, 403, 401, 404]);
    for (const res of responses) {
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-robots-tag")).toBe("noindex");
    }
  });
});

describe("recruiter session", () => {
  it("sets a recruiter curr_session cookie carrying the chat id", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const res = await s.startSession(chat.token, true);
    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    const token = /curr_session=([^;]+)/.exec(cookie)?.[1] ?? "";
    expect(await verifySession(token, s.config.sessionSecret)).toEqual({
      scope: "recruiter",
      cid: chat.id,
    });
  });

  it("answers 403 captcha_failed and sets no cookie when turnstile rejects", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const res = await s.startSession(chat.token, false);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("captcha_failed");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("answers 404 or 410 and sets no cookie for an unknown, revoked or expired chat", async () => {
    const s = await recruiterApp();
    const revoked = await s.newChat();
    await s.recruiterChat.revoke(revoked.id);
    const expired = await s.newChat();
    expireNow(s, expired.id);
    const results = [];
    for (const token of ["nope", revoked.token, expired.token]) {
      const res = await s.startSession(token, true);
      results.push([res.status, (await res.json()).error, res.headers.get("set-cookie")]);
    }
    expect(results).toEqual([
      [404, "not_found", null],
      [410, "chat_revoked", null],
      [410, "chat_expired", null],
    ]);
  });
});

describe("recruiter chat", () => {
  it("answers 401 without a recruiter session", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    expect((await s.ask(chat.token, null)).status).toBe(401);
    expect((await s.ask(chat.token, await s.cookieFor(undefined, "public"))).status).toBe(401);
    expect((await s.ask(chat.token, "curr_session=garbage")).status).toBe(401);
    expect(s.repo.acquires).toBe(0);
  });

  it("answers 403 forbidden for another chat's session and touches no counter", async () => {
    const s = await recruiterApp();
    const a = await s.newChat();
    const b = await s.newChat();
    const res = await s.ask(a.token, await s.cookieFor(b.id));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden", message: "Forbidden" });
    expect(s.repo.acquires).toBe(0);
    expect(s.repo.rows.map((r) => r.used)).toEqual([0, 0]);
  });

  it("answers 400 validation_error for an invalid body and touches no counter", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const cookie = await s.cookieFor(chat.id);
    const bad: unknown[] = [
      "not json",
      {},
      { messages: [] },
      { messages: [{ role: "assistant", content: "hi" }] },
      { messages: [{ role: "user", content: "" }] },
      { messages: [{ role: "user", content: "x".repeat(1001) }] },
      { messages: Array.from({ length: 11 }, () => ({ role: "user", content: "a" })) },
    ];
    for (const body of bad) {
      const res = await s.ask(chat.token, cookie, body);
      expect(res.status).toBe(400);
    }
    expect(s.repo.acquires).toBe(0);
    expect(s.repo.rows[0]?.used).toBe(0);
    expect(s.calls).toHaveLength(0);
  });

  it("streams text/plain with X-Remaining and no-store", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const res = await s.app.request(`/api/r/${chat.token}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: await s.cookieFor(chat.id) },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("x-remaining")).toBe("4");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("Hello world");
    expect(s.repo.rows[0]?.lastUsedAt).toBeInstanceOf(Date);
  });

  it("answers 429 limit_reached on the third question with a quota of 2", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat({ maxQuestions: 2 });
    const cookie = await s.cookieFor(chat.id);
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await s.ask(chat.token, cookie)).status);
    expect(statuses).toEqual([200, 200, 429]);
    expect(s.calls).toHaveLength(2);
  });

  it("answers 410 chat_revoked on the next question after a revoke", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const cookie = await s.cookieFor(chat.id);
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    await s.recruiterChat.revoke(chat.id);
    const res = await s.ask(chat.token, cookie);
    expect([res.status, (await res.json()).error]).toEqual([410, "chat_revoked"]);
    expect(s.calls).toHaveLength(1);
  });

  it("answers 410 chat_expired when the expiry passes after the session", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const cookie = await s.cookieFor(chat.id);
    expireNow(s, chat.id);
    const res = await s.ask(chat.token, cookie);
    expect([res.status, (await res.json()).error]).toEqual([410, "chat_expired"]);
  });

  it("answers 502 llm_unavailable and gives the question back", async () => {
    const s = await recruiterApp({ mock: { failBeforeFirstChunk: true } });
    const chat = await s.newChat();
    const res = await s.ask(chat.token, await s.cookieFor(chat.id));
    expect([res.status, (await res.json()).error]).toEqual([502, "llm_unavailable"]);
    expect(s.repo.rows[0]?.used).toBe(0);
  });

  it("answers 404 for a deleted chat, link and session alike", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const cookie = await s.cookieFor(chat.id);
    await s.recruiterChat.delete(chat.id);
    expect((await s.app.request(`/api/r/${chat.token}`)).status).toBe(404);
    expect((await s.ask(chat.token, cookie)).status).toBe(404);
  });

  it("keeps working with the master cv after the linked resume is deleted", async () => {
    const s = await recruiterApp();
    const id = "00000000-0000-4000-8000-000000000042";
    s.repo.resumes.set(id, { title: "R", content: "Resume-only text." });
    const chat = await s.newChat({ tailoredResumeId: id });
    const cookie = await s.cookieFor(chat.id);
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    s.repo.deleteResume(id);
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    expect(s.calls[0]?.prompt).toContain("Resume-only text.");
    expect(s.calls[1]?.prompt).toContain("Ten years building backends");
    expect(s.calls[1]?.prompt).not.toContain("Resume-only text.");
  });
});

describe("recruiter pii", () => {
  it("sends no personal info, recruiter name or company to the model", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    const cookie = await s.cookieFor(chat.id);
    await s.ask(chat.token, cookie);
    await s.ask(chat.token, cookie, {
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
        { role: "user", content: "How can I contact you?" },
      ],
    });
    expect(s.calls.length).toBe(2);
    for (const call of s.calls) {
      for (const secret of [EMAIL, PHONE, RECRUITER, COMPANY]) {
        expect(call.prompt).not.toContain(secret);
      }
    }
  });

  it("redacts a personal info value typed by the recruiter", async () => {
    const s = await recruiterApp();
    const chat = await s.newChat();
    await s.ask(chat.token, await s.cookieFor(chat.id), {
      messages: [{ role: "user", content: `Is ${EMAIL} yours?` }],
    });
    expect(s.calls[0]?.prompt).toContain("Is [redacted] yours?");
    expect(s.calls[0]?.prompt).not.toContain(EMAIL);
  });
});
