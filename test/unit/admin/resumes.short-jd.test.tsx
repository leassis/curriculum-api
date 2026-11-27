import { describe, expect, it } from "vitest";
import { decode, formFields, tags } from "../../support/html";
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
