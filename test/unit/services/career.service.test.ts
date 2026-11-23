import { describe, expect, it } from "vitest";
import { IMPORT_PROMPT } from "../../../src/llm/import-prompt";
import type { CareerLibrary } from "../../../src/services/career/item";
import { renderItemsMarkdown } from "../../../src/services/career/markdown";
import { LlmUnavailableError } from "../../../src/services/errors";
import { item, SAMPLE_IDS, sampleLibrary } from "../../support/career";
import { SAMPLE_MARKDOWN } from "../../support/career-markdown";
import { careerSetup, FULL_NAME } from "../../support/career-service";

const experience = { title: "Engineer", organisation: "Acme", startYear: "2020" };

describe("career service", () => {
  it("adds a valid item and stores it at the end", async () => {
    const { career, repo } = careerSetup({ items: sampleLibrary().items });
    const added = await career.add("experience", { ...experience, details: "Built it.\n- Fast" });
    expect(added).toMatchObject({
      kind: "experience",
      title: "Engineer",
      organisation: "Acme",
      startYear: 2020,
      text: "Built it.",
      bullets: ["Fast"],
    });
    const stored = (repo.document as CareerLibrary).items;
    expect(stored.at(-1)).toEqual(added);
    expect(stored).toHaveLength(sampleLibrary().items.length + 1);
    expect(await career.library()).toEqual(repo.document);
  });

  it("edits an item keeping its id and position", async () => {
    const [first, second] = [item("experience"), item("experience", { title: "Other" })];
    const { career, repo } = careerSetup({ items: [first, second] });
    const edited = await career.edit(first.id, { ...experience, title: "Staff Engineer" });
    expect(edited).toMatchObject({ id: first.id, title: "Staff Engineer" });
    expect((repo.document as CareerLibrary).items.map((i) => i.title)).toEqual([
      "Staff Engineer",
      "Other",
    ]);
  });

  it("moves an item past its neighbour of the same kind and stores the order", async () => {
    const [a, b] = [item("experience", { title: "A" }), item("experience", { title: "B" })];
    const { career, repo } = careerSetup({ items: [a, item("education"), b] });
    await career.move(a.id, "down");
    expect((repo.document as CareerLibrary).items.map((i) => i.title)).toEqual([
      "B",
      "BSc Computer Science",
      "A",
    ]);
  });

  it("removes an item", async () => {
    const [a, b] = [item("experience"), item("education")];
    const { career, repo } = careerSetup({ items: [a, b] });
    await career.remove(a.id);
    expect((repo.document as CareerLibrary).items).toEqual([b]);
  });

  it("answers not found for an unknown id and stores nothing", async () => {
    const { career, repo } = careerSetup({ items: [item("experience")] });
    const missing = "00000000-0000-4000-8000-000000000000";
    for (const call of [
      () => career.edit(missing, experience),
      () => career.move(missing, "up"),
      () => career.remove(missing),
    ]) {
      await expect(call()).rejects.toMatchObject({ status: 404 });
    }
    expect(repo.writes).toBe(0);
  });

  it("answers field is required and stores nothing", async () => {
    const { career, repo } = careerSetup();
    await expect(career.add("experience", { organisation: "Acme" })).rejects.toMatchObject({
      status: 400,
      message: "Position is required",
    });
    await expect(career.add("skill_group", { title: "Backend" })).rejects.toMatchObject({
      status: 400,
      message: "Skills is required",
    });
    expect(repo.writes).toBe(0);
  });

  it("rejects an end date before the start date", async () => {
    const { career, repo } = careerSetup();
    await expect(
      career.add("experience", { ...experience, endYear: "2019" }),
    ).rejects.toMatchObject({ status: 400, message: "End date is before start date" });
    expect(repo.writes).toBe(0);
  });

  it("rejects years and months out of range and a month without its year", async () => {
    const { career } = careerSetup();
    await expect(
      career.add("experience", { ...experience, startYear: "1949" }),
    ).rejects.toMatchObject({ message: "Start year is out of range" });
    await expect(
      career.add("experience", { ...experience, startMonth: "13" }),
    ).rejects.toMatchObject({ message: "Start month is out of range" });
    await expect(career.add("experience", { ...experience, endMonth: "3" })).rejects.toMatchObject({
      message: "End month needs a year",
    });
  });

  it("rejects fields over their bound naming the field", async () => {
    const { career } = careerSetup();
    await expect(
      career.add("experience", { ...experience, title: "x".repeat(201) }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("Position") });
    await expect(
      career.add("experience", { ...experience, details: "x".repeat(4001) }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("Details") });
    await expect(
      career.add("experience", {
        ...experience,
        details: Array.from({ length: 31 }, (_, n) => `- bullet ${n}`).join("\n"),
      }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("Bullets") });
  });

  it("stores a current item with no end date", async () => {
    const { career } = careerSetup();
    const added = await career.add("experience", {
      ...experience,
      endYear: "2022",
      endMonth: "5",
      current: "on",
    });
    expect(added).toMatchObject({ current: true, endYear: null, endMonth: null });
  });

  it("rejects an item beyond 200", async () => {
    const full = Array.from({ length: 200 }, (_, n) => item("honour", { title: `Honour ${n}` }));
    const { career, repo } = careerSetup({ items: full });
    await expect(career.add("honour", { title: "One more" })).rejects.toMatchObject({
      status: 400,
      message: "The library is limited to 200 items",
    });
    expect((repo.document as CareerLibrary).items).toHaveLength(200);
  });

  it("rejects personal info and the full name in item fields", async () => {
    const { career, repo, addField } = careerSetup();
    await addField("EMAIL", "Email", "ada.private@example.com");
    await addField("PHONE", "Phone", "+55 11 91234-5678");

    const leaks: [string, Record<string, string>][] = [
      ["title", { ...experience, title: "Mail ada.private@example.com" }],
      ["details", { ...experience, details: "Call +55 11 91234-5678" }],
      ["bullet", { ...experience, details: "- reach ADA.PRIVATE@example.com" }],
      ["organisation", { ...experience, organisation: "ada.private@example.com" }],
      ["stack", { ...experience, stack: "TypeScript, ada.private@example.com" }],
    ];
    for (const [, body] of leaks) {
      await expect(career.add("experience", body)).rejects.toMatchObject({
        status: 400,
        message: expect.stringMatching(/^Your (Email|Phone) is in the body/),
      });
    }
    await expect(
      career.add("experience", {
        ...experience,
        details: `Worked with ${FULL_NAME.toLowerCase()}`,
      }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("full name") });
    await expect(
      career.add("skill_group", { title: "Backend", skills: `Go, ${FULL_NAME}` }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("full name") });
    expect(repo.writes).toBe(0);
    expect((repo.document as CareerLibrary).items).toEqual([]);
  });

  it("does not recheck items it leaves untouched", async () => {
    const [old, other] = [
      item("honour", { title: "Mail ada.private@example.com" }),
      item("honour"),
    ];
    const { career, repo, addField } = careerSetup({ items: [old, other] });
    await addField("EMAIL", "Email", "ada.private@example.com");
    await career.move(other.id, "up");
    expect((repo.document as CareerLibrary).items.map((i) => i.id)).toEqual([other.id, old.id]);
  });

  it("shows the library as markdown", async () => {
    const { career } = careerSetup({ items: sampleLibrary().items });
    expect(await career.markdown()).toBe(SAMPLE_MARKDOWN);
  });

  it("save markdown replaces the library in markdown order without the llm", async () => {
    const { career, repo, calls } = careerSetup({ items: sampleLibrary().items });
    const md =
      "## Experience\n\n### B\n*Beta · 2021*\n\n### A\n*Alpha · 2019*\n\n## Skills\n\n### Tools\nGit, Docker";
    await career.saveMarkdown(md);
    const stored = (repo.document as CareerLibrary).items;
    expect(stored.map((i) => `${i.kind}:${i.title}`)).toEqual([
      "experience:B",
      "experience:A",
      "skill_group:Tools",
    ]);
    expect(stored[2]).toMatchObject({ skills: ["Git", "Docker"] });
    expect(await career.markdown()).toBe(renderItemsMarkdown(stored));
    expect(calls).toHaveLength(0);
  });

  it("keeps the id of an item with the same kind, title and organisation on save", async () => {
    const { career, repo } = careerSetup({ items: sampleLibrary().items });
    await career.saveMarkdown(SAMPLE_MARKDOWN.replace("Cut p99 latency by 40%", "Cut p99 by half"));
    const stored = (repo.document as CareerLibrary).items;
    expect(stored.map((i) => i.id)).toEqual(sampleLibrary().items.map((i) => i.id));
    expect(stored[0]?.bullets[0]).toBe("Cut p99 by half");
    expect(stored[0]?.id).toBe(SAMPLE_IDS.globex);
  });

  it("answers the line of a markdown error and stores nothing", async () => {
    const { career, repo } = careerSetup({ items: sampleLibrary().items });
    const before = structuredClone(repo.document);
    await expect(career.saveMarkdown("## Hobbies\n\n### Chess")).rejects.toMatchObject({
      status: 400,
      message: 'line 1: unknown section "Hobbies"',
    });
    await expect(
      career.saveMarkdown("## Projects\n\n### P\n*Org · Smarch 2020*"),
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/^line 3: /) });
    await expect(career.saveMarkdown("### Lost\n")).rejects.toMatchObject({
      status: 400,
      message: "line 1: item outside a section",
    });
    expect(repo.document).toEqual(before);
    expect(repo.writes).toBe(0);
  });

  it("answers the line and field message of a broken field rule and stores nothing", async () => {
    const { career, repo } = careerSetup();
    const md = "## Experience\n\n### Engineer\n*Acme · 2020 – 2019*";
    await expect(career.saveMarkdown(md)).rejects.toMatchObject({
      status: 400,
      message: "line 3: End date is before start date",
    });
    expect(repo.writes).toBe(0);
  });

  it("rejects personal info and the full name in saved markdown", async () => {
    const { career, repo, addField } = careerSetup();
    await addField("EMAIL", "Email", "ada.private@example.com");
    await expect(
      career.saveMarkdown("## Honours\n\n### Mail ada.private@example.com"),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("Email") });
    await expect(
      career.saveMarkdown(`## Honours\n\n### Award for ${FULL_NAME}`),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("full name") });
    expect(repo.writes).toBe(0);
  });
});

describe("career service import", () => {
  const pasted = `${FULL_NAME} led platforms at Acme.\nada.private@example.com | +55 11 91234-5678`;

  it("redacts personal info and the full name before the call", async () => {
    const { career, calls, addField } = careerSetup({ mock: { text: "## Honours\n\n### Award" } });
    await addField("EMAIL", "Email", "ada.private@example.com");
    await addField("PHONE", "Phone", "+55 11 91234-5678");
    await career.importText(pasted);
    expect(calls).toHaveLength(1);
    const prompt = calls[0]?.prompt ?? "";
    expect(prompt).toContain("[redacted] led platforms at Acme.\n[redacted] | [redacted]");
    for (const value of [
      FULL_NAME,
      FULL_NAME.toUpperCase(),
      "ada.private@example.com",
      "91234-5678",
    ]) {
      expect(prompt.toLowerCase()).not.toContain(value.toLowerCase());
    }
  });

  it("sends the data block to the import model and returns its markdown", async () => {
    const markdown = "## Honours\n\n### Award";
    const { career, calls } = careerSetup({ mock: { text: markdown } });
    const result = await career.importText("Won an award in 2020.");
    expect(result).toBe(markdown);
    expect(calls[0]).toMatchObject({ modelId: "vendor/import", maxOutputTokens: 8000 });
    expect(calls[0]?.system).toContain(IMPORT_PROMPT);
    expect(calls[0]?.prompt).toContain(
      "<<<CV_TEXT_START>>>\nWon an award in 2020.\n<<<CV_TEXT_END>>>",
    );
  });

  it("strips a surrounding code fence from the reply", async () => {
    const { career } = careerSetup({ mock: { text: "```markdown\n## Honours\n\n### Award\n```" } });
    expect(await career.importText("Won an award.")).toBe("## Honours\n\n### Award");
  });

  it("stores nothing", async () => {
    const { career, repo } = careerSetup({ items: sampleLibrary().items });
    const before = structuredClone(repo.document);
    await career.importText("Won an award.");
    expect(repo.document).toEqual(before);
    expect(repo.writes).toBe(0);
  });

  it("rejects empty text", async () => {
    const { career, calls } = careerSetup();
    await expect(career.importText("  \n ")).rejects.toMatchObject({
      status: 400,
      message: "Paste some text to import",
    });
    expect(calls).toHaveLength(0);
  });

  it("rejects text over 50000 characters", async () => {
    const { career, calls } = careerSetup();
    await expect(career.importText("x".repeat(50_001))).rejects.toMatchObject({
      status: 400,
      message: "Text is limited to 50000 characters",
    });
    expect(calls).toHaveLength(0);
    await expect(career.importText("x".repeat(50_000))).resolves.toBeTypeOf("string");
  });

  it("fails with the model unavailable error when the model call fails", async () => {
    const { career } = careerSetup({ failing: true });
    await expect(career.importText("Won an award.")).rejects.toBeInstanceOf(LlmUnavailableError);
  });
});
