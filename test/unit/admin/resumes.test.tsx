import { describe, expect, it } from "vitest";
import { INVALID_DOCUMENT, NOT_GENERATED } from "../../../src/admin/resumes/view";
import { profileInput } from "../../support/fakes/profile.fake";
import {
  sampleCv,
  sampleDocument,
  sampleReply,
  textDocument,
  textForm,
} from "../../support/resume-document";
import { failingFactory, resumeApp } from "../../support/resumes";

/** A reply whose first item text carries raw HTML, to prove it is escaped. */
const freshReply = () => {
  const reply = sampleReply();
  const first = reply.items[0];
  if (first) first.text = "Fresh <b>body</b>";
  return JSON.stringify(reply);
};

const MISSING = "00000000-0000-4000-8000-00000000ffff";
const ids = [MISSING, "not-a-uuid"];
const newResume = { title: "Backend at Acme", company: "Acme", jobDescription: "Build things" };

describe("admin resumes", () => {
  it("lists resumes newest first with links, company, model and date", async () => {
    const { get, resumes, repo } = await resumeApp();
    const first = await resumes.create({ ...newResume, title: "Older <b>one</b>" });
    const second = await resumes.create({ ...newResume, title: "Newer", company: "Globex" });
    await repo.update(second.id, { model: "vendor/tailor" });
    const html = await (await get("/admin/resumes")).text();
    expect(html.indexOf("Newer")).toBeGreaterThan(-1);
    expect(html.indexOf("Newer")).toBeLessThan(html.indexOf("Older"));
    expect(html).toContain(`href="/admin/resumes/${second.id}"`);
    expect(html).toContain(`href="/admin/resumes/${first.id}"`);
    expect(html).toContain("Globex");
    expect(html).toContain("vendor/tailor");
    expect(html).toContain("2026-01-01");
    expect(html).toContain("Older &lt;b&gt;one&lt;/b&gt;");
    expect(html).not.toContain("No tailored resumes yet");
  });

  it("shows the empty state", async () => {
    const { get } = await resumeApp();
    const res = await get("/admin/resumes");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("No tailored resumes yet");
  });

  it("creates a resume and redirects with 303", async () => {
    const { post, repo } = await resumeApp();
    const res = await post("/admin/resumes", newResume);
    expect(res.status).toBe(303);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({
      title: "Backend at Acme",
      structured: sampleDocument(),
      company: "Acme",
    });
    expect(res.headers.get("location")).toBe(`/admin/resumes/${repo.rows[0]?.id}`);
  });

  it("answers 400 naming the empty field and creates nothing", async () => {
    const { post, repo } = await resumeApp();
    const noTitle = await post("/admin/resumes", { ...newResume, title: " " });
    expect(noTitle.status).toBe(400);
    expect(await noTitle.text()).toContain("Title is required");
    const noJd = await post("/admin/resumes", { ...newResume, jobDescription: "" });
    expect(noJd.status).toBe(400);
    expect(await noJd.text()).toContain("Job Description is required");
    expect(repo.rows).toHaveLength(0);
  });

  it("deletes a resume and asks for confirmation", async () => {
    const { get, del, resumes, repo } = await resumeApp();
    const { id } = await resumes.create({ ...newResume, title: 'Acme "A"' });
    const html = await (await get("/admin/resumes")).text();
    expect(html).toContain(`hx-confirm="Delete Acme &quot;A&quot;?"`);
    expect(html).toContain(`hx-delete="/admin/resumes/${id}"`);
    const res = await del(`/admin/resumes/${id}`);
    expect(res.status).toBe(200);
    expect(repo.rows).toHaveLength(0);
    expect(await (await get("/admin/resumes")).text()).toContain("No tailored resumes yet");
  });

  it("answers 404 on every id route for unknown or malformed ids", async () => {
    const { get, post, put, del } = await resumeApp();
    for (const id of ids) {
      const base = `/admin/resumes/${id}`;
      const statuses = [
        (await get(base)).status,
        (await del(base)).status,
        (await put(base, { content: "x" })).status,
        (await post(`${base}/generate`)).status,
        (await post(`${base}/preview`, { content: "x" })).status,
        (await get(`${base}/print`)).status,
        (await get(`${base}/download.md`)).status,
      ];
      expect(statuses).toEqual([404, 404, 404, 404, 404, 404, 404]);
    }
  });

  it("renders the editor with fields, checkboxes and buttons", async () => {
    const { get, resumes, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const { id } = await resumes.create({ ...newResume, jobDescription: "Needs <Rust>" });
    await resumes.save(id, textForm("Hello"), ["EMAIL"]);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(html).toContain("Backend at Acme");
    expect(html).toContain("Acme");
    expect(html).toContain("Needs &lt;Rust&gt;");
    expect(html).toMatch(/<textarea[^>]*name="sections\.0\.text"[^>]*>Hello<\/textarea>/);
    expect(html).toMatch(/<input[^>]*name="headerFields"[^>]*value="EMAIL"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*value="PHONE"[^>]*checked/);
    for (const label of ["Generate", "Save", "Print", "Download .md"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(`href="/admin/resumes/${id}/download.md"`);
    expect(html).toContain("<h2>Summary</h2>");
    expect(html).toContain("<p>Hello</p>");
  });

  it("generate returns the editor fragment with the new content", async () => {
    const { post, resumes, repo } = await resumeApp({ mock: { text: freshReply() } });
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.startsWith('<div id="editor">')).toBe(true);
    expect(html).not.toContain("<html");
    expect(html).toMatch(
      /<textarea[^>]*name="sections\.1\.items\.0\.text"[^>]*>Fresh &lt;b&gt;body&lt;\/b&gt;<\/textarea>/,
    );
    expect(repo.rows[0]?.model).toBe("vendor/tailor");
    expect(JSON.stringify(repo.rows[0]?.structured)).toContain("Fresh <b>body</b>");
  });

  it("generate button has an indicator, is disabled while running and confirms replacement", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const empty = await (await get(`/admin/resumes/${id}`)).text();
    const button = (html: string) =>
      html.match(/<button[^>]*hx-post="[^"]*\/generate"[^>]*>/)?.[0] ?? "";
    expect(button(empty)).toContain('hx-indicator="#generate-indicator"');
    expect(button(empty)).toContain('hx-disabled-elt="this"');
    expect(button(empty)).not.toContain("hx-confirm");
    expect(empty).toContain('id="generate-indicator"');
    await resumes.save(id, textForm("edited"), []);
    const filled = await (await get(`/admin/resumes/${id}`)).text();
    expect(button(filled)).toContain('hx-confirm="Replace the current content?"');
  });

  it("generate answers 502 with the failure text and keeps the content", async () => {
    const { post, resumes, repo } = await resumeApp({ factory: failingFactory });
    const { id } = await resumes.create(newResume);
    await resumes.save(id, textForm("my edits"), []);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(502);
    expect(await res.text()).toContain("Generation failed, try again");
    expect(repo.rows[0]?.structured).toEqual(textDocument("my edits"));
  });

  it("generate answers 400 with the master cv text", async () => {
    const { post, resumes, calls } = await resumeApp({ cv: "" });
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Fill the master CV first");
    expect(calls).toHaveLength(0);
  });

  it("preview returns sanitized html", async () => {
    const { post, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/preview`, {
      content:
        "<script>alert(1)</script>**x** <img src=x onerror=alert(1)> [l](javascript:alert(1))",
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<strong>x</strong>");
    expect(html).not.toMatch(/<script|<img|javascript:/i);
  });

  it("saves content and header fields and answers Saved", async () => {
    const { put, resumes, repo, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const { id } = await resumes.create(newResume);
    const res = await put(`/admin/resumes/${id}`, { ...textForm("Mine"), headerFields: ["PHONE"] });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Saved");
    expect(repo.rows[0]).toMatchObject({
      structured: textDocument("Mine"),
      headerFields: ["PHONE"],
    });
    await put(`/admin/resumes/${id}`, { ...textForm("Mine"), headerFields: ["EMAIL", "PHONE"] });
    expect(repo.rows[0]?.headerFields).toBeNull();
  });

  it("refuses to save content with a personal info value", async () => {
    const { put, resumes, repo, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    const { id } = await resumes.create(newResume);
    const res = await put(`/admin/resumes/${id}`, textForm("mail ada@example.com"));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(
      "Your Email is in the body — keep contact data in Personal info",
    );
    expect(repo.rows[0]?.structured).toBeNull();
  });
});

describe("admin resumes custom instructions", () => {
  it("create stores the posted custom instructions", async () => {
    const { post, repo } = await resumeApp();
    const res = await post("/admin/resumes", { ...newResume, customInstructions: "  One page  " });
    expect(res.status).toBe(303);
    expect(repo.rows[0]?.customInstructions).toBe("One page");
    await post("/admin/resumes", newResume);
    expect(repo.rows[1]?.customInstructions).toBe("");
  });

  it("put saves custom instructions and answers Saved", async () => {
    const { put, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const res = await put(`/admin/resumes/${id}`, {
      ...textForm("Mine"),
      customInstructions: " Lead with platform work ",
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Saved");
    expect(repo.rows[0]).toMatchObject({
      structured: textDocument("Mine"),
      customInstructions: "Lead with platform work",
    });
    await put(`/admin/resumes/${id}`, textForm("Again"));
    expect(repo.rows[0]?.customInstructions).toBe("Lead with platform work");
  });

  it("answers 400 with the length and personal info messages", async () => {
    const { post, put, resumes, repo, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    const length = "Custom instructions must be at most 2000 characters";
    const pii = "Your Email is in the custom instructions — keep contact data in Personal info";
    const tooLong = "a".repeat(2001);
    const leak = "Write to ada@example.com";

    for (const [customInstructions, message] of [
      [tooLong, length],
      [leak, pii],
    ] as const) {
      const created = await post("/admin/resumes", { ...newResume, customInstructions });
      expect(created.status).toBe(400);
      expect(await created.text()).toContain(message);
    }
    expect(repo.rows).toHaveLength(0);

    const { id } = await resumes.create(newResume);
    for (const [customInstructions, message] of [
      [tooLong, length],
      [leak, pii],
    ] as const) {
      const saved = await put(`/admin/resumes/${id}`, { content: "x", customInstructions });
      expect(saved.status).toBe(400);
      expect(await saved.text()).toContain(message);
      const generated = await post(`/admin/resumes/${id}/generate`, { customInstructions });
      expect(generated.status).toBe(400);
      expect(await generated.text()).toContain(message);
    }
    expect(repo.rows[0]).toMatchObject({ content: "", customInstructions: "" });
  });

  it("generate saves the posted custom instructions", async () => {
    const { post, resumes, repo, calls } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`, {
      customInstructions: " Write in Portuguese ",
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.startsWith('<div id="editor">')).toBe(true);
    expect(repo.rows[0]).toMatchObject({
      structured: sampleDocument(),
      customInstructions: "Write in Portuguese",
    });
    expect(calls[0]?.prompt).toContain("Write in Portuguese");

    await post(`/admin/resumes/${id}/generate`);
    expect(repo.rows[0]?.customInstructions).toBe("Write in Portuguese");
    expect(calls[1]?.prompt).toContain("Write in Portuguese");
  });

  it("new resume form has an optional custom instructions textarea", async () => {
    const { get } = await resumeApp();
    const html = await (await get("/admin/resumes")).text();
    const form = html.slice(html.indexOf("New resume"));
    expect(form).toMatch(
      /<label[^>]*for="customInstructions"[^>]*>\s*Custom instructions\s*<\/label>/,
    );
    const textarea = form.match(/<textarea[^>]*name="customInstructions"[^>]*>/)?.[0] ?? "";
    expect(textarea).not.toBe("");
    expect(textarea).toContain('id="customInstructions"');
    expect(textarea).not.toContain("required");
  });

  it("editor shows the stored custom instructions", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create({
      ...newResume,
      customInstructions: "Lead with <b>platform</b> work",
    });
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(html).toMatch(
      /<label[^>]*for="custom-instructions"[^>]*>\s*Custom instructions\s*<\/label>/,
    );
    expect(html).toMatch(
      /<textarea[^>]*id="custom-instructions"[^>]*name="customInstructions"[^>]*>Lead with &lt;b&gt;platform&lt;\/b&gt; work<\/textarea>/,
    );
    const form = html.slice(
      html.indexOf('id="resume-form"'),
      html.indexOf("</form>", html.indexOf('id="resume-form"')),
    );
    expect(form).toContain('id="custom-instructions"');
  });

  it("generate button includes the custom instructions textarea", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    const button = html.match(/<button[^>]*hx-post="[^"]*\/generate"[^>]*>/)?.[0] ?? "";
    expect(button).toContain('hx-include="#custom-instructions"');
    expect(html.match(/id="custom-instructions"/g)).toHaveLength(1);
  });
});

describe("admin resumes create flow", () => {
  it("create generates and redirects to the editor", async () => {
    const { post, repo, calls } = await resumeApp();
    const res = await post("/admin/resumes", newResume);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/admin/resumes/${repo.rows[0]?.id}`);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ structured: sampleDocument(), model: "vendor/tailor" });
    expect(calls).toHaveLength(1);
  });

  it("editor after create holds the generated content", async () => {
    const { post, get, repo } = await resumeApp({ mock: { text: freshReply() } });
    const res = await post("/admin/resumes", newResume);
    const html = await (await get(res.headers.get("location") ?? "")).text();
    expect(html).toMatch(
      /<textarea[^>]*name="sections\.1\.items\.0\.text"[^>]*>Fresh &lt;b&gt;body&lt;\/b&gt;<\/textarea>/,
    );
    expect(html).toContain("<h3>Staff Engineer — Globex (2020-2024)</h3>");
    expect(html).toContain("Fresh &lt;b&gt;body&lt;/b&gt;</p>");
    expect(JSON.stringify(repo.rows[0]?.structured)).toContain("Fresh <b>body</b>");
  });

  it("answers 400 and stores nothing for invalid input", async () => {
    const { post, repo, calls, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    const cases: [Record<string, string>, string][] = [
      [{ ...newResume, title: " " }, "Title is required"],
      [{ ...newResume, jobDescription: "" }, "Job Description is required"],
      [{ ...newResume, customInstructions: "x".repeat(2001) }, "at most 2000 characters"],
      [{ ...newResume, customInstructions: "mail ada@example.com" }, "Your Email is in the custom"],
    ];
    for (const [fields, message] of cases) {
      const res = await post("/admin/resumes", fields);
      expect(res.status).toBe(400);
      const body = await res.text();
      expect(body).toContain(message);
      expect(body).toContain('class="error"');
      expect(body).toContain('role="alert"');
    }
    expect(repo.rows).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it("keeps the resume and redirects with error generate when the llm fails", async () => {
    const { post, repo, addField } = await resumeApp({ factory: failingFactory });
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const res = await post("/admin/resumes", {
      ...newResume,
      headerFieldsPosted: "1",
      headerFields: ["EMAIL"],
    });
    expect(res.status).toBe(303);
    expect(repo.rows).toHaveLength(1);
    expect(res.headers.get("location")).toBe(`/admin/resumes/${repo.rows[0]?.id}?error=generate`);
    expect(repo.rows[0]).toMatchObject({ content: "", model: null, headerFields: ["EMAIL"] });
  });

  it("keeps the resume and redirects with error master-cv when the master cv is empty", async () => {
    const { post, repo, calls } = await resumeApp({ cv: "" });
    const res = await post("/admin/resumes", newResume);
    expect(res.status).toBe(303);
    expect(repo.rows).toHaveLength(1);
    expect(res.headers.get("location")).toBe(`/admin/resumes/${repo.rows[0]?.id}?error=master-cv`);
    expect(repo.rows[0]).toMatchObject({ content: "", model: null });
    expect(calls).toHaveLength(0);
  });

  it("stores the checked header keys, null for all, [] for none", async () => {
    const { post, repo, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const posted = { ...newResume, headerFieldsPosted: "1" };
    await post("/admin/resumes", { ...posted, headerFields: ["PHONE", "GONE"] });
    await post("/admin/resumes", { ...posted, headerFields: ["EMAIL", "PHONE"] });
    await post("/admin/resumes", posted);
    expect(repo.rows.map((r) => r.headerFields)).toEqual([["PHONE"], null, []]);
  });

  const status = (html: string) =>
    html.match(/<p[^>]*id="editor-status"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? null;

  it("editor shows the generation failed text for error generate", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const html = await (await get(`/admin/resumes/${id}?error=generate`)).text();
    expect(status(html)).toBe('<span class="text-danger">Generation failed, try again</span>');
  });

  it("editor shows the master cv text for error master-cv", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const html = await (await get(`/admin/resumes/${id}?error=master-cv`)).text();
    expect(status(html)).toBe('<span class="text-danger">Fill the master CV first</span>');
  });

  it("editor shows no error text for an unknown error value", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    for (const value of ["nope", "<b>x</b>", "", "constructor", "__proto__"]) {
      const html = await (
        await get(`/admin/resumes/${id}?error=${encodeURIComponent(value)}`)
      ).text();
      expect(status(html)).toBe("");
      expect(html).not.toContain("Generation failed");
      expect(html).not.toContain("Fill the master CV first");
    }
    const plain = await (await get(`/admin/resumes/${id}`)).text();
    expect(status(plain)).toBe("");
  });

  it("generate works on the editor opened after a failed create", async () => {
    const { post, get, repo, profileRepo } = await resumeApp({ cv: "" });
    const created = await post("/admin/resumes", newResume);
    const location = created.headers.get("location") ?? "";
    expect(location).toContain("?error=master-cv");
    await profileRepo.upsert({ ...profileInput, masterCv: sampleCv });
    expect(await (await get(location)).text()).toContain("Fill the master CV first");
    const res = await post(`/admin/resumes/${repo.rows[0]?.id}/generate`);
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(
      /<input[^>]*name="sections\.2\.items\.0\.heading"[^>]*value="BSc Computer Science — State University"/,
    );
    expect(repo.rows[0]).toMatchObject({ structured: sampleDocument(), model: "vendor/tailor" });
  });

  const newForm = (html: string) =>
    html.match(/<form[^>]*action="\/admin\/resumes"[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";

  it("new resume form has a checked personal header checkbox per field", async () => {
    const { get, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const form = newForm(await (await get("/admin/resumes")).text());
    expect(form).toContain("<legend>Personal header</legend>");
    expect(form).toMatch(/<input[^>]*name="headerFieldsPosted"[^>]*value="1"/);
    for (const [key, label] of [
      ["EMAIL", "Email"],
      ["PHONE", "Phone"],
    ]) {
      expect(form).toMatch(
        new RegExp(
          `<input[^>]*type="checkbox"[^>]*name="headerFields"[^>]*value="${key}"[^>]*checked`,
        ),
      );
      expect(form).toContain(label);
    }
    expect(form.match(/name="headerFields"/g)).toHaveLength(2);
  });

  it("create form disables the button and shows generating text", async () => {
    const { get } = await resumeApp();
    const form = newForm(await (await get("/admin/resumes")).text());
    const tag = form.match(/<form[^>]*>/)?.[0] ?? "";
    expect(tag).toContain('hx-boost="true"');
    expect(tag).toContain('hx-disabled-elt="find button[type=submit]"');
    expect(tag).toContain('hx-indicator="#create-indicator"');
    expect(form).toMatch(/<[^>]*id="create-indicator"[^>]*>Generating…<\//);
    expect(form).toMatch(/<button[^>]*type="submit"[^>]*>\s*Create\s*<\/button>/);
    expect(form).not.toMatch(/\sonsubmit=/);
  });

  it("omits the fieldset and stores null without personal info fields", async () => {
    const { get, post, repo } = await resumeApp();
    const form = newForm(await (await get("/admin/resumes")).text());
    expect(form).not.toContain("Personal header");
    expect(form).not.toContain("headerFieldsPosted");
    const res = await post("/admin/resumes", newResume);
    expect(res.status).toBe(303);
    expect(repo.rows[0]?.headerFields).toBeNull();
  });
});

const generateButton = (html: string) =>
  html.match(/<button[^>]*hx-post="[^"]*\/generate"[^>]*>/)?.[0] ?? "";
const attr = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

describe("admin resumes structured", () => {
  it("editor shows the document as a form", async () => {
    const { get, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    await repo.update(id, { structured: sampleDocument() });
    const html = await (await get(`/admin/resumes/${id}`)).text();
    const doc = sampleDocument();
    expect(html).toContain('id="document-form"');
    doc.sections.forEach((section, i) => {
      if (section.title) expect(html).toContain(`<h3 class="section-title">${section.title}</h3>`);
      expect(html).toMatch(
        new RegExp(
          `<input[^>]*type="hidden"[^>]*name="sections\\.${i}\\.title"[^>]*value="${section.title}"`,
        ),
      );
      expect(html).toMatch(
        new RegExp(
          `<input[^>]*type="hidden"[^>]*name="sections\\.${i}\\.kind"[^>]*value="${section.kind}"`,
        ),
      );
      expect(html).toMatch(
        new RegExp(`<textarea[^>]*name="sections\\.${i}\\.text"[^>]*>${section.text}</textarea>`),
      );
      section.items.forEach((item, j) => {
        const f = `sections\\.${i}\\.items\\.${j}`;
        expect(html).toMatch(
          new RegExp(
            `<input[^>]*type="text"[^>]*name="${f}\\.heading"[^>]*value="${item.heading.replace(/[()]/g, "\\$&")}"`,
          ),
        );
        expect(html).toMatch(
          new RegExp(`<textarea[^>]*name="${f}\\.text"[^>]*>${item.text}</textarea>`),
        );
        const bullets = html.match(
          new RegExp(`<textarea[^>]*name="${f}\\.bullets"[^>]*>([^<]*)</textarea>`),
        );
        expect(bullets?.[1]).toBe(item.bullets.join("\n"));
      });
    });
    expect(html).toContain('<h3 class="section-title">Introduction</h3>');
    expect(html).not.toContain(NOT_GENERATED);
    expect(html).not.toMatch(/name="content"/);
    // The preview starts from the stored document.
    expect(html).toContain("<h3>Staff Engineer — Globex (2020-2024)</h3>");
    expect(generateButton(html)).toContain('hx-confirm="Replace the current content?"');
  });

  it("wires remove move up and move down to the form route per item", async () => {
    const { get, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    await repo.update(id, { structured: sampleDocument() });
    const html = await (await get(`/admin/resumes/${id}`)).text();
    const buttons = [...html.matchAll(/<button[^>]*hx-post="[^"]*\/form"[^>]*>([^<]*)<\/button>/g)];
    // Three items, three buttons each.
    expect(buttons).toHaveLength(9);
    for (const [target, item] of [
      ["s1.i0", 0],
      ["s1.i1", 1],
      ["s2.i0", 2],
    ] as const) {
      for (const [op, label] of [
        ["up", "Move up"],
        ["down", "Move down"],
        ["remove", "Remove"],
      ] as const) {
        const button = buttons[item * 3 + ["up", "down", "remove"].indexOf(op)];
        expect(button?.[1]).toBe(label);
        const tag = button?.[0] ?? "";
        expect(tag).toContain(`hx-post="/admin/resumes/${id}/form"`);
        expect(tag).toContain(`hx-vals="${attr(JSON.stringify({ op, target }))}"`);
        expect(tag).toContain('hx-include="#resume-form"');
        expect(tag).toContain('hx-target="#document-form"');
        expect(tag).toContain('hx-swap="outerHTML"');
        expect(tag).toContain('type="button"');
      }
    }
  });

  it("escapes every document string in the form", async () => {
    const { get, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    await repo.update(id, {
      structured: {
        version: 1,
        sections: [
          {
            title: 'Exp <i>"x"</i>',
            kind: "experience",
            text: "<script>alert(1)</script>",
            items: [{ heading: '"><b>h</b>', text: "</textarea><b>t</b>", bullets: ["<u>b</u>"] }],
          },
        ],
      },
    });
    const html = await (await get(`/admin/resumes/${id}`)).text();
    const form = html.slice(
      html.indexOf('id="document-form"'),
      html.indexOf('id="custom-instructions"'),
    );
    expect(form).toContain("Exp &lt;i&gt;&quot;x&quot;&lt;/i&gt;");
    expect(form).toContain('value="&quot;&gt;&lt;b&gt;h&lt;/b&gt;"');
    expect(form).toContain("&lt;script&gt;alert(1)&lt;/script&gt;</textarea>");
    expect(form).toContain("&lt;/textarea&gt;&lt;b&gt;t&lt;/b&gt;</textarea>");
    expect(form).toContain("&lt;u&gt;b&lt;/u&gt;</textarea>");
    expect(form).not.toMatch(/<script|<b>|<u>|<i>/);
  });

  it("editor shows not generated yet without a document", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(html).toContain(NOT_GENERATED);
    expect(generateButton(html)).not.toBe("");
    expect(generateButton(html)).not.toContain("hx-confirm");
    expect(html).not.toContain('id="document-form"');
    expect(html).not.toMatch(/name="sections\./);
    expect(html).not.toMatch(/hx-put=/);
    expect(html).not.toContain(INVALID_DOCUMENT);
  });

  it("shows the invalid data message for a corrupt stored document", async () => {
    const { get, resumes, repo, logs } = await resumeApp();
    const { id } = await resumes.create(newResume);
    await repo.update(id, { structured: { version: 2, sections: [{ title: "SECRET-BODY" }] } });
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(html).toContain("This resume&#39;s stored data is invalid; generate it again");
    expect(generateButton(html)).not.toBe("");
    expect(generateButton(html)).not.toContain("hx-confirm");
    expect(html).not.toContain('id="document-form"');
    expect(html).not.toMatch(/name="sections\./);
    expect(html).not.toContain(NOT_GENERATED);
    expect(html).not.toContain("SECRET-BODY");
    const logged = logs.find((l) => l.message === "stored resume document invalid");
    expect(logged).toMatchObject({ level: "error", data: { id, path: "version" } });
    expect(JSON.stringify(logged)).not.toContain("SECRET-BODY");
  });

  it("generate swaps in the form with the new document", async () => {
    const { post, resumes } = await resumeApp({ mock: { text: freshReply() } });
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.startsWith('<div id="editor">')).toBe(true);
    expect(html).toContain('id="document-form"');
    expect(html).not.toContain(NOT_GENERATED);
    expect(html).toMatch(
      /<input[^>]*name="sections\.1\.items\.0\.heading"[^>]*value="Staff Engineer — Globex \(2020-2024\)"/,
    );
    expect(html).toMatch(
      /<textarea[^>]*name="sections\.1\.items\.0\.text"[^>]*>Fresh &lt;b&gt;body&lt;\/b&gt;<\/textarea>/,
    );
    expect(html).toContain("<h3>Staff Engineer — Globex (2020-2024)</h3>");
    expect(generateButton(html)).toContain('hx-confirm="Replace the current content?"');
  });
});
