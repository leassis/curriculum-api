import { describe, expect, it } from "vitest";
import { slugify } from "../../../src/services/resume.service";
import {
  CV,
  FULL_NAME,
  failingFactory,
  JD,
  resumeSetup,
  TAILOR_PROMPT,
} from "../../support/resumes";

const MISSING = "00000000-0000-4000-8000-00000000ffff";
const draft = { title: "Backend at Acme", company: "Acme", jobDescription: JD };

describe("resume service", () => {
  it("rejects an empty title or job description naming the field and creates nothing", async () => {
    const { resumes, repo } = await resumeSetup();
    await expect(resumes.create({ ...draft, title: "  " })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Title"),
    });
    await expect(resumes.create({ ...draft, jobDescription: "" })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Job Description"),
    });
    expect(repo.inserts).toBe(0);
    const created = await resumes.create({ title: " T ", jobDescription: "jd", company: " " });
    expect(created).toMatchObject({ title: "T", company: null, content: "" });
  });

  it("answers not found for an unknown or malformed id", async () => {
    const { resumes } = await resumeSetup();
    for (const id of [MISSING, "not-a-uuid", ""]) {
      await expect(resumes.get(id)).rejects.toMatchObject({ status: 404 });
      await expect(resumes.delete(id)).rejects.toMatchObject({ status: 404 });
      await expect(resumes.generate(id)).rejects.toMatchObject({ status: 404 });
      await expect(resumes.save(id, "x", [])).rejects.toMatchObject({ status: 404 });
      await expect(resumes.printData(id)).rejects.toMatchObject({ status: 404 });
    }
  });

  it("calls the llm with area tailor, the tailor prompt, the master cv, the job description and 4000 tokens", async () => {
    const { resumes, calls } = await resumeSetup();
    const { id } = await resumes.create(draft);
    await resumes.generate(id);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.modelId).toBe("vendor/tailor");
    expect(calls[0]?.maxOutputTokens).toBe(4000);
    const prompt = calls[0]?.prompt ?? "";
    expect(prompt).toContain(TAILOR_PROMPT);
    expect(prompt).toContain(CV);
    expect(prompt).toContain(JD);
  });

  it("saves the generated markdown and the model id", async () => {
    const { resumes, repo } = await resumeSetup({ mock: { text: "# Body" } });
    const { id } = await resumes.create(draft);
    const saved = await resumes.generate(id);
    expect(saved).toMatchObject({ content: "# Body", model: "vendor/tailor" });
    expect(repo.rows[0]).toMatchObject({ content: "# Body", model: "vendor/tailor" });
  });

  it("keeps the content when the llm is unavailable", async () => {
    const { resumes, repo } = await resumeSetup({ factory: failingFactory });
    const { id } = await resumes.create(draft);
    await resumes.save(id, "my edits", []);
    await expect(resumes.generate(id)).rejects.toMatchObject({ code: "llm_unavailable" });
    expect(repo.rows[0]?.content).toBe("my edits");
    expect(repo.rows[0]?.model).toBeNull();
  });

  it("refuses to generate with an empty master cv and does not call the llm", async () => {
    for (const opts of [{ cv: "  " }, { seed: false }]) {
      const { resumes, calls } = await resumeSetup(opts);
      const { id } = await resumes.create(draft);
      await expect(resumes.generate(id)).rejects.toMatchObject({
        status: 400,
        message: "Fill the master CV first",
      });
      expect(calls).toHaveLength(0);
    }
  });

  it("refuses to save content containing a personal info value", async () => {
    const { resumes, repo, addField } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com");
    const { id } = await resumes.create(draft);
    await expect(resumes.save(id, "Write to ada@example.com", ["EMAIL"])).rejects.toMatchObject({
      status: 400,
      message: "Your Email is in the body — keep contact data in Personal info",
    });
    expect(repo.rows[0]?.content).toBe("");
  });

  it("stores null when every field is selected and drops unknown keys", async () => {
    const { resumes, repo, addField } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com");
    await addField("PHONE", "Phone", "+44 20 7946 0958");
    const { id } = await resumes.create(draft);
    await resumes.save(id, "body", ["EMAIL", "PHONE", "GONE"]);
    expect(repo.rows[0]?.headerFields).toBeNull();
    await resumes.save(id, "body", ["EMAIL", "GONE"]);
    expect(repo.rows[0]?.headerFields).toEqual(["EMAIL"]);
    await resumes.save(id, "body", []);
    expect(repo.rows[0]?.headerFields).toEqual([]);
  });

  it("builds the print header from the selected fields in sort order", async () => {
    const { resumes, addField } = await resumeSetup();
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("CITY", "City", "London", 3);
    const { id } = await resumes.create(draft);
    expect((await resumes.printData(id)).header.map((h) => h.key)).toEqual([
      "EMAIL",
      "PHONE",
      "CITY",
    ]);
    await resumes.save(id, "## Body", ["CITY", "EMAIL"]);
    const data = await resumes.printData(id);
    expect(data.header.map((h) => h.key)).toEqual(["EMAIL", "CITY"]);
    expect(data.fullName).toBe(FULL_NAME);
    expect(data.bodyHtml).toContain("<h2>Body</h2>");
    expect(data.pageSize).toBe("A4");
  });

  it("skips a header field that no longer exists", async () => {
    const { resumes, repo, addField, personalInfo } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const { id } = await resumes.create(draft);
    await resumes.save(id, "body", ["EMAIL"]);
    expect(repo.rows[0]?.headerFields).toEqual(["EMAIL"]);
    await personalInfo.delete("EMAIL");
    expect((await resumes.printData(id)).header).toEqual([]);
    expect((await resumes.download(id)).text).not.toContain("Email");
  });

  it("builds the download text with name, header lines and content", async () => {
    const { resumes, addField } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const { id } = await resumes.create(draft);
    await resumes.save(id, "## Body\n\ntext", ["EMAIL", "PHONE"]);
    const { text, filename } = await resumes.download(id);
    expect(text).toBe(
      `# ${FULL_NAME}\nEmail: ada@example.com\nPhone: +44 20 7946 0958\n\n## Body\n\ntext`,
    );
    expect(filename).toBe("backend-at-acme.md");
  });

  it("slugs the title for the download filename", () => {
    expect(slugify("Sênior Backend / Acme, Inc.!")).toBe("senior-backend-acme-inc");
    expect(slugify("  ../etc/passwd  ")).toBe("etc-passwd");
    expect(slugify("日本語")).toBe("resume");
  });
});

describe("resume service pii", () => {
  it("sends no personal info value or full name to the model", async () => {
    const { resumes, calls, addField } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    await addField("CITY", "City", "London", 3);
    const a = await resumes.create({ ...draft, jobDescription: `${JD} Write to ada@example.com` });
    await resumes.generate(a.id);
    const b = await resumes.create(draft);
    await resumes.generate(b.id);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      for (const secret of ["ada@example.com", "+44 20 7946 0958", "London", FULL_NAME, "Ada"]) {
        expect(call.prompt).not.toContain(secret);
      }
    }
  });
});

describe("resume service custom instructions", () => {
  it("stores the trimmed custom instructions on create and empty when absent", async () => {
    const { resumes, repo } = await resumeSetup();
    const withText = await resumes.create({ ...draft, customInstructions: "  One page  \n" });
    expect(withText.customInstructions).toBe("One page");
    expect(repo.rows[0]?.customInstructions).toBe("One page");
    const without = await resumes.create(draft);
    expect(without.customInstructions).toBe("");
  });

  it("saves the trimmed custom instructions with content and header fields", async () => {
    const { resumes, repo, addField } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com");
    const { id } = await resumes.create(draft);
    const saved = await resumes.save(id, "# Body", ["EMAIL"], "  Lead with platform work ");
    expect(saved).toMatchObject({
      content: "# Body",
      headerFields: null,
      customInstructions: "Lead with platform work",
    });
    expect(repo.rows[0]?.customInstructions).toBe("Lead with platform work");
  });

  it("stores whitespace-only custom instructions as empty", async () => {
    const { resumes, repo } = await resumeSetup();
    const created = await resumes.create({ ...draft, customInstructions: " \n\t " });
    expect(created.customInstructions).toBe("");
    await resumes.save(created.id, "body", [], "keep");
    expect(repo.rows[0]?.customInstructions).toBe("keep");
    await resumes.save(created.id, "body", [], "   ");
    expect(repo.rows[0]?.customInstructions).toBe("");
  });

  it("accepts 2000 characters and rejects 2001 on create, save and generate without changes", async () => {
    const { resumes, repo, calls } = await resumeSetup();
    const message = "Custom instructions must be at most 2000 characters";
    const max = "a".repeat(2000);
    const tooLong = "a".repeat(2001);
    const created = await resumes.create({ ...draft, customInstructions: ` ${max} ` });
    expect(created.customInstructions).toBe(max);
    const { id } = created;
    await expect(resumes.save(id, "x", [], max)).resolves.toMatchObject({
      customInstructions: max,
    });

    await expect(resumes.create({ ...draft, customInstructions: tooLong })).rejects.toMatchObject({
      status: 400,
      message,
    });
    expect(repo.rows).toHaveLength(1);

    await resumes.save(id, "before", [], "kept");
    await expect(resumes.save(id, "after", [], tooLong)).rejects.toMatchObject({
      status: 400,
      message,
    });
    await expect(resumes.generate(id, tooLong)).rejects.toMatchObject({ status: 400, message });
    expect(repo.rows[0]).toMatchObject({ content: "before", customInstructions: "kept" });
    expect(calls).toHaveLength(0);
  });

  it("rejects a personal info value on create, save and generate without calling the llm", async () => {
    const { resumes, repo, calls, addField } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com");
    const message = "Your Email is in the custom instructions — keep contact data in Personal info";
    const leak = "Reach me at ada@example.com";
    await expect(resumes.create({ ...draft, customInstructions: leak })).rejects.toMatchObject({
      status: 400,
      message,
    });
    expect(repo.rows).toHaveLength(0);

    const { id } = await resumes.create({ ...draft, customInstructions: "kept" });
    await resumes.save(id, "before", [], "kept");
    await expect(resumes.save(id, "after", [], leak)).rejects.toMatchObject({
      status: 400,
      message,
    });
    await expect(resumes.generate(id, leak)).rejects.toMatchObject({ status: 400, message });
    expect(repo.rows[0]).toMatchObject({ content: "before", customInstructions: "kept" });
    expect(calls).toHaveLength(0);
  });
});
