import { describe, expect, it } from "vitest";
import { INVALID_DOCUMENT, NOT_GENERATED } from "../../../src/admin/resumes/view";
import type { ResumeDocument } from "../../../src/services/tailor/document";
import { item, SAMPLE_IDS, sampleLibrary, sampleReplyV2 } from "../../support/career";
import {
  button,
  decode,
  formFields,
  type Gesture,
  gesture,
  sections,
  tags,
} from "../../support/html";
import { failingFactory, resumeApp } from "../../support/resumes";

const MISSING = "00000000-0000-4000-8000-00000000ffff";
const ids = [MISSING, "not-a-uuid"];
const newResume = { title: "Backend at Acme", company: "Acme", jobDescription: "Build things" };

async function generated(opts: Parameters<typeof resumeApp>[0] = {}) {
  const s = await resumeApp(opts);
  const { id } = await s.resumes.create(newResume);
  await s.resumes.generate(id);
  const send = ({ method, path, fields }: Gesture) =>
    method === "GET"
      ? s.get(path)
      : method === "DELETE"
        ? s.del(path)
        : method === "PUT"
          ? s.put(path, fields)
          : s.post(path, fields);
  const page = async () => (await s.get(`/admin/resumes/${id}`)).text();
  const click = (html: string, label: string | RegExp) => send(gesture(button(html, label)));
  const submitIn = (html: string, header: boolean, overrides: Record<string, string>) => {
    const form = tags(html, "form").find(
      (f) => !f.attrs.id && Object.values(f.attrs).some((v) => v.endsWith("/header")) === header,
    );
    if (!form) throw new Error("no form");
    const { method, path } = gesture(form);
    return send({ method, path, fields: { ...formFields(form.html), ...overrides } });
  };
  const submit = (html: string, overrides: Record<string, string> = {}) =>
    submitIn(html, false, overrides);
  const submitHeader = (html: string, overrides: Record<string, string> = {}) =>
    submitIn(html, true, overrides);
  const doc = () =>
    s.repo.rows[0]?.structured as unknown as {
      headline: string;
      summary: string;
      items: ResumeDocument["items"];
    };
  return { ...s, id, page, click, submit, submitHeader, doc, send };
}

const cards = (html: string) =>
  sections(html).filter((c) => /^(Experience|Projects)/.test(c.title));

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
    const item = { title: "x", organisation: "y", startYear: "2020" };
    for (const id of ids) {
      const base = `/admin/resumes/${id}`;
      const statuses = [
        (await get(base)).status,
        (await del(base)).status,
        (await put(base, { headerFields: "EMAIL" })).status,
        (await post(`${base}/generate`)).status,
        (await get(`${base}/print`)).status,
        (await get(`${base}/download.md`)).status,
        (await get(`${base}/items`)).status,
        (await get(`${base}/items/new?kind=project`)).status,
        (await get(`${base}/items/${MISSING}/edit`)).status,
        (await post(`${base}/items`, { kind: "experience", ...item })).status,
        (await put(`${base}/items/${MISSING}`, item)).status,
        (await post(`${base}/items/${MISSING}/move`, { direction: "up" })).status,
        (await del(`${base}/items/${MISSING}`)).status,
        (await put(`${base}/header`, { headline: "h", summary: "s" })).status,
      ];
      expect(statuses).toEqual(statuses.map(() => 404));
    }
  });

  it("renders the editor with options, buttons and one card per kind", async () => {
    const { get, resumes, addField, id } = await generated();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    await resumes.updateOptions(id, ["EMAIL"]);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(html).toContain("Backend at Acme");
    expect(html).toMatch(/<input[^>]*name="headerFields"[^>]*value="EMAIL"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*value="PHONE"[^>]*checked/);
    for (const label of ["Generate", "Save options", "Print", "Download .md"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(`href="/admin/resumes/${id}/download.md"`);
    expect(
      sections(html)
        .map((c) => c.title.replace(/\d+$/, ""))
        .filter(Boolean),
    ).toEqual([
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
    expect(html).toContain("Staff Engineer");
    expect(html).toContain("Header");
    expect(html).not.toMatch(/name="sections\./);
  });

  it("shows the empty state until the resume is generated", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(html).toContain(NOT_GENERATED);
    expect(sections(html)).toHaveLength(0);
  });

  it("shows the invalid document text when the stored document fails its schema", async () => {
    const { get, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const row = repo.rows[0];
    if (row) row.structured = { version: 2, headline: 1 } as never;
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(decode(html)).toContain(INVALID_DOCUMENT);
  });

  it("generate returns the editor fragment with the cards from the library", async () => {
    const { post, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.startsWith('<div id="editor">')).toBe(true);
    expect(html).not.toContain("<html");
    expect(html).toContain("Staff Engineer");
    expect(repo.rows[0]?.model).toBe("vendor/tailor");
    expect(repo.rows[0]?.structured).toMatchObject({ version: 2 });
  });

  it("generate button has an indicator, is disabled while running and confirms replacement", async () => {
    const { get, resumes, id: generatedId } = await generated();
    const { id } = await resumes.create(newResume);
    const empty = await (await get(`/admin/resumes/${id}`)).text();
    const tag = (html: string) =>
      html.match(/<button[^>]*hx-post="[^"]*\/generate"[^>]*>/)?.[0] ?? "";
    expect(tag(empty)).toContain('hx-indicator="#generate-indicator"');
    expect(tag(empty)).toContain('hx-disabled-elt="this"');
    expect(tag(empty)).not.toContain("hx-confirm");
    expect(empty).toContain('id="generate-indicator"');
    const filled = await (await get(`/admin/resumes/${generatedId}`)).text();
    expect(tag(filled)).toContain('hx-confirm="Replace the current content?"');
  });

  it("generate answers 503 with the failure text and keeps the document", async () => {
    const s = await resumeApp();
    const { id } = await s.resumes.create(newResume);
    await s.resumes.generate(id);
    const before = structuredClone(s.repo.rows[0]?.structured);
    const failing = await resumeApp({ factory: failingFactory });
    const created = await failing.resumes.create(newResume);
    await failing.repo.update(created.id, { structured: before as never });
    const res = await failing.post(`/admin/resumes/${created.id}/generate`);
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("Generation failed, try again");
    expect(failing.repo.rows[0]?.structured).toEqual(before);
  });

  it("generate answers 503 after one retry when the model names an unknown id twice", async () => {
    const wrong = JSON.stringify({
      ...sampleReplyV2(),
      items: [{ source_id: "c99", text: "Invented", bullets: [] }],
    });
    const s = await resumeApp({
      mock: { replies: [wrong, wrong, JSON.stringify(sampleReplyV2())] },
    });
    const { id } = await s.resumes.create(newResume);
    const res = await s.post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("Generation failed, try again");
    expect(s.calls).toHaveLength(2);
    expect(s.repo.rows[0]?.structured).toBeNull();
  });

  it("generate answers 400 when the library is empty", async () => {
    const { post, resumes, calls } = await resumeApp({ items: [] });
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Add Career Items to your profile before generating");
    expect(calls).toHaveLength(0);
  });

  it("saves the header fields and answers Saved", async () => {
    const { put, resumes, repo, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const { id } = await resumes.create(newResume);
    const res = await put(`/admin/resumes/${id}`, { headerFields: ["PHONE"] });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Saved");
    expect(repo.rows[0]?.headerFields).toEqual(["PHONE"]);
    await put(`/admin/resumes/${id}`, { headerFields: ["EMAIL", "PHONE"] });
    expect(repo.rows[0]?.headerFields).toBeNull();
    await put(`/admin/resumes/${id}`);
    expect(repo.rows[0]?.headerFields).toEqual([]);
  });

  it("the save options button sends the form and swaps the status line", async () => {
    const { page } = await generated();
    const tag = button(await page(), "Save options");
    expect(tag.attrs["hx-include"]).toBe("#resume-form");
    expect(tag.attrs["hx-target"]).toBe("#editor-status");
    expect(gesture(tag).method).toBe("PUT");
  });
});

describe("admin resumes left out", () => {
  const globex = SAMPLE_IDS.globex;
  const card = (html: string, title: RegExp) => {
    const found = sections(html).find((c) => title.test(c.title));
    if (!found) throw new Error(`no card ${title}`);
    return found.html;
  };

  it("shows a card for every kind including empty ones", async () => {
    const { page } = await generated();
    const titles = sections(await page()).map((c) => c.title.replace(/\d+$/, ""));
    expect(titles).toEqual([
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
  });

  it("shows a left out row with the count", async () => {
    const { page, click } = await generated();
    await click(await page(), "Delete Staff Engineer");
    const experience = card(await page(), /^Experience/);
    const details = tags(experience, "details");
    expect(details).toHaveLength(1);
    expect(details[0]?.attrs).not.toHaveProperty("open");
    expect(tags(details[0]?.html ?? "", "summary")[0]?.text).toBe("Left out (1)");
  });

  it("lists left out items with an add back button", async () => {
    const { page, click, doc, id } = await generated();
    await click(await page(), "Delete Staff Engineer");
    const experience = card(await page(), /^Experience/);
    const left = tags(experience, "details")[0]?.html ?? "";
    expect(decode(left)).toContain("Staff Engineer");
    expect(decode(left)).toContain("Globex");
    expect(gesture(button(left, /^Add back/))).toEqual({
      method: "POST",
      path: `/admin/resumes/${id}/left-out/${globex}`,
      fields: {},
    });
    const before = doc().items.length;
    const res = await click(left, /^Add back/);
    expect(res.status).toBe(200);
    const added = doc().items.at(-1);
    expect(doc().items).toHaveLength(before + 1);
    expect(added).toMatchObject({ title: "Staff Engineer", sourceId: globex });
    expect(added?.id).not.toBe(globex);
    expect(await res.text()).not.toContain("Left out");
  });

  it("hides the left out row when nothing is left out", async () => {
    const { page } = await generated();
    expect(await page()).not.toContain("Left out");
  });

  it("answers 400 and keeps the document for an item that is not left out", async () => {
    const { send, doc, id } = await generated();
    const before = structuredClone(doc());
    for (const itemId of [MISSING, globex]) {
      const res = await send({
        method: "POST",
        path: `/admin/resumes/${id}/left-out/${itemId}`,
        fields: {},
      });
      expect(res.status).toBe(400);
      expect(decode(await res.text())).toContain("That item is not left out");
    }
    expect(doc()).toEqual(before);
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

  it("put saves custom instructions and keeps them when not posted", async () => {
    const { put, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const res = await put(`/admin/resumes/${id}`, {
      customInstructions: " Lead with platform work ",
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Saved");
    expect(repo.rows[0]?.customInstructions).toBe("Lead with platform work");
    await put(`/admin/resumes/${id}`, { headerFields: "EMAIL" });
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
      const saved = await put(`/admin/resumes/${id}`, { customInstructions });
      expect(saved.status).toBe(400);
      expect(await saved.text()).toContain(message);
      const generated = await post(`/admin/resumes/${id}/generate`, { customInstructions });
      expect(generated.status).toBe(400);
      expect(await generated.text()).toContain(message);
    }
    expect(repo.rows[0]).toMatchObject({ structured: null, customInstructions: "" });
  });

  it("generate saves the posted custom instructions", async () => {
    const { post, resumes, repo, calls } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`, {
      customInstructions: " Write in Portuguese ",
    });
    expect(res.status).toBe(200);
    expect(repo.rows[0]?.customInstructions).toBe("Write in Portuguese");
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
    const tag = html.match(/<button[^>]*hx-post="[^"]*\/generate"[^>]*>/)?.[0] ?? "";
    expect(tag).toContain('hx-include="#custom-instructions"');
    expect(html.match(/id="custom-instructions"/g)).toHaveLength(1);
  });
});

describe("admin resumes create flow", () => {
  it("create generates from the library and redirects to the editor", async () => {
    const { post, repo, calls } = await resumeApp();
    const res = await post("/admin/resumes", newResume);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/admin/resumes/${repo.rows[0]?.id}`);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({
      title: "Backend at Acme",
      company: "Acme",
      model: "vendor/tailor",
      structured: { version: 2 },
    });
    expect(calls).toHaveLength(1);
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
    expect(repo.rows[0]).toMatchObject({ structured: null, model: null, headerFields: ["EMAIL"] });
  });

  it("keeps the resume and redirects with error empty-library when the library is empty", async () => {
    const { post, repo, calls } = await resumeApp({ items: [] });
    const res = await post("/admin/resumes", newResume);
    expect(res.status).toBe(303);
    expect(repo.rows).toHaveLength(1);
    expect(res.headers.get("location")).toBe(
      `/admin/resumes/${repo.rows[0]?.id}?error=empty-library`,
    );
    expect(repo.rows[0]).toMatchObject({ structured: null, model: null });
    expect(calls).toHaveLength(0);
  });

  it("keeps the resume and redirects with error full-name when the name is in the library", async () => {
    const { post, repo, calls } = await resumeApp({
      items: [item("honour", { title: "Ada Lovelace Award" })],
    });
    const res = await post("/admin/resumes", newResume);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/admin/resumes/${repo.rows[0]?.id}?error=full-name`);
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

  it("editor shows the message of each known error code", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const expected: Record<string, string> = {
      generate: "Generation failed, try again",
      "empty-library": "Add Career Items to your profile before generating",
      "full-name": "Your full name is in the career library — it is added when printed",
    };
    for (const [code, message] of Object.entries(expected)) {
      const html = await (await get(`/admin/resumes/${id}?error=${code}`)).text();
      expect(status(html)).toBe(`<span class="text-danger">${message}</span>`);
    }
  });

  it("editor shows no error text for an unknown error value", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    for (const value of ["nope", "<b>x</b>", "", "constructor", "__proto__", "master-cv"]) {
      const html = await (
        await get(`/admin/resumes/${id}?error=${encodeURIComponent(value)}`)
      ).text();
      expect(status(html)).toBe("");
    }
    const plain = await (await get(`/admin/resumes/${id}`)).text();
    expect(status(plain)).toBe("");
  });

  it("generate works on the editor opened after a failed create", async () => {
    const { post, get, repo, careerRepo } = await resumeApp({ items: [] });
    const created = await post("/admin/resumes", newResume);
    const location = created.headers.get("location") ?? "";
    expect(location).toContain("?error=empty-library");
    await careerRepo.update(async () => sampleLibrary());
    expect(await (await get(location)).text()).toContain("Add Career Items to your profile");
    const res = await post(`/admin/resumes/${repo.rows[0]?.id}/generate`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("BSc Computer Science");
    expect(repo.rows[0]).toMatchObject({ structured: { version: 2 }, model: "vendor/tailor" });
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
    for (const key of ["EMAIL", "PHONE"]) {
      expect(form).toMatch(
        new RegExp(
          `<input[^>]*type="checkbox"[^>]*name="headerFields"[^>]*value="${key}"[^>]*checked`,
        ),
      );
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

describe("admin resumes career routes", () => {
  it("shows the Header card closed with the name and headline and the cards of the document", async () => {
    const s = await generated();
    const html = await s.page();
    expect(html).toMatch(/<details class="career-card career-header">/);
    expect(html).toContain("Ada Lovelace · Backend engineer");
    expect(cards(html).map((c) => c.title.replace(/\d+$/, ""))).toEqual(["Experience", "Projects"]);
    expect(html).toContain('src="/admin/resumes/editor.js"');
  });

  it("add opens an empty form and saves the new item in the resume only", async () => {
    const s = await generated();
    const open = await s.click(await s.page(), /Add project$/);
    expect(open.status).toBe(200);
    const form = await open.text();
    expect(formFields(form)).toMatchObject({ kind: "project", title: "" });
    const saved = await s.submit(form, { title: "Side project", startYear: "2024" });
    expect(saved.status).toBe(200);
    const html = await saved.text();
    expect(html).toContain("Side project");
    expect(s.doc().items.at(-1)).toMatchObject({
      title: "Side project",
      kind: "project",
      sourceId: null,
    });
    expect((await s.career.library()).items).toHaveLength(sampleLibrary().items.length);
  });

  it("add answers 400 with the form kept open for a missing required field", async () => {
    const s = await generated();
    const before = s.doc().items.length;
    const form = await (await s.click(await s.page(), /Add project$/)).text();
    const res = await s.submit(form, { title: "", startYear: "2024" });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Project is required");
    expect(html).toContain("<form");
    expect(s.doc().items).toHaveLength(before);
  });

  it("edit opens the form with the values and saves them", async () => {
    const s = await generated();
    const form = await (await s.click(await s.page(), "Edit Staff Engineer")).text();
    expect(formFields(form)).toMatchObject({ title: "Staff Engineer", organisation: "Globex" });
    const saved = await s.submit(form, { title: "Principal Engineer" });
    expect(saved.status).toBe(200);
    expect(await saved.text()).toContain("Principal Engineer");
    expect(s.doc().items.find((i) => i.sourceId)?.title).toBe("Principal Engineer");
  });

  it("edit answers 400 with the entered values for a rejected change", async () => {
    const s = await generated();
    const form = await (await s.click(await s.page(), "Edit Staff Engineer")).text();
    const res = await s.submit(form, { title: "Staff Engineer", startYear: "1800" });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("out of range");
    expect(formFields(html).startYear).toBe("1800");
    expect(s.doc().items[0]?.startYear).toBe(2020);
  });

  it("edit answers 400 for a personal info value and for the full name", async () => {
    const s = await generated();
    await s.addField("EMAIL", "Email", "ada@example.com", 1);
    const form = await (await s.click(await s.page(), "Edit Staff Engineer")).text();
    const pii = await s.submit(form, { details: "mail ada@example.com" });
    expect(pii.status).toBe(400);
    expect(await pii.text()).toContain("Your Email is in the body");
    const name = await s.submit(form, { title: "Ada Lovelace Lead" });
    expect(name.status).toBe(400);
    expect(await name.text()).toContain("Your full name is in the resume");
  });

  it("move swaps the neighbours and disables the edges", async () => {
    const s = await generated();
    const html = await s.page();
    expect(button(html, "Move Staff Engineer up").attrs).toHaveProperty("disabled");
    const res = await s.click(html, "Move Staff Engineer down");
    expect(res.status).toBe(200);
    const experience = s.doc().items.filter((i) => i.kind === "experience");
    expect(experience.map((i) => i.title)).toEqual(["Engineer", "Staff Engineer"]);
  });

  it("move answers 400 for an unknown direction", async () => {
    const s = await generated();
    const target = s.doc().items[0]?.id;
    const res = await s.post(`/admin/resumes/${s.id}/items/${target}/move`, { direction: "left" });
    expect(res.status).toBe(400);
    expect(s.doc().items[0]?.id).toBe(target);
  });

  it("delete removes the item from the resume only", async () => {
    const s = await generated();
    const res = await s.click(await s.page(), "Delete Staff Engineer");
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("Delete Staff Engineer");
    expect(s.doc().items.some((i) => i.title === "Staff Engineer")).toBe(false);
    expect((await s.career.library()).items.some((i) => i.title === "Staff Engineer")).toBe(true);
  });

  it("item routes answer 404 for an unknown item and 400 before generation", async () => {
    const s = await generated();
    const base = `/admin/resumes/${s.id}/items`;
    expect((await s.get(`${base}/${MISSING}/edit`)).status).toBe(404);
    expect((await s.put(`${base}/${MISSING}`, { title: "x" })).status).toBe(404);
    expect((await s.post(`${base}/${MISSING}/move`, { direction: "up" })).status).toBe(404);
    expect((await s.del(`${base}/${MISSING}`)).status).toBe(404);
    expect((await s.get(`${base}/new?kind=nope`)).status).toBe(400);

    const bare = await s.resumes.create(newResume);
    const res = await s.post(`/admin/resumes/${bare.id}/items`, {
      kind: "project",
      title: "x",
      startYear: "2024",
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(NOT_GENERATED);
  });

  it("header save stores the headline and summary", async () => {
    const s = await generated();
    const res = await s.submitHeader(await s.page(), {
      headline: "Platform engineer",
      summary: "Fresh summary.",
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Platform engineer");
    expect(s.doc()).toMatchObject({ headline: "Platform engineer", summary: "Fresh summary." });
  });

  it("header save answers 400 with the form open and the entered values", async () => {
    const s = await generated();
    const res = await s.submitHeader(await s.page(), {
      headline: "h".repeat(201),
      summary: "Kept",
    });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("Headline is too long");
    expect(html).toMatch(/<details class="career-card career-header" open/);
    expect(formFields(html).summary).toBe("Kept");
    expect(s.doc().headline).toBe("Backend engineer");
  });

  it("header save rejects the full name and personal info", async () => {
    const s = await generated();
    await s.addField("EMAIL", "Email", "ada@example.com", 1);
    const name = await s.submitHeader(await s.page(), { summary: "By Ada Lovelace" });
    expect(name.status).toBe(400);
    const pii = await s.submitHeader(await s.page(), { summary: "ada@example.com" });
    expect(pii.status).toBe(400);
    expect(await pii.text()).toContain("Your Email is in the body");
  });

  it("header and item routes answer 400 before the resume is generated", async () => {
    const s = await resumeApp();
    const { id } = await s.resumes.create(newResume);
    const res = await s.put(`/admin/resumes/${id}/header`, { headline: "h", summary: "s" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(NOT_GENERATED);
  });

  it("every control swaps the whole career fragment", async () => {
    const s = await generated();
    const html = await s.page();
    expect(html).toContain(
      'id="career-library" class="career-cards" hx-target="#career-library" hx-swap="outerHTML"',
    );
    const list = await (await s.get(`/admin/resumes/${s.id}/items`)).text();
    expect(list.startsWith('<div id="career-library"')).toBe(true);
  });
});
