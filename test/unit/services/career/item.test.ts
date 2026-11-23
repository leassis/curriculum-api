import { describe, expect, it } from "vitest";
import {
  CareerItemSchema,
  CareerLibrarySchema,
  KIND_META,
  KINDS,
  normalizeItem,
} from "../../../../src/services/career/item";
import { item, sampleLibrary } from "../../../support/career";

function firstMessage(candidate: unknown): string | undefined {
  const result = CareerItemSchema.safeParse(candidate);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("career item schema", () => {
  it("lists the nine kinds in section order", () => {
    expect(KINDS).toEqual([
      "experience",
      "project",
      "education",
      "certification",
      "course",
      "skill_group",
      "language",
      "publication",
      "honour",
    ]);
    expect(KINDS.map((k) => KIND_META[k].section)).toEqual([
      "Experience",
      "Projects",
      "Education",
      "Certifications",
      "Courses",
      "Skills",
      "Languages",
      "Publications",
      "Honours",
    ]);
    expect(KIND_META.experience.ongoing).toBe("I currently work here");
    expect(KIND_META.project.ongoing).toBe("Ongoing");
    expect(KIND_META.certification.ongoing).toBe("No expiry");
  });

  it("accepts a valid item of every kind", () => {
    for (const item of sampleLibrary().items) {
      expect(CareerItemSchema.safeParse(item).success).toBe(true);
    }
    for (const kind of KINDS) {
      expect(CareerItemSchema.safeParse(item(kind)).success).toBe(true);
    }
  });

  it("requires the fields of each kind", () => {
    const cases: [(typeof KINDS)[number], Record<string, unknown>, string][] = [
      ["experience", { title: "" }, "Position is required"],
      ["experience", { organisation: "" }, "Company is required"],
      ["experience", { startYear: null }, "Start year is required"],
      ["project", { title: "" }, "Project is required"],
      ["project", { startYear: null }, "Start year is required"],
      ["education", { title: "" }, "Degree is required"],
      ["education", { organisation: "" }, "Institution is required"],
      ["certification", { title: "" }, "Certification is required"],
      ["certification", { organisation: "" }, "Issuer is required"],
      ["course", { title: "" }, "Course is required"],
      ["course", { organisation: "" }, "Provider is required"],
      ["skill_group", { title: "" }, "Skill group is required"],
      ["skill_group", { skills: [] }, "Skills is required"],
      ["language", { title: "" }, "Language is required"],
      ["language", { level: "" }, "Level is required"],
      ["publication", { title: "" }, "Publication is required"],
      ["honour", { title: "" }, "Honour is required"],
    ];
    for (const [kind, overrides, message] of cases) {
      expect(firstMessage(item(kind, overrides)), `${kind} ${message}`).toBe(message);
    }
  });

  it("keeps optional fields optional", () => {
    expect(CareerItemSchema.safeParse(item("project", { organisation: "" })).success).toBe(true);
    expect(CareerItemSchema.safeParse(item("publication", { organisation: "" })).success).toBe(
      true,
    );
    expect(CareerItemSchema.safeParse(item("experience", { skills: [] })).success).toBe(true);
  });

  it("rejects years and months out of range", () => {
    expect(firstMessage(item("experience", { startYear: 1949 }))).toBe(
      "Start year is out of range",
    );
    expect(firstMessage(item("experience", { endYear: 2101 }))).toBe("End year is out of range");
    expect(CareerItemSchema.safeParse(item("experience", { startYear: 1950 })).success).toBe(true);
    expect(
      CareerItemSchema.safeParse(item("experience", { startYear: 2020, endYear: 2100 })).success,
    ).toBe(true);
    expect(firstMessage(item("experience", { startMonth: 0 }))).toBe("Start month is out of range");
    expect(firstMessage(item("experience", { endYear: 2021, endMonth: 13 }))).toBe(
      "End month is out of range",
    );
    expect(
      CareerItemSchema.safeParse(item("experience", { startMonth: 12, endYear: 2021, endMonth: 1 }))
        .success,
    ).toBe(true);
  });

  it("rejects a month without its year", () => {
    expect(firstMessage(item("education", { startYear: null, startMonth: 3 }))).toBe(
      "Start month needs a year",
    );
    expect(firstMessage(item("education", { endYear: null, endMonth: 3 }))).toBe(
      "End month needs a year",
    );
  });

  it("rejects an end date before the start date", () => {
    const early = { startYear: 2020, startMonth: 6, endYear: 2020, endMonth: 5 };
    expect(firstMessage(item("experience", early))).toBe("End date is before start date");
    expect(firstMessage(item("experience", { startYear: 2021, endYear: 2020 }))).toBe(
      "End date is before start date",
    );
    expect(
      CareerItemSchema.safeParse(item("experience", { startYear: 2020, endYear: 2020 })).success,
    ).toBe(true);
  });

  it("clears the end date of a current item", () => {
    const normalized = normalizeItem(
      item("experience", { current: true, endYear: 2022, endMonth: 4 }),
    );
    expect(normalized.current).toBe(true);
    expect(normalized.endYear).toBeNull();
    expect(normalized.endMonth).toBeNull();
    expect(CareerItemSchema.safeParse(normalized).success).toBe(true);
  });

  it("empties the fields a kind does not have", () => {
    const normalized = normalizeItem(
      item("education", {
        location: "Lisbon",
        current: true,
        skills: ["x"],
        level: "B2",
        endYear: 2016,
        startYear: 2012,
      }),
    );
    expect(normalized).toMatchObject({
      location: "",
      current: false,
      skills: [],
      level: "",
      startYear: 2012,
      endYear: 2016,
    });
    const language = normalizeItem(
      item("language", { organisation: "X", text: "y", startYear: 2000 }),
    );
    expect(language).toMatchObject({ organisation: "", text: "", startYear: null });
    expect(
      normalizeItem(item("skill_group", { bullets: ["b"], title: "T", skills: ["a"] })).bullets,
    ).toEqual([]);
  });

  it("trims text and drops empty bullets and skills when normalizing", () => {
    const normalized = normalizeItem(
      item("experience", { title: "  Engineer ", bullets: [" a ", ""], skills: ["x", " "] }),
    );
    expect(normalized.title).toBe("Engineer");
    expect(normalized.bullets).toEqual(["a"]);
    expect(normalized.skills).toEqual(["x"]);
  });

  it("rejects every field over its bound", () => {
    const long = (n: number) => "a".repeat(n);
    const cases: [string, ReturnType<typeof item>, string][] = [
      [
        "title",
        item("experience", { title: long(201) }),
        "Position is too long (max 200 characters)",
      ],
      [
        "organisation",
        item("experience", { organisation: long(201) }),
        "Company is too long (max 200 characters)",
      ],
      [
        "location",
        item("experience", { location: long(201) }),
        "Location is too long (max 200 characters)",
      ],
      ["level", item("language", { level: long(201) }), "Level is too long (max 200 characters)"],
      [
        "text",
        item("experience", { text: long(4001) }),
        "Details is too long (max 4000 characters)",
      ],
      [
        "bullet",
        item("experience", { bullets: [long(601)] }),
        "A bullet is too long (max 600 characters)",
      ],
      [
        "bullets",
        item("experience", { bullets: Array.from({ length: 31 }, () => "b") }),
        "Bullets are limited to 30",
      ],
      [
        "skill",
        item("skill_group", { skills: [long(101)] }),
        "A skill in Skills is too long (max 100 characters)",
      ],
      [
        "skills",
        item("skill_group", { skills: Array.from({ length: 51 }, (_, i) => `s${i}`) }),
        "Skills are limited to 50",
      ],
    ];
    for (const [name, candidate, message] of cases) {
      expect(firstMessage(candidate), name).toBe(message);
    }
    expect(
      CareerItemSchema.safeParse(
        item("experience", {
          title: long(200),
          text: long(4000),
          bullets: Array.from({ length: 30 }, () => long(600)),
        }),
      ).success,
    ).toBe(true);
    expect(
      CareerItemSchema.safeParse(
        item("skill_group", { skills: Array.from({ length: 50 }, () => long(100)) }),
      ).success,
    ).toBe(true);
  });

  it("keeps the markdown separator out of organisation and location", () => {
    expect(firstMessage(item("experience", { organisation: "A · B" }))).toBe(
      'Company cannot contain " · "',
    );
    expect(firstMessage(item("experience", { location: "A · B" }))).toBe(
      'Location cannot contain " · "',
    );
  });

  it("limits the library to 200 items", () => {
    const items = Array.from({ length: 200 }, () => item("honour"));
    expect(CareerLibrarySchema.safeParse({ version: 1, items }).success).toBe(true);
    const over = CareerLibrarySchema.safeParse({ version: 1, items: [...items, item("honour")] });
    expect(over.success).toBe(false);
    expect(over.error?.issues[0]?.message).toBe("The library is limited to 200 items");
  });
});
