import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { recruiterApp } from "../../support/recruiter-chat";

const MISSING = "00000000-0000-4000-8000-00000000ffff";

async function adminMessages() {
  const s = await recruiterApp();
  const admin = await signSession({ scope: "admin" }, s.config.sessionSecret, 60);
  const get = (path: string, authenticated = true) =>
    s.app.request(path, { headers: authenticated ? { cookie: `curr_admin=${admin}` } : {} });
  return { ...s, get };
}

describe("admin messages", () => {
  it("links each chat row to its messages page", async () => {
    const s = await adminMessages();
    const chat = await s.newChat();
    const html = await (await s.get("/admin/chats")).text();
    expect(html).toContain(`href="/admin/chats/${chat.id}/messages"`);
    expect(html).toContain("Messages");
  });

  it("shows the recruiter, the count and the messages in chronological order", async () => {
    const s = await adminMessages();
    const chat = await s.newChat();
    await s.repo.addMessages(chat.id, [
      { role: "user", content: "First question" },
      { role: "assistant", content: "First answer" },
    ]);
    await s.repo.addMessages(chat.id, [
      { role: "user", content: "Second question" },
      { role: "assistant", content: "Second answer" },
    ]);
    const res = await s.get(`/admin/chats/${chat.id}/messages`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Jane Roe");
    expect(html).toContain('id="message-count">4 messages<');
    const at = ["First question", "First answer", "Second question", "Second answer"].map((t) =>
      html.indexOf(t),
    );
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain('data-role="user"');
    expect(html).toContain('data-role="assistant"');
    expect(html).toMatch(/<time datetime="[^"]+">\d{4}-\d{2}-\d{2} \d{2}:\d{2}<\/time>/);
    expect(html).not.toContain("No messages yet");
  });

  it("shows the empty state when the chat has no messages", async () => {
    const s = await adminMessages();
    const chat = await s.newChat();
    const html = await (await s.get(`/admin/chats/${chat.id}/messages`)).text();
    expect(html).toContain("No messages yet");
    expect(html).toContain('id="message-count">0 messages<');
  });

  it("answers 404 for an unknown or malformed id", async () => {
    const s = await adminMessages();
    for (const id of [MISSING, "not-a-uuid"]) {
      const res = await s.get(`/admin/chats/${id}/messages`);
      expect(res.status).toBe(404);
    }
  });

  it("escapes markup in messages and renders no inline script", async () => {
    const s = await adminMessages();
    const chat = await s.newChat();
    await s.repo.addMessages(chat.id, [
      { role: "user", content: "<script>alert(1)</script> <img src=x onerror=alert(2)>" },
      { role: "assistant", content: '**bold** <b onclick="x()">"quoted" & more</b>' },
    ]);
    const res = await s.get(`/admin/chats/${chat.id}/messages`);
    const html = await res.text();
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(2)&gt;");
    expect(html).toContain("**bold** &lt;b onclick=");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b onclick");
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) expect(tag).toMatch(/\ssrc="/);
    expect(html).not.toMatch(/<script\b[^>]*>[^<]+<\/script>/);
    expect(res.headers.get("content-security-policy")).toContain("script-src 'self'");
  });

  it("redirects to login without an admin session", async () => {
    const s = await adminMessages();
    const chat = await s.newChat();
    const res = await s.get(`/admin/chats/${chat.id}/messages`, false);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/admin/login");
  });
});
