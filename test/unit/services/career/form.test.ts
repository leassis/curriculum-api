import { describe, expect, it } from "vitest";
import { formValues, itemFromForm } from "../../../../src/services/career/form";
import { CareerItemSchema, normalizeItem } from "../../../../src/services/career/item";
import { item, sampleLibrary } from "../../../support/career";

describe("career form", () => {
  it("splits details into text and bullets and joins them back", () => {
    const parsed = itemFromForm("experience", {
      title: "Engineer",
      details: "Led the team.\r\n- Cut latency\n\nSecond paragraph\n-not a bullet\n- Mentored\n- ",
    });
    expect(parsed.text).toBe("Led the team.\n\nSecond paragraph\n-not a bullet");
    expect(parsed.bullets).toEqual(["Cut latency", "Mentored"]);

    const shown = formValues(item("experience", { text: "Led the team.", bullets: ["A", "B"] }));
    expect(shown.details).toBe("Led the team.\n- A\n- B");
    expect(formValues(item("experience", { text: "", bullets: ["A"] })).details).toBe("- A");
    expect(formValues(item("experience", { text: "Only text" })).details).toBe("Only text");
  });

  it("splits the tech stack on commas and joins it back", () => {
    const parsed = itemFromForm("project", { title: "P", stack: " Rust ,, Go,  ,TypeScript " });
    expect(parsed.skills).toEqual(["Rust", "Go", "TypeScript"]);
    expect(formValues(item("project", { skills: ["Rust", "Go"] })).stack).toBe("Rust, Go");
  });

  it("reads skills of a skill group from the skills field", () => {
    const parsed = itemFromForm("skill_group", { title: "Backend", skills: "Go, Postgres" });
    expect(parsed.skills).toEqual(["Go", "Postgres"]);
    expect(formValues(item("skill_group", { skills: ["Go", "Postgres"] })).skills).toBe(
      "Go, Postgres",
    );
  });

  it("reads years and months from selects and the current checkbox", () => {
    const parsed = itemFromForm("experience", {
      title: "E",
      organisation: "O",
      startYear: "2020",
      startMonth: "3",
      endYear: "",
      endMonth: "",
      current: "on",
    });
    expect(parsed).toMatchObject({
      startYear: 2020,
      startMonth: 3,
      endYear: null,
      endMonth: null,
      current: true,
    });
    expect(itemFromForm("experience", { title: "E" }).current).toBe(false);
    expect(Number.isNaN(itemFromForm("experience", { startYear: "abc" }).startYear)).toBe(true);
  });

  it("ignores fields the kind does not have", () => {
    const parsed = itemFromForm("language", {
      title: "English",
      level: "Fluent",
      organisation: "X",
      details: "y",
      startYear: "2000",
    });
    expect(parsed).toMatchObject({ organisation: "", text: "", startYear: null, level: "Fluent" });
  });

  it("keeps a filled form stable through formValues and itemFromForm for every kind", () => {
    for (const original of sampleLibrary().items) {
      const rebuilt = normalizeItem({
        ...itemFromForm(original.kind, formValues(original)),
        id: original.id,
      });
      expect(rebuilt).toEqual(original);
      expect(CareerItemSchema.safeParse(rebuilt).success).toBe(true);
    }
  });
});
