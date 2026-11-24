import { describe, expect, it } from "vitest";
import type { ResumeDocument } from "../../../src/services/tailor/document";
import { sampleDocumentV2 } from "../../support/career";
import type { FakeResumeRepo } from "../../support/resume.fake";
import { FULL_NAME, resumeApp } from "../../support/resumes";

const setDocument = (repo: FakeResumeRepo, doc: ResumeDocument) => {
  const row = repo.rows[0];
  if (row) row.structured = doc;
};

const withBody = (summary: string, headline = ""): ResumeDocument => ({
  version: 2,
  headline,
  summary,
  items: [],
});

async function withResume(opts: Parameters<typeof resumeApp>[0] = {}) {
  const setup = await resumeApp(opts);
  await setup.addField("PHONE", "Phone", "+44 20 7946 0958", 2);
  await setup.addField("EMAIL", "Email", "ada@example.com", 1);
  await setup.addField("CITY", "City", "London", 3);
  const { id } = await setup.resumes.create({
    title: "Backend / Acme",
    jobDescription: "jd",
  });
  return { ...setup, id };
}

describe("admin print", () => {
  it("prints the name, the selected header fields in order and the sanitized body", async () => {
    const { get, resumes, repo, id } = await withResume();
    await resumes.updateOptions(id, ["EMAIL", "PHONE"]);
    setDocument(repo, {
      version: 2,
      headline: "",
      summary: "<script>alert(1)</script>**Built** things",
      items: [
        {
          ...(sampleDocumentV2().items[0] as ResumeDocument["items"][number]),
          title: "Lead",
          text: "Did it",
          bullets: [],
        },
      ],
    });
    const res = await get(`/admin/resumes/${id}/print`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<h1>${FULL_NAME}</h1>`);
    expect(html.indexOf("Email: ada@example.com")).toBeGreaterThan(-1);
    expect(html.indexOf("Email: ada@example.com")).toBeLessThan(html.indexOf("Phone: +44"));
    expect(html).not.toContain("City: London");
    expect(html).toContain("<h2>Experience</h2>");
    expect(html).toContain("<h3>Lead</h3>");
    expect(html).toContain("<strong>Built</strong>");
    expect(html).not.toContain("<script>alert");
    const h1 = html.indexOf("<h1>");
    expect(html.indexOf("Email: ada")).toBeGreaterThan(h1);
    expect(html.indexOf("<h2>Experience")).toBeGreaterThan(html.indexOf("Phone: +44"));
  });

  it("prints all fields when header fields are null", async () => {
    const { get, id } = await withResume();
    const html = await (await get(`/admin/resumes/${id}/print`)).text();
    for (const line of ["Email: ada@example.com", "Phone: +44 20 7946 0958", "City: London"]) {
      expect(html).toContain(line);
    }
  });

  it("prints the career library with all personal info fields", async () => {
    const { get } = await withResume();
    const res = await get("/admin/profile/print");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<h1>${FULL_NAME}</h1>`);
    for (const line of ["Email: ada@example.com", "Phone: +44 20 7946 0958", "City: London"]) {
      expect(html).toContain(line);
    }
    expect(html).toContain("Ten years building payment systems.");
    expect(html).toContain("<h2>Experience</h2>");
    expect(html).toContain("<h3>Staff Engineer</h3>");
    expect(html).toContain("<h2>Education</h2>");
  });

  it("sends no-store and noindex and never calls the llm", async () => {
    const { get, id, calls } = await withResume();
    for (const path of [`/admin/resumes/${id}/print`, "/admin/profile/print"]) {
      const res = await get(path);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-robots-tag")).toBe("noindex");
    }
    expect(calls).toHaveLength(0);
  });

  it("sets the page size to A4 and to Letter with the override", async () => {
    const { get, id, settingsRepo } = await withResume();
    const css = async () => {
      const html = await (await get(`/admin/resumes/${id}/print`)).text();
      return html.match(/@page \{[^}]*\}/)?.[0];
    };
    expect(await css()).toBe("@page { size: A4; margin: 16mm 18mm; }");
    settingsRepo.rows["print.pageSize"] = "Letter";
    expect(await css()).toBe("@page { size: Letter; margin: 16mm 18mm; }");
    const profile = await (await get("/admin/profile/print")).text();
    expect(profile).toContain("@page { size: Letter; margin: 16mm 18mm; }");
  });

  it("uses no table, hides the print button in print and loads its script from self", async () => {
    const { get, id } = await withResume();
    const html = await (await get(`/admin/resumes/${id}/print`)).text();
    expect(html).not.toMatch(/<table|<img|onclick=/i);
    expect(html).toContain("Print / Save as PDF");
    expect(html).toMatch(/@media print \{[^}]*\.screen-only \{ display: none/);
    expect(html).toMatch(/class="screen-only"[^>]*>\s*<button id="print-button"/);
    expect(html).toContain('src="/admin/print/print.js"');
    const js = await get("/admin/print/print.js");
    expect(js.status).toBe(200);
    expect(await js.text()).toContain("window.print()");
  });

  it("warns on screen when the body contains a personal info value", async () => {
    const { get, repo, id } = await withResume();
    // Saved before the value existed in Personal info, so only the print guard sees it.
    setDocument(repo, withBody("Mail me at ada@example.com"));
    const html = await (await get(`/admin/resumes/${id}/print`)).text();
    expect(html).toMatch(/class="screen-only banner" role="alert"/);
    expect(html).toContain("Email");
    expect(html).not.toMatch(/class="screen-only banner"[^>]*>[^<]*ada@example\.com/);
    const clean = await resumeApp();
    const { id: otherId } = await clean.resumes.create({ title: "x", jobDescription: "jd" });
    expect(await (await clean.get(`/admin/resumes/${otherId}/print`)).text()).not.toContain(
      'role="alert"',
    );
  });

  it("shows This resume is empty for an empty content", async () => {
    const { get, id } = await withResume();
    const html = await (await get(`/admin/resumes/${id}/print`)).text();
    expect(html).toContain("This resume is empty");
    expect(html).toContain(`<h1>${FULL_NAME}</h1>`);
    expect(html).toContain("Email: ada@example.com");
  });

  it("downloads markdown with the attachment filename and header lines", async () => {
    const { get, resumes, repo, id } = await withResume();
    await resumes.updateOptions(id, ["EMAIL"]);
    setDocument(repo, withBody("Body", "Engineer"));
    const res = await get(`/admin/resumes/${id}/download.md`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="backend-acme.md"');
    expect(await res.text()).toBe(`# ${FULL_NAME}\nEmail: ada@example.com\n\nEngineer\n\nBody`);
  });

  it("keeps profile texts out of print and download", async () => {
    const setup = await withResume();
    const { get, resumes, repo, profile, id } = setup;
    const additional = "Plays competitive chess on weekends.";
    const next = "Staff platform roles in fintech.";
    await profile.update({
      ...(await profile.get()),
      additionalInformation: additional,
      lookingForwardNext: next,
    });
    await resumes.generate(id);
    expect(repo.rows[0]?.structured).not.toBeNull();
    const stored = JSON.stringify(repo.rows[0]?.structured);
    const outputs = [
      stored,
      await (await get(`/admin/resumes/${id}/print`)).text(),
      await (await get(`/admin/resumes/${id}/download.md`)).text(),
      await (await get("/admin/profile/print")).text(),
    ];
    expect(outputs[1]).toContain("<h2>Experience</h2>");
    for (const out of outputs) {
      for (const secret of [additional, next, "Additional information", "Looking forward next"]) {
        expect(out).not.toContain(secret);
      }
    }
  });

  it("keeps tracking fields out of print and download", async () => {
    const { get, resumes, repo } = await withResume();
    const tracking = {
      jobLink: "https://jobs.example.com/acme/77",
      recruiterName: "Morgan Hiring",
      notes: "Second interview on Friday",
    };
    const { id } = await resumes.create({ title: "Tracked", jobDescription: "jd", ...tracking });
    await resumes.generate(id);
    expect(repo.rows.find((r) => r.id === id)).toMatchObject(tracking);
    const outputs = [
      await (await get(`/admin/resumes/${id}/print`)).text(),
      await (await get(`/admin/resumes/${id}/download.md`)).text(),
      await (await get("/admin/profile/print")).text(),
    ];
    expect(outputs[0]).toContain("<h2>Experience</h2>");
    for (const out of outputs) {
      for (const secret of Object.values(tracking)) expect(out).not.toContain(secret);
      expect(out).not.toContain("jobs.example.com");
    }
  });
});
