import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { decode, tags, voidTags } from "../../support/html";
import { recruiterApp } from "../../support/recruiter-chat";

const A = "00000000-0000-4000-8000-0000000000a1";
const B = "00000000-0000-4000-8000-0000000000b2";
const NONE = "00000000-0000-4000-8000-0000000000c3";
const MISSING = "00000000-0000-4000-8000-00000000ffff";
const OWN = "My own text";

const NOT_FILLED = "Not filled: the field has your own text.";
const NO_SHORT = "This resume has no short description yet. Regenerate it to get one.";

async function autofillApp() {
  const s = await recruiterApp();
  s.repo.resumes.set(A, { title: "A", company: "Acme", jobDescriptionShort: "- Short of A" });
  s.repo.resumes.set(B, { title: "B", company: "Globex", jobDescriptionShort: "- Short of B" });
  s.repo.resumes.set(NONE, { title: "None" });
  const admin = await signSession({ scope: "admin" }, s.config.sessionSecret, 60);
  const post = (path: string, fields: Record<string, string>) =>
    s.app.request(path, {
      method: "POST",
      headers: {
        cookie: `curr_admin=${admin}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields).toString(),
    });
  const pick = async (fields: Record<string, string>) => {
    const res = await post("/admin/chats/autofill", fields);
    const html = await res.text();
    const inputs = voidTags(html, "input");
    const value = (name: string) => inputs.find((i) => i.attrs.name === name)?.attrs.value;
    const notice = (id: string) =>
      tags(html, "div").find((d) => d.attrs["hx-swap-oob"] === `innerHTML:#${id}`);
    const area = tags(html, "textarea").find((t) => t.attrs.name === "jobDescriptionShort");
    return {
      status: res.status,
      html,
      jd: decode(area?.html.replace(/^<[^>]*>|<\/textarea>$/g, "") ?? ""),
      company: value("company"),
      lastJd: value("lastJobDescriptionShort"),
      lastCompany: value("lastCompany"),
      jdNotice: decode(notice("jd-notice")?.text ?? ""),
      companyNotice: decode(notice("company-notice")?.text ?? ""),
    };
  };
  return { ...s, post, pick };
}

describe("POST /admin/chats/autofill", () => {
  it("fills an empty job description", async () => {
    const { pick } = await autofillApp();
    const r = await pick({ tailoredResumeId: A, jobDescriptionShort: "", company: "" });
    expect(r.status).toBe(200);
    expect(r.jd).toBe("- Short of A");
    expect(r.lastJd).toBe("- Short of A");
    expect(r.jdNotice).toBe("");
  });

  it("replaces the last autofilled job description", async () => {
    const { pick } = await autofillApp();
    const first = await pick({ tailoredResumeId: A, jobDescriptionShort: "", company: "" });
    const second = await pick({
      tailoredResumeId: B,
      jobDescriptionShort: first.jd,
      company: first.company ?? "",
      lastJobDescriptionShort: first.lastJd ?? "",
      lastCompany: first.lastCompany ?? "",
    });
    expect(second.jd).toBe("- Short of B");
    expect(second.lastJd).toBe("- Short of B");
    expect(second.jdNotice).toBe("");
  });

  it("keeps owner text and shows the not filled notice", async () => {
    const { pick } = await autofillApp();
    const r = await pick({
      tailoredResumeId: A,
      jobDescriptionShort: OWN,
      company: "",
      lastJobDescriptionShort: "- Short of B",
    });
    expect(r.jd).toBe(OWN);
    expect(r.lastJd).toBe("- Short of B");
    expect(r.jdNotice).toContain(NOT_FILLED);
    expect(r.jdNotice).toContain("Replace");
    expect(r.html).toContain("jobDescriptionShort");
  });

  it("replace fills the field and clears the notice", async () => {
    const { pick } = await autofillApp();
    const r = await pick({
      tailoredResumeId: A,
      jobDescriptionShort: OWN,
      company: "Mine",
      lastJobDescriptionShort: "- Short of B",
      lastCompany: "Globex",
      replace: "jobDescriptionShort",
    });
    expect(r.jd).toBe("- Short of A");
    expect(r.lastJd).toBe("- Short of A");
    expect(r.jdNotice).toBe("");
    // the other field is not replaced by this press
    expect(r.company).toBe("Mine");
    expect(r.companyNotice).toContain(NOT_FILLED);
  });

  it("shows the no short description notice", async () => {
    const { pick } = await autofillApp();
    const r = await pick({
      tailoredResumeId: NONE,
      jobDescriptionShort: OWN,
      company: "",
      lastJobDescriptionShort: "- Short of B",
    });
    expect(r.jd).toBe(OWN);
    expect(r.lastJd).toBe("- Short of B");
    expect(r.jdNotice).toBe(NO_SHORT);
    expect(r.jdNotice).not.toContain("Replace");
  });

  it("applies the rule to company", async () => {
    const { pick } = await autofillApp();
    const filled = await pick({ tailoredResumeId: A, jobDescriptionShort: "", company: "" });
    expect(filled.company).toBe("Acme");
    expect(filled.lastCompany).toBe("Acme");
    expect(filled.companyNotice).toBe("");

    const swapped = await pick({
      tailoredResumeId: B,
      jobDescriptionShort: "",
      company: "Acme",
      lastCompany: "Acme",
    });
    expect(swapped.company).toBe("Globex");

    const kept = await pick({
      tailoredResumeId: A,
      jobDescriptionShort: "",
      company: "Initech",
      lastCompany: "Globex",
    });
    expect(kept.company).toBe("Initech");
    expect(kept.lastCompany).toBe("Globex");
    expect(kept.companyNotice).toContain(NOT_FILLED);
    expect(kept.companyNotice).toContain("Replace");

    const replaced = await pick({
      tailoredResumeId: A,
      jobDescriptionShort: "",
      company: "Initech",
      lastCompany: "Globex",
      replace: "company",
    });
    expect(replaced.company).toBe("Acme");
    expect(replaced.companyNotice).toBe("");

    const noCompany = await pick({
      tailoredResumeId: NONE,
      jobDescriptionShort: "",
      company: "Initech",
    });
    expect(noCompany.company).toBe("Initech");
    expect(noCompany.companyNotice).toBe("");
  });

  it("master cv keeps fields and clears notices", async () => {
    const { pick } = await autofillApp();
    const r = await pick({
      tailoredResumeId: "",
      jobDescriptionShort: OWN,
      company: "Mine",
      lastJobDescriptionShort: "- Short of A",
      lastCompany: "Acme",
    });
    expect(r.status).toBe(200);
    expect(r.jd).toBe(OWN);
    expect(r.company).toBe("Mine");
    expect(r.lastJd).toBe("- Short of A");
    expect(r.lastCompany).toBe("Acme");
    expect(r.jdNotice).toBe("");
    expect(r.companyNotice).toBe("");
  });

  it("shows tailored resume not found for an unknown resume", async () => {
    const { pick } = await autofillApp();
    for (const id of [MISSING, "not-a-uuid"]) {
      const r = await pick({ tailoredResumeId: id, jobDescriptionShort: OWN, company: "Mine" });
      expect(r.status).toBe(200);
      expect(r.jd).toBe(OWN);
      expect(r.company).toBe("Mine");
      expect(r.jdNotice).toBe("Tailored Resume not found");
      expect(r.companyNotice).toBe("");
    }
  });
});

describe("POST /admin/chats", () => {
  it("stores a snapshot of the job description", async () => {
    const { pick, post, repo } = await autofillApp();
    const filled = await pick({ tailoredResumeId: A, jobDescriptionShort: "", company: "" });
    const res = await post("/admin/chats", {
      recruiterName: "Jane Roe",
      company: filled.company ?? "",
      jobDescriptionShort: filled.jd,
      lastJobDescriptionShort: filled.lastJd ?? "",
      lastCompany: filled.lastCompany ?? "",
      maxQuestions: "10",
      tailoredResumeId: A,
    });
    expect(res.status).toBe(200);
    expect(repo.rows[0]).toMatchObject({ jobDescriptionShort: "- Short of A", company: "Acme" });

    repo.resumes.set(A, { title: "A", company: "Changed", jobDescriptionShort: "- Rewritten" });
    expect(repo.rows[0]).toMatchObject({ jobDescriptionShort: "- Short of A", company: "Acme" });
    const again = await pick({ tailoredResumeId: A, jobDescriptionShort: "", company: "" });
    expect(again.jd).toBe("- Rewritten");
    expect(repo.rows[0]?.jobDescriptionShort).toBe("- Short of A");
  });
});
