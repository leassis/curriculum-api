import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { recruiterApp } from "../../support/recruiter-chat";

async function pageApp() {
  const s = await recruiterApp();
  const admin = await signSession({ scope: "admin" }, s.config.sessionSecret, 60);
  const adminCookie = `curr_admin=${admin}`;
  const get = (path: string, withAdmin = true) =>
    s.app.request(path, { headers: withAdmin ? { cookie: adminCookie } : {} });
  const post = (path: string, withAdmin = true) =>
    s.app.request(path, { method: "POST", headers: withAdmin ? { cookie: adminCookie } : {} });
  return { ...s, get, post };
}

/** The `curr_session` pair from a Set-Cookie header, or null. */
const sessionCookie = (res: Response) => {
  const header = res.headers.get("set-cookie") ?? "";
  return /curr_session=[^;]+/.exec(header)?.[0] ?? null;
};

describe("recruiter page access", () => {
  it("redirects the recruiter link to the admin chat page and shows nothing", async () => {
    const s = await pageApp();
    const chat = await s.newChat();
    const res = await s.get(`/r/${chat.token}`, false);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/admin/chat/${chat.token}`);
    expect(await res.text()).toBe("");
  });

  it("redirects to the admin login without an admin session and shows nothing of the chat", async () => {
    const s = await pageApp();
    const chat = await s.newChat();
    for (const path of [`/admin/chat/${chat.token}`, "/admin/chat/page.js"]) {
      const res = await s.get(path, false);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe("/admin/login");
      const body = await res.text();
      expect(body).not.toContain("Jane Roe");
      expect(body).not.toContain(chat.token);
    }
  });

  it("serves the page with a form and an external script to an admin session", async () => {
    const s = await pageApp();
    const chat = await s.newChat();
    const res = await s.get(`/r/${chat.token}`);
    expect(res.status).toBe(303);
    const page = await s.get(`/admin/chat/${chat.token}`);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(page.headers.get("cache-control")).toBe("no-store");
    expect(page.headers.get("content-security-policy")).toContain("script-src 'self'");
    const html = await page.text();
    expect(html).toContain("<form");
    expect(html).toContain('<script src="/admin/chat/page.js"');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).toContain(`data-token="${chat.token}"`);
  });

  it("answers 404 for an unknown token", async () => {
    const s = await pageApp();
    expect((await s.get("/admin/chat/does-not-exist")).status).toBe(404);
  });

  it("serves the script only to an admin session", async () => {
    const s = await pageApp();
    expect((await s.get("/admin/chat/page.js", false)).status).toBe(303);
    const res = await s.get("/admin/chat/page.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    expect(await res.text()).not.toBe("");
  });
});

describe("recruiter page session", () => {
  it("issues a recruiter session cookie for the chat to an admin session", async () => {
    const s = await pageApp();
    const chat = await s.newChat();
    const res = await s.post(`/admin/chat/${chat.token}/session`);
    expect(res.status).toBe(204);
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toContain("Path=/api");
    expect(header).toContain("HttpOnly");
    const cookie = sessionCookie(res);
    expect(cookie).not.toBeNull();
    // The cookie is accepted by the API for this chat and for no other.
    const other = await s.newChat();
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    expect((await s.ask(other.token, cookie)).status).toBe(403);
  });

  it("answers 303 and sets no cookie without an admin session", async () => {
    const s = await pageApp();
    const chat = await s.newChat();
    const res = await s.post(`/admin/chat/${chat.token}/session`, false);
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("answers 410 or 404 and sets no cookie for a revoked, expired or unknown chat", async () => {
    const s = await pageApp();
    const revoked = await s.newChat();
    await s.recruiterChat.revoke(revoked.id);
    const expired = await s.newChat();
    const row = s.repo.rows.find((r) => r.id === expired.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    const cases: [string, number][] = [
      [revoked.token, 410],
      [expired.token, 410],
      ["does-not-exist", 404],
    ];
    for (const [token, status] of cases) {
      const res = await s.post(`/admin/chat/${token}/session`);
      expect(res.status).toBe(status);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });

  it("counts a question through the page session and lowers the remaining", async () => {
    const s = await pageApp();
    const chat = await s.newChat({ maxQuestions: 5 });
    const cookie = sessionCookie(await s.post(`/admin/chat/${chat.token}/session`));
    const remaining = async () =>
      ((await (await s.app.request(`/api/r/${chat.token}`)).json()) as { remaining: number })
        .remaining;
    expect(await remaining()).toBe(5);
    const res = await s.ask(chat.token, cookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-remaining")).toBe("4");
    expect(await remaining()).toBe(4);
  });

  it("answers 410 chat_revoked on the next question after a revoke", async () => {
    const s = await pageApp();
    const chat = await s.newChat();
    const cookie = sessionCookie(await s.post(`/admin/chat/${chat.token}/session`));
    expect((await s.ask(chat.token, cookie)).status).toBe(200);
    await s.recruiterChat.revoke(chat.id);
    const res = await s.ask(chat.token, cookie);
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ error: "chat_revoked" });
  });
});
