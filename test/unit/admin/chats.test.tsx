import { describe, expect, it } from "vitest";
import { ChatForm, Rows } from "../../../src/admin/chats/view";
import { signSession } from "../../../src/security/session";
import { button, decode, tags, voidTags } from "../../support/html";
import { EMAIL, RECRUITER_PROMPT, recruiterApp } from "../../support/recruiter-chat";

const MISSING = "00000000-0000-4000-8000-00000000ffff";
const ids = [MISSING, "not-a-uuid"];
const RESUME = "00000000-0000-4000-8000-000000000042";

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
    for (const label of ["Messages", "Copy link", "Revoke", "Reset", "Delete"])
      expect(html).toContain(`title="${label}"`);
    for (const label of ["Copy link for", "Revoke chat for", "Reset chat for", "Delete chat for"])
      expect(html).toContain(`aria-label="${label} Jane Roe"`);
    expect(html).toContain('class="icon-btn icon-btn-danger"');
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

  it("shows the chat list full width above the form and test panel", async () => {
    const s = await adminChats();
    const html = await (await s.get("/admin/chats")).text();
    const list = html.indexOf('class="chats-list"');
    const split = html.indexOf('class="chats-split"');
    expect(list).toBeGreaterThan(-1);
    expect(split).toBeGreaterThan(list);
    const listHtml = html.slice(list, split);
    expect(listHtml).toContain('id="chat-rows"');
    expect(listHtml).not.toContain("Test the assistant");
    expect(html.slice(split)).not.toContain('id="chat-rows"');
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

const R1 = "00000000-0000-4000-8000-0000000000a1";
const R2 = "00000000-0000-4000-8000-0000000000b2";
const CHAT_ID = "00000000-0000-4000-8000-0000000000c1";
const resumeChoices = [
  { id: R1, title: "Backend" },
  { id: R2, title: "Platform" },
];

describe("chat form view", () => {
  const edit = (expiresAt: Date | null = new Date(2031, 4, 6, 14, 30)) =>
    String(
      <ChatForm
        basePath=""
        resumes={resumeChoices}
        defaultMax={10}
        chat={{
          id: CHAT_ID,
          recruiterName: "Jane <Roe>",
          company: "Acme",
          jobDescriptionShort: "Senior Postgres",
          tailoredResumeId: R2,
          maxQuestions: 7,
          expiresAt,
        }}
      />,
    );

  it("holds the six values of the chat in edit mode with Save and Cancel", () => {
    const html = edit();
    expect(html).toContain("Edit chat");
    expect(html).not.toContain("New chat");
    const form = tags(html, "form")[0];
    expect(form?.attrs["hx-put"]).toBe(`/admin/chats/${CHAT_ID}`);
    const inputs = voidTags(html, "input");
    const value = (name: string) => inputs.find((i) => i.attrs.name === name)?.attrs.value;
    expect(value("recruiterName")).toBe("Jane <Roe>");
    expect(value("company")).toBe("Acme");
    expect(value("maxQuestions")).toBe("7");
    expect(value("expiresAt")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(value("expiresAt") ?? "").getTime()).toBe(
      new Date(2031, 4, 6, 14, 30).getTime(),
    );
    expect(tags(html, "textarea")[0]?.text).toBe("Senior Postgres");
    const selected = tags(html, "option").filter((o) => "selected" in o.attrs);
    expect(selected.map((o) => o.attrs.value)).toEqual([R2]);
    expect(button(html, "Save")).toBeDefined();
    const cancel = tags(html, "button").find((b) => b.text === "Cancel");
    expect(cancel?.attrs["hx-get"]).toBe("/admin/chats/new");
  });

  it("starts edit mode with empty last-autofilled inputs and no expiry value when none", () => {
    const html = edit(null);
    const inputs = voidTags(html, "input");
    const value = (name: string) => inputs.find((i) => i.attrs.name === name)?.attrs.value;
    expect(value("lastJobDescriptionShort")).toBe("");
    expect(value("lastCompany")).toBe("");
    expect(value("expiresAt")).toBe("");
  });

  it("renders the New chat form as before when no chat is given", () => {
    const html = String(<ChatForm basePath="" resumes={resumeChoices} defaultMax={10} />);
    expect(html).toContain("New chat");
    expect(tags(html, "form")[0]?.attrs["hx-post"]).toBe("/admin/chats");
    const inputs = voidTags(html, "input");
    expect(inputs.find((i) => i.attrs.name === "maxQuestions")?.attrs.value).toBe("10");
    expect(inputs.find((i) => i.attrs.name === "recruiterName")?.attrs.value).toBe("");
    expect(tags(html, "button").map((b) => b.text)).toEqual(["Create"]);
    expect(tags(html, "option").filter((o) => "selected" in o.attrs)).toHaveLength(1);
  });

  it("offers an Edit action on each table row", () => {
    const html = String(
      <Rows
        basePath=""
        origin="http://localhost"
        chats={[
          {
            id: CHAT_ID,
            token: "t",
            recruiterName: "Jane",
            company: null,
            maxQuestions: 5,
            used: 0,
            status: "active",
            expiresAt: null,
            lastUsedAt: null,
          },
        ]}
      />,
    );
    const edit = tags(html, "button").find((b) => b.attrs.title === "Edit");
    expect(edit?.attrs["hx-get"]).toBe(`/admin/chats/${CHAT_ID}/edit`);
    expect(edit?.attrs["hx-target"]).toBe("#chat-form");
    expect(edit?.attrs["aria-label"]).toBe("Edit chat for Jane");
  });
});

describe("GET /admin/chats/:id/edit", () => {
  it("shows the edit form filled with the chat", async () => {
    const s = await adminChats();
    s.repo.resumes.set(RESUME, { title: "Backend" });
    const chat = await s.newChat({
      recruiterName: "Jane <Roe>",
      company: "Acme",
      jobDescriptionShort: "Senior Postgres",
      maxQuestions: 7,
      tailoredResumeId: RESUME,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const res = await s.get(`/admin/chats/${chat.id}/edit`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(tags(html, "div")[0]?.attrs.id).toBe("chat-form");
    expect(html).toContain("Edit chat");
    expect(tags(html, "form")[0]?.attrs["hx-put"]).toBe(`/admin/chats/${chat.id}`);
    const inputs = voidTags(html, "input");
    const value = (name: string) => inputs.find((i) => i.attrs.name === name)?.attrs.value;
    expect(value("recruiterName")).toBe("Jane <Roe>");
    expect(value("company")).toBe("Acme");
    expect(value("maxQuestions")).toBe("7");
    expect(new Date(value("expiresAt") ?? "").getTime()).toBeGreaterThan(Date.now());
    expect(tags(html, "textarea")[0]?.text).toBe("Senior Postgres");
    expect(
      tags(html, "option")
        .filter((o) => "selected" in o.attrs)
        .map((o) => o.attrs.value),
    ).toEqual([RESUME]);
    expect(button(html, "Save")).toBeDefined();
    expect(button(html, "Cancel")).toBeDefined();
  });

  it("shows not found for a deleted chat", async () => {
    const s = await adminChats();
    for (const id of ids) {
      const res = await s.get(`/admin/chats/${id}/edit`);
      expect(res.status, id).toBe(404);
      const html = await res.text();
      expect(html).toContain('role="alert"');
      expect(html).toContain("Recruiter Chat not found");
      expect(html).not.toContain("Edit chat");
    }
  });
});

describe("GET /admin/chats/new", () => {
  it("shows the empty new chat form", async () => {
    const s = await adminChats();
    const res = await s.get("/admin/chats/new");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(tags(html, "div")[0]?.attrs.id).toBe("chat-form");
    expect(html).toContain("New chat");
    expect(html).not.toContain("Edit chat");
    expect(tags(html, "form")[0]?.attrs["hx-post"]).toBe("/admin/chats");
    const inputs = voidTags(html, "input");
    expect(inputs.find((i) => i.attrs.name === "recruiterName")?.attrs.value).toBe("");
    expect(inputs.find((i) => i.attrs.name === "maxQuestions")?.attrs.value).toBe("10");
    expect(tags(html, "textarea")[0]?.text).toBe("");
    expect(button(html, "Create")).toBeDefined();
  });
});

describe("PUT /admin/chats/:id", () => {
  it("saves, refreshes rows and shows the new chat form", async () => {
    const s = await adminChats();
    s.repo.resumes.set(RESUME, { title: "Backend" });
    const chat = await s.newChat({ recruiterName: "Old", maxQuestions: 5 });
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    const res = await s.send("PUT", `/admin/chats/${chat.id}`, {
      recruiterName: "New Name",
      company: "Initech",
      jobDescriptionShort: "Fresh JD",
      maxQuestions: "9",
      expiresAt,
      tailoredResumeId: RESUME,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("hx-trigger")).toBe("chats-changed");
    expect(s.repo.rows[0]).toMatchObject({
      recruiterName: "New Name",
      company: "Initech",
      jobDescriptionShort: "Fresh JD",
      maxQuestions: 9,
      tailoredResumeId: RESUME,
      token: chat.token,
    });
    expect(s.repo.rows[0]?.expiresAt).toBeInstanceOf(Date);
    const html = await res.text();
    expect(html).toContain("New chat");
    expect(html).not.toContain("Edit chat");
    const status = tags(html, "p").find((p) => p.attrs.id === "chat-status");
    expect(status?.attrs["hx-swap-oob"]).toBe("true");
    expect(status?.text).toBe("Saved");
    const rows = await (await s.get("/admin/chats/rows")).text();
    expect(rows).toContain("New Name");
    expect(rows).toContain("Initech");
    expect(rows).toContain("0/9");
  });

  it("saves unchanged values", async () => {
    const s = await adminChats();
    const chat = await s.newChat({ maxQuestions: 5 });
    const before = { ...s.repo.rows[0] };
    const fields = {
      recruiterName: chat.recruiterName,
      company: chat.company ?? "",
      jobDescriptionShort: chat.jobDescriptionShort ?? "",
      maxQuestions: String(chat.maxQuestions),
      expiresAt: "",
      tailoredResumeId: "",
    };
    for (let i = 0; i < 2; i++) {
      const res = await s.send("PUT", `/admin/chats/${chat.id}`, fields);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("Saved");
    }
    expect(s.repo.rows[0]).toEqual(before);
  });

  it("answers 404 for a deleted chat", async () => {
    const s = await adminChats();
    for (const id of ids) {
      const res = await s.send("PUT", `/admin/chats/${id}`, s.form);
      expect(res.status, id).toBe(404);
      const html = await res.text();
      expect(html).toContain('role="alert"');
      expect(html).toContain("Recruiter Chat not found");
    }
  });

  it("answers 400 with the message and keeps the chat for max below used", async () => {
    const s = await adminChats();
    const chat = await s.newChat({ maxQuestions: 5 });
    await s.recruiterChat.ask(chat, [{ role: "user", content: "hi" }]);
    await s.recruiterChat.ask(chat, [{ role: "user", content: "hi again" }]);
    const res = await s.send("PUT", `/admin/chats/${chat.id}`, { ...s.form, maxQuestions: "1" });
    expect(res.status).toBe(400);
    expect(decode(await res.text())).toContain("must be at least the questions already used (2)");
    expect(s.repo.rows[0]).toMatchObject({ maxQuestions: 5, used: 2, recruiterName: "Jane Roe" });
  });
});
