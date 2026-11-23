import { describe, expect, it } from "vitest";
import { failingFactory, resumeApp } from "../../support/resumes";

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
      content: "# Tailored body",
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
    await resumes.save(id, "## Hello", ["EMAIL"]);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    expect(html).toContain("Backend at Acme");
    expect(html).toContain("Acme");
    expect(html).toContain("Needs &lt;Rust&gt;");
    expect(html).toMatch(/<textarea[^>]*name="content"[^>]*>## Hello<\/textarea>/);
    expect(html).toMatch(/<input[^>]*name="headerFields"[^>]*value="EMAIL"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*value="PHONE"[^>]*checked/);
    for (const label of ["Generate", "Save", "Print", "Download .md"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(`href="/admin/resumes/${id}/download.md"`);
    expect(html).toContain("<h2>Hello</h2>");
  });

  it("generate returns the editor fragment with the new content", async () => {
    const { post, resumes, repo } = await resumeApp({ mock: { text: "## Fresh <b>body</b>" } });
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.startsWith('<div id="editor">')).toBe(true);
    expect(html).not.toContain("<html");
    expect(html).toContain("## Fresh &lt;b&gt;body&lt;/b&gt;</textarea>");
    expect(repo.rows[0]).toMatchObject({ content: "## Fresh <b>body</b>", model: "vendor/tailor" });
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
    await resumes.save(id, "edited", []);
    const filled = await (await get(`/admin/resumes/${id}`)).text();
    expect(button(filled)).toContain('hx-confirm="Replace the current content?"');
  });

  it("generate answers 502 with the failure text and keeps the content", async () => {
    const { post, resumes, repo } = await resumeApp({ factory: failingFactory });
    const { id } = await resumes.create(newResume);
    await resumes.save(id, "my edits", []);
    const res = await post(`/admin/resumes/${id}/generate`);
    expect(res.status).toBe(502);
    expect(await res.text()).toContain("Generation failed, try again");
    expect(repo.rows[0]?.content).toBe("my edits");
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
    const res = await put(`/admin/resumes/${id}`, { content: "# Mine", headerFields: ["PHONE"] });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Saved");
    expect(repo.rows[0]).toMatchObject({ content: "# Mine", headerFields: ["PHONE"] });
    await put(`/admin/resumes/${id}`, { content: "# Mine", headerFields: ["EMAIL", "PHONE"] });
    expect(repo.rows[0]?.headerFields).toBeNull();
  });

  it("refuses to save content with a personal info value", async () => {
    const { put, resumes, repo, addField } = await resumeApp();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    const { id } = await resumes.create(newResume);
    const res = await put(`/admin/resumes/${id}`, { content: "mail ada@example.com" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(
      "Your Email is in the body — keep contact data in Personal info",
    );
    expect(repo.rows[0]?.content).toBe("");
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
      content: "# Mine",
      customInstructions: " Lead with platform work ",
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Saved");
    expect(repo.rows[0]).toMatchObject({
      content: "# Mine",
      customInstructions: "Lead with platform work",
    });
    await put(`/admin/resumes/${id}`, { content: "# Again" });
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
    const { post, resumes, repo, calls } = await resumeApp({ mock: { text: "## Fresh" } });
    const { id } = await resumes.create(newResume);
    const res = await post(`/admin/resumes/${id}/generate`, {
      customInstructions: " Write in Portuguese ",
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.startsWith('<div id="editor">')).toBe(true);
    expect(repo.rows[0]).toMatchObject({
      content: "## Fresh",
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
    expect(repo.rows[0]).toMatchObject({ content: "# Tailored body", model: "vendor/tailor" });
    expect(calls).toHaveLength(1);
  });

  it("editor after create holds the generated content", async () => {
    const { post, get, repo } = await resumeApp({ mock: { text: "## Fresh <b>body</b>" } });
    const res = await post("/admin/resumes", newResume);
    const html = await (await get(res.headers.get("location") ?? "")).text();
    expect(html).toContain("## Fresh &lt;b&gt;body&lt;/b&gt;</textarea>");
    expect(html).toContain("<h2>Fresh &lt;b&gt;body&lt;/b&gt;</h2>");
    expect(repo.rows[0]?.content).toBe("## Fresh <b>body</b>");
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
      expect(await res.text()).toContain(message);
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
});
