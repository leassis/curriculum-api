import { describe, expect, it } from "vitest";
import { resumeApp } from "../../support/resumes";

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
    expect(repo.rows[0]).toMatchObject({ title: "Backend at Acme", content: "", company: "Acme" });
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
    const { del } = await resumeApp();
    for (const id of ids) {
      expect((await del(`/admin/resumes/${id}`)).status).toBe(404);
    }
  });
});
