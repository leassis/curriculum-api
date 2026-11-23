import { describe, expect, it } from "vitest";
import type { CareerLibrary } from "../../../src/services/career/item";
import { item, sampleLibrary } from "../../support/career";
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
});
