import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { EMAIL, RECRUITER_PROMPT, recruiterApp } from "../../support/recruiter-chat";

const MISSING = "00000000-0000-4000-8000-00000000ffff";
const ids = [MISSING, "not-a-uuid"];

async function adminChats() {
  const s = await recruiterApp();
  const admin = await signSession({ scope: "admin" }, s.config.sessionSecret, 60);
  const headers = (extra: Record<string, string> = {}) => ({
    cookie: `curr_admin=${admin}`,
    ...extra,
  });
  const send = (method: string, path: string, fields?: Record<string, string>) =>
    s.app.request(path, {
      method,
      headers: fields
        ? headers({ "content-type": "application/x-www-form-urlencoded" })
        : headers(),
      body: fields ? new URLSearchParams(fields).toString() : undefined,
    });
  const form = { recruiterName: "Jane Roe", company: "Acme", maxQuestions: "10" };
  return {
    ...s,
    send,
    form,
    cookie: `curr_admin=${admin}`,
    get: (path: string) => send("GET", path),
  };
}

describe("admin chats", () => {
  it("lists each chat with name, company, used over max, status, expiry, last used and its buttons", async () => {
    const s = await adminChats();
    const chat = await s.newChat({ company: "Acme <b>", maxQuestions: 10 });
    const revoked = await s.newChat({ recruiterName: "Rev Oked" });
    await s.recruiterChat.revoke(revoked.id);
    const html = await (await s.get("/admin/chats")).text();
    expect(html).toContain("Jane Roe");
    expect(html).toContain("Acme &lt;b&gt;");
    expect(html).toContain("0/10");
    expect(html).toContain("<td>active</td>");
    expect(html).toContain("<td>revoked</td>");
    expect(html).toContain(`data-copy="http://localhost/r/${chat.token}"`);
    expect(html).toContain(`hx-patch="/admin/chats/${chat.id}/revoke"`);
    expect(html).toContain(`hx-patch="/admin/chats/${chat.id}/reset"`);
    expect(html).toContain(`hx-delete="/admin/chats/${chat.id}"`);
    for (const label of ["Copy link", "Revoke", "Reset", "Delete"]) expect(html).toContain(label);
    expect(html).not.toContain("No recruiter chats yet");
  });

  it("shows expired for a chat past its expiry", async () => {
    const s = await adminChats();
    const chat = await s.newChat();
    const row = s.repo.rows.find((r) => r.id === chat.id);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    expect(await (await s.get("/admin/chats")).text()).toContain("<td>expired</td>");
  });

  it("shows the empty state", async () => {
    const s = await adminChats();
    expect(await (await s.get("/admin/chats")).text()).toContain("No recruiter chats yet");
  });

  it("offers every tailored resume by title and Master CV as the default", async () => {
    const s = await adminChats();
    s.repo.resumes.set("00000000-0000-4000-8000-000000000042", {
      title: "Backend <at> Acme",
    });
    const html = await (await s.get("/admin/chats")).text();
    expect(html).toContain("Backend &lt;at&gt; Acme");
    expect(html).toMatch(/<option value="" selected[^>]*>\s*Master CV/);
  });

  it("creates a chat and shows the full recruiter link with a copy button", async () => {
    const s = await adminChats();
    const res = await s.send("POST", "/admin/chats", s.form);
    expect(res.status).toBe(200);
    expect(res.headers.get("hx-trigger")).toBe("chats-changed");
    const token = s.repo.rows[0]?.token ?? "";
    expect(token).toHaveLength(24);
    const html = await res.text();
    expect(html).toContain(`http://localhost/r/${token}`);
    expect(html).toContain(`data-copy="http://localhost/r/${token}"`);
    expect(html).toContain("Copy");
    expect(s.repo.rows[0]).toMatchObject({
      recruiterName: "Jane Roe",
      company: "Acme",
      maxQuestions: 10,
    });
  });

  it("answers 400 naming the field and creates nothing", async () => {
    const s = await adminChats();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const cases: [Record<string, string>, string][] = [
      [{ recruiterName: " " }, "recruiterName"],
      [{ jobDescriptionShort: "x".repeat(2001) }, "jobDescriptionShort"],
      [{ maxQuestions: "0" }, "maxQuestions"],
      [{ maxQuestions: "101" }, "maxQuestions"],
      [{ expiresAt: past }, "expiresAt"],
      [{ tailoredResumeId: MISSING }, "tailoredResumeId"],
    ];
    for (const [patch, field] of cases) {
      const res = await s.send("POST", "/admin/chats", { ...s.form, ...patch });
      expect(res.status, field).toBe(400);
      expect(await res.text()).toContain(field);
    }
    expect(s.repo.rows).toHaveLength(0);
  });

  it("revokes a chat and returns the updated row", async () => {
    const s = await adminChats();
    const chat = await s.newChat();
    const res = await s.send("PATCH", `/admin/chats/${chat.id}/revoke`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.startsWith("<tr")).toBe(true);
    expect(html).toContain("<td>revoked</td>");
    expect(s.repo.rows[0]?.status).toBe("revoked");
  });

  it("resets used to zero and returns the updated row", async () => {
    const s = await adminChats();
    const chat = await s.newChat({ maxQuestions: 10 });
    await s.recruiterChat.ask(chat, [{ role: "user", content: "hi" }]);
    expect(await (await s.get("/admin/chats")).text()).toContain("1/10");
    const res = await s.send("PATCH", `/admin/chats/${chat.id}/reset`);
    const html = await res.text();
    expect(html).toContain("0/10");
    expect(html.startsWith("<tr")).toBe(true);
  });

  it("deletes a chat after confirmation and returns an empty fragment", async () => {
    const s = await adminChats();
    const chat = await s.newChat();
    const page = await (await s.get("/admin/chats")).text();
    expect(page).toContain('hx-confirm="Delete chat for Jane Roe?"');
    const res = await s.send("DELETE", `/admin/chats/${chat.id}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
    expect(s.repo.rows).toHaveLength(0);
  });

  it("answers 404 with an error fragment on revoke, reset and delete for unknown ids", async () => {
    const s = await adminChats();
    for (const id of ids) {
      for (const [method, path] of [
        ["PATCH", `/admin/chats/${id}/revoke`],
        ["PATCH", `/admin/chats/${id}/reset`],
        ["DELETE", `/admin/chats/${id}`],
      ] as const) {
        const res = await s.send(method, path);
        expect(res.status, path).toBe(404);
        expect(await res.text()).toContain('role="alert"');
      }
    }
  });

  it("splits the page and shows the test panel on the right", async () => {
    const s = await adminChats();
    const html = await (await s.get("/admin/chats")).text();
    expect(html).toContain('class="chats-split"');
    expect(html).toContain('data-url="/admin/chats/test"');
    expect(html).toContain("Test the assistant");
    expect(html).toContain('placeholder="Ask like a recruiter..."');
  });

  it("streams a test answer with the recruiter prompt, counting and storing nothing", async () => {
    const s = await adminChats();
    const chat = await s.newChat({ maxQuestions: 10 });
    const messages = [{ role: "user", content: `What is his strongest area? ${EMAIL}` }];
    const res = await s.app.request("/admin/chats/test", {
      method: "POST",
      headers: { cookie: s.cookie, "content-type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello world");
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0]?.system).toContain(RECRUITER_PROMPT);
    expect(s.calls[0]?.prompt).not.toContain(EMAIL);
    const row = s.repo.rows.find((r) => r.id === chat.id);
    expect(row?.used).toBe(0);
    expect((await s.recruiterChat.transcript(chat.id)).messages).toHaveLength(0);
  });

  it("rejects an empty or malformed test request", async () => {
    const s = await adminChats();
    for (const body of ["nope", JSON.stringify({ messages: [] })]) {
      const res = await s.app.request("/admin/chats/test", {
        method: "POST",
        headers: { cookie: s.cookie, "content-type": "application/json" },
        body,
      });
      expect(res.status).toBe(400);
    }
    expect(s.calls).toHaveLength(0);
  });

  it("shows public questions today and active recruiter chats below the test panel", async () => {
    const s = await adminChats();
    s.loginAttempts.dashboard = { activeChats: 3, resumes: 9, publicQuestionsToday: 7 };
    const html = await (await s.get("/admin/chats")).text();
    const side = html.slice(html.indexOf('class="chats-side"'));
    expect(side.indexOf("Test the assistant")).toBeLessThan(side.indexOf("Public questions today"));
    expect(side).toContain('<dd id="public-questions">7</dd>');
    expect(side).toContain('<dd id="active-chats">3</dd>');
    expect(side).not.toContain("Tailored resumes");
  });
});
