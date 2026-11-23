import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { sampleLibrary } from "../../support/career";
import { careerSetup } from "../../support/career-service";
import { button, formFields, type Gesture, gesture, sections, tags } from "../../support/html";
import { createTestApp } from "../../support/test-app";

type Setup = Parameters<typeof careerSetup>[0];

async function adminCareer(opts: Setup = { items: sampleLibrary().items }) {
  const s = careerSetup(opts);
  const { app } = createTestApp({
    config: s.config,
    services: {
      career: s.career,
      profile: s.profile,
      personalInfo: s.personalInfo,
      llm: s.llm,
    },
  });
  const token = await signSession({ scope: "admin" }, s.config.sessionSecret, 60);
  const send = ({ method, path, fields }: Gesture) =>
    app.request(path, {
      method,
      headers: {
        cookie: `curr_admin=${token}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body:
        method === "GET" || method === "DELETE"
          ? undefined
          : new URLSearchParams(fields).toString(),
    });
  const get = (path: string) => send({ method: "GET", path, fields: {} });
  const click = (html: string, label: string | RegExp) => send(gesture(button(html, label)));
  const submit = (html: string, overrides: Record<string, string> = {}) => {
    const form = tags(html, "form")[0];
    if (!form) throw new Error("no form");
    const { method, path } = gesture(form);
    return send({ method, path, fields: { ...formFields(form.html), ...overrides } });
  };
  return { ...s, send, get, click, submit };
}

const titles = (items: { title: string }[]) => items.map((i) => i.title);

describe("admin profile career", () => {
  it("shows the cards on the profile page with the markdown and import buttons", async () => {
    const s = await adminCareer();
    const html = await (await s.get("/admin/profile")).text();
    expect(sections(html).map((c) => c.title.replace(/\d+$/, ""))).toEqual([
      "Experience",
      "Projects",
      "Education",
      "Certifications",
      "Courses",
      "Skills",
      "Languages",
      "Publications",
      "Honours",
    ]);
    expect(html).toContain('id="career-library"');
    expect(html).toContain("Edit as markdown");
    expect(html).toContain("Import from text");
    expect(html).toContain('src="/admin/profile/career.js"');
    expect(html).not.toContain('name="masterCv"');
  });

  it("add opens an empty form at the end of the card", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const res = await s.click(page, /Add project$/);
    expect(res.status).toBe(200);
    const html = await res.text();
    const card = sections(html).find((c) => c.title.startsWith("Projects"))?.html ?? "";
    expect(card.indexOf("Open source CLI")).toBeLessThan(card.indexOf("<form"));
    expect(formFields(card)).toMatchObject({ kind: "project", title: "", organisation: "" });
    expect(html.match(/<form/g)).toHaveLength(1);
  });

  it("edit replaces the row with a filled form", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const html = await (await s.click(page, "Edit Staff Engineer")).text();
    const card = sections(html)[0]?.html ?? "";
    expect(card).not.toContain("Move Staff Engineer up");
    expect(card).toContain("Move Engineer up");
    expect(formFields(card)).toMatchObject({
      title: "Staff Engineer",
      organisation: "Globex",
      location: "Remote",
      startYear: "2020",
      startMonth: "1",
      current: "on",
      stack: "TypeScript, Postgres",
      details:
        "Led the platform team and its on-call rotation.\n- Cut p99 latency by 40%\n- Mentored six engineers",
    });
    expect(tags(card, "button").map((b) => b.text)).toEqual(
      expect.arrayContaining(["Save", "Cancel"]),
    );
  });

  it("saves an edit from the filled form and shows the row again", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const form = await (await s.click(page, "Edit Engineer")).text();
    const res = await s.submit(form, { title: "Principal Engineer", startMonth: "4" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Principal Engineer");
    expect(html).toContain("Initech · Apr 2016 – 2020");
    expect(html).not.toContain("<form");
    const saved = (await s.career.library()).items.find((i) => i.organisation === "Initech");
    expect(saved?.title).toBe("Principal Engineer");
    expect(saved?.startMonth).toBe(4);
  });

  it("cancel shows the row unchanged", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const open = await (await s.click(page, "Edit Staff Engineer")).text();
    const res = await s.click(open, "Cancel");
    const html = await res.text();
    expect(html).toBe(await (await s.get("/admin/profile/items")).text());
    expect(html).toContain("Move Staff Engineer down");
    expect(html).not.toContain("<form");
    expect((await s.career.library()).items).toEqual(sampleLibrary().items);
  });

  it("delete asks delete this item and removes the item", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const trash = button(page, "Delete Engineer");
    expect(trash.attrs["hx-confirm"]).toBe("Delete this item?");
    const res = await s.send(gesture(trash));
    expect(res.status).toBe(200);
    const html = await res.text();
    const experience = sections(html)[0];
    expect(experience?.title).toBe("Experience1");
    expect(experience?.html).not.toContain("Initech");
    expect(titles((await s.career.library()).items)).not.toContain("Engineer");
  });

  it("moves an item and re-renders its card", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const html = await (await s.click(page, "Move Staff Engineer down")).text();
    const experience = sections(html)[0]?.html ?? "";
    expect(experience.indexOf("Initech")).toBeLessThan(experience.indexOf("Globex"));
    const order = (await s.career.library()).items.filter((i) => i.kind === "experience");
    expect(titles(order)).toEqual(["Engineer", "Staff Engineer"]);
  });

  it("answers field is required and keeps the entered values", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const open = await (await s.click(page, /Add experience$/)).text();
    const res = await s.submit(open, { organisation: "Acme", location: "Lisbon", details: "Kept" });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Position is required");
    const form = tags(html, "form")[0]?.html ?? "";
    expect(formFields(form)).toMatchObject({
      kind: "experience",
      organisation: "Acme",
      location: "Lisbon",
      details: "Kept",
    });
    expect((await s.career.library()).items).toEqual(sampleLibrary().items);
  });

  it("answers the end before start message and the pii message without storing", async () => {
    const s = await adminCareer();
    await s.addField("EMAIL", "Email", "ada@example.com");
    const open = await (await s.get("/admin/profile/items/new?kind=course")).text();
    const before = await s.submit(open, {
      title: "C",
      organisation: "O",
      startYear: "2020",
      endYear: "2019",
    });
    expect(before.status).toBe(400);
    expect(await before.text()).toContain("End date is before start date");
    const pii = await s.submit(open, { title: "C", organisation: "ada@example.com" });
    expect(pii.status).toBe(400);
    expect(await pii.text()).toContain("Your Email is in the body");
    expect((await s.career.library()).items).toEqual(sampleLibrary().items);
  });

  it("answers 400 for an unknown kind or direction and 404 for an unknown item", async () => {
    const s = await adminCareer();
    expect((await s.get("/admin/profile/items/new?kind=hobby")).status).toBe(400);
    const missing = "00000000-0000-4000-8000-00000000ffff";
    expect((await s.get(`/admin/profile/items/${missing}/edit`)).status).toBe(404);
    expect(
      (
        await s.send({
          method: "POST",
          path: `/admin/profile/items/${sampleLibrary().items[0]?.id}/move`,
          fields: { direction: "sideways" },
        })
      ).status,
    ).toBe(400);
    expect(
      (await s.send({ method: "DELETE", path: `/admin/profile/items/${missing}`, fields: {} }))
        .status,
    ).toBe(404);
  });

  it("edit as markdown shows the rendered library", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const res = await s.click(page, "Edit as markdown");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(formFields(html).markdown).toBe(await s.career.markdown());
    expect(formFields(html).markdown).toContain("### Staff Engineer");
    expect(html).not.toContain('class="career-card"');
  });

  it("saves the markdown and shows the cards of the parsed library", async () => {
    const s = await adminCareer();
    const editor = await (await s.get("/admin/profile/markdown")).text();
    const markdown =
      "## Experience\n\n### Founder\n*Own Co · Lisbon · 2018 – Present*\n\nRuns it.\n";
    const res = await s.submit(editor, { markdown });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(sections(html)[0]?.title).toBe("Experience1");
    expect(html).toContain("Own Co · Lisbon · 2018 – Present");
    expect(titles((await s.career.library()).items)).toEqual(["Founder"]);
  });

  it("keeps the markdown text after a 400", async () => {
    const s = await adminCareer();
    const editor = await (await s.get("/admin/profile/markdown")).text();
    const bad = "## Hobbies\n\n### Chess\n";
    const res = await s.submit(editor, { markdown: bad });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("line 1:");
    expect(formFields(html).markdown).toBe(bad);
    expect((await s.career.library()).items).toEqual(sampleLibrary().items);
  });

  it("markdown cancel shows the cards unchanged", async () => {
    const s = await adminCareer();
    const editor = await (await s.get("/admin/profile/markdown")).text();
    const res = await s.click(editor, "Cancel");
    expect(await res.text()).toBe(await (await s.get("/admin/profile/items")).text());
    expect((await s.career.library()).items).toEqual(sampleLibrary().items);
  });

  it("import shows a textarea with convert and cancel", async () => {
    const s = await adminCareer();
    const page = await (await s.get("/admin/profile")).text();
    const html = await (await s.click(page, "Import from text")).text();
    expect(tags(html, "textarea").map((t) => t.attrs.name)).toEqual(["text"]);
    expect(button(html, "Convert").attrs.type).toBe("submit");
    expect(gesture(button(html, "Cancel"))).toMatchObject({
      method: "GET",
      path: "/admin/profile/items",
    });
  });

  it("convert puts the model markdown in the editor and stores nothing", async () => {
    const markdown = "## Skills\n\n### Backend\nGo, Rust\n";
    const s = await adminCareer({ items: sampleLibrary().items, mock: { text: markdown } });
    const form = await (await s.get("/admin/profile/import")).text();
    const res = await s.submit(form, { text: "my cv text" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(formFields(html).markdown).toBe(markdown.trim());
    expect(s.calls).toHaveLength(1);
    expect((await s.career.library()).items).toEqual(sampleLibrary().items);
    expect(s.repo.writes).toBe(0);
  });

  it("import answers 400 for empty and oversized text keeping the text", async () => {
    const s = await adminCareer();
    const form = await (await s.get("/admin/profile/import")).text();
    const empty = await s.submit(form, { text: "  " });
    expect(empty.status).toBe(400);
    expect(await empty.text()).toContain("Paste some text to import");
    const big = "x".repeat(50_001);
    const long = await s.submit(form, { text: big });
    expect(long.status).toBe(400);
    const html = await long.text();
    expect(html).toContain("Text is limited to 50000 characters");
    expect(formFields(html).text).toBe(big);
    expect(s.calls).toHaveLength(0);
  });

  it("import outage answers 503 and keeps the text", async () => {
    const s = await adminCareer({ items: sampleLibrary().items, failing: true });
    const form = await (await s.get("/admin/profile/import")).text();
    const res = await s.submit(form, { text: "Worked at Acme" });
    expect(res.status).toBe(503);
    const html = await res.text();
    expect(html).toContain("The language model is unavailable");
    expect(formFields(html).text).toBe("Worked at Acme");
    expect((await s.career.library()).items).toEqual(sampleLibrary().items);
  });

  it("serves the career script", async () => {
    const s = await adminCareer();
    const res = await s.get("/admin/profile/career.js");
    expect(res.headers.get("content-type")).toContain("javascript");
    expect(await res.text()).toContain("htmx:beforeSwap");
  });
});

describe("admin profile career empty library", () => {
  it("shows every card empty with nothing here yet", async () => {
    const s = await adminCareer({ items: [] });
    const html = await (await s.get("/admin/profile")).text();
    expect(html.match(/Nothing here yet\./g)).toHaveLength(9);
    expect(html).not.toContain('class="badge"');
  });
});
