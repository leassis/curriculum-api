import { describe, expect, it } from "vitest";
import { button, decode, formFields, gesture, tags } from "../../support/html";
import { resumeApp } from "../../support/resumes";

const newResume = { title: "Backend at Acme", company: "Acme", jobDescription: "Build things" };
const SHORT = "- Senior backend engineer\n- Postgres & <TypeScript>";

const resumeForm = (html: string) => {
  const form = tags(html, "form").find((f) => f.attrs.id === "resume-form");
  if (!form) throw new Error("no resume form");
  return form;
};

describe("resume editor", () => {
  it("shows the short job description textarea after the job description", async () => {
    const { get, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);

    const empty = await (await get(`/admin/resumes/${id}`)).text();
    const emptyForm = resumeForm(empty);
    const label = tags(emptyForm.html, "label").find(
      (l) => l.attrs.for === "job-description-short",
    );
    expect(label?.text).toBe("Short Job Description (max 2000 characters)");
    expect(formFields(emptyForm.html).jobDescriptionShort).toBe("");

    await resumes.updateOptions(id, [], undefined, { jobDescriptionShort: SHORT });
    expect(repo.rows[0]?.jobDescriptionShort).toBe(SHORT);
    const filled = await (await get(`/admin/resumes/${id}`)).text();
    expect(formFields(resumeForm(filled).html).jobDescriptionShort).toBe(SHORT);
    expect(filled).not.toContain("<TypeScript>");
    expect(decode(filled)).toContain("<TypeScript>");

    const disclosure = filled.indexOf("<summary>Job Description</summary>");
    const textarea = filled.indexOf('name="jobDescriptionShort"');
    expect(disclosure).toBeGreaterThan(-1);
    expect(textarea).toBeGreaterThan(disclosure);
  });
});

describe("PUT /admin/resumes/:id", () => {
  it("saves the short job description", async () => {
    const { get, put, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    const form = resumeForm(html);
    const save = gesture(button(html, "Save options"));

    const res = await put(save.path, {
      ...formFields(form.html),
      jobDescriptionShort: `  ${SHORT}  `,
    });
    expect(res.status).toBe(200);
    expect(repo.rows[0]?.jobDescriptionShort).toBe(SHORT);

    const reloaded = await (await get(`/admin/resumes/${id}`)).text();
    expect(formFields(resumeForm(reloaded).html).jobDescriptionShort).toBe(SHORT);

    await put(save.path, { ...formFields(form.html), jobDescriptionShort: "   " });
    expect(repo.rows[0]?.jobDescriptionShort).toBeNull();
  });

  it("saves the company", async () => {
    const { get, put, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    const html = await (await get(`/admin/resumes/${id}`)).text();
    const form = resumeForm(html);
    const save = gesture(button(html, "Save options"));

    const res = await put(save.path, { ...formFields(form.html), company: "  Globex  " });
    expect(res.status).toBe(200);
    expect(repo.rows[0]?.company).toBe("Globex");

    const reloaded = await (await get(`/admin/resumes/${id}`)).text();
    expect(formFields(resumeForm(reloaded).html).company).toBe("Globex");
  });

  it("rejects a short job description over 2000 characters", async () => {
    const { put, resumes, repo } = await resumeApp();
    const { id } = await resumes.create(newResume);
    await resumes.updateOptions(id, [], undefined, { jobDescriptionShort: SHORT });

    const ok = await put(`/admin/resumes/${id}`, { jobDescriptionShort: "x".repeat(2000) });
    expect(ok.status).toBe(200);

    const res = await put(`/admin/resumes/${id}`, { jobDescriptionShort: "y".repeat(2001) });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("2000");
    expect(repo.rows[0]?.jobDescriptionShort).toBe("x".repeat(2000));
  });
});

describe("resume print and download", () => {
  it("leave out the short job description", async () => {
    const { get, resumes } = await resumeApp();
    const { id } = await resumes.create(newResume);
    await resumes.generate(id);
    await resumes.updateOptions(id, [], undefined, { jobDescriptionShort: "- Marker-line-7731" });

    const print = await (await get(`/admin/resumes/${id}/print`)).text();
    const download = await get(`/admin/resumes/${id}/download.md`);
    expect(download.status).toBe(200);
    expect(print).not.toContain("Marker-line-7731");
    expect(await download.text()).not.toContain("Marker-line-7731");
  });
});
