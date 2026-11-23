import { describe, expect, it } from "vitest";
import {
  dateRange,
  formatDate,
  groupByKind,
  metaLine,
} from "../../../../src/services/career/display";
import { item } from "../../../support/career";

describe("display", () => {
  it("formats dates and ranges", () => {
    expect(formatDate(2023, 1)).toBe("Jan 2023");
    expect(formatDate(2003)).toBe("2003");
    expect(formatDate(2003, null)).toBe("2003");
    expect(formatDate(2020, 12)).toBe("Dec 2020");
    expect(dateRange(item("education", { startYear: 2012, endYear: 2016 }))).toBe("2012 – 2016");
    expect(
      dateRange(item("education", { startYear: 2012, startMonth: 9, endYear: 2016, endMonth: 6 })),
    ).toBe("Sep 2012 – Jun 2016");
    expect(dateRange(item("education", { startYear: 2012 }))).toBe("2012");
    expect(dateRange(item("education", { startYear: null }))).toBe("");
  });

  it("ends current experience with present and current certification with no expiry", () => {
    expect(dateRange(item("experience", { startYear: 2020, startMonth: 1, current: true }))).toBe(
      "Jan 2020 – Present",
    );
    expect(dateRange(item("project", { startYear: 2022, current: true }))).toBe("2022 – Present");
    expect(
      dateRange(item("certification", { startYear: 2021, startMonth: 6, current: true })),
    ).toBe("Jun 2021 – No expiry");
  });

  it("builds experience and project meta lines without empty parts", () => {
    const base = { organisation: "Globex", location: "Remote", startYear: 2020, endYear: 2022 };
    expect(metaLine(item("experience", base))).toBe("Globex · Remote · 2020 – 2022");
    expect(metaLine(item("experience", { ...base, location: "" }))).toBe("Globex · 2020 – 2022");
    expect(metaLine(item("experience", { ...base, endYear: null }))).toBe("Globex · Remote · 2020");
    expect(metaLine(item("experience", { ...base, startYear: 2020, current: true }))).toBe(
      "Globex · Remote · 2020 – Present",
    );
    expect(
      metaLine(item("project", { organisation: "Personal", startYear: 2022, endYear: 2023 })),
    ).toBe("Personal · 2022 – 2023");
    expect(metaLine(item("project", { organisation: "", startYear: 2022, endYear: 2023 }))).toBe(
      "2022 – 2023",
    );
    expect(metaLine(item("project", { organisation: "Personal", startYear: null }))).toBe(
      "Personal",
    );
    expect(metaLine(item("project", { organisation: "", startYear: null }))).toBe("");
  });

  it("builds education certification and course meta lines", () => {
    expect(
      metaLine(
        item("education", { organisation: "State University", startYear: 2012, endYear: 2016 }),
      ),
    ).toBe("State University · 2012 – 2016");
    expect(
      metaLine(
        item("certification", {
          organisation: "Amazon",
          startYear: 2021,
          startMonth: 6,
          current: true,
        }),
      ),
    ).toBe("Amazon · Jun 2021 – No expiry");
    expect(metaLine(item("course", { organisation: "Online School", startYear: null }))).toBe(
      "Online School",
    );
  });

  it("builds skill group language publication and honour meta lines", () => {
    expect(metaLine(item("skill_group", { title: "Backend", skills: ["Go"] }))).toBe("");
    expect(metaLine(item("language", { title: "English", level: "Fluent" }))).toBe("Fluent");
    expect(
      metaLine(item("publication", { organisation: "ACM", startYear: 2019, startMonth: 4 })),
    ).toBe("ACM · Apr 2019");
    expect(metaLine(item("honour", { organisation: "", startYear: null }))).toBe("");
    expect(metaLine(item("honour", { organisation: "Guild", startYear: 2018 }))).toBe(
      "Guild · 2018",
    );
  });

  it("groups items by kind in section order and keeps empty kinds", () => {
    const language = item("language");
    const first = item("experience", { title: "A" });
    const second = item("experience", { title: "B" });
    const groups = groupByKind([language, first, second]);
    expect(groups.map((g) => g.kind)).toEqual([
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
    expect(groups.map((g) => g.section)[1]).toBe("Projects");
    expect(groups[0]?.items).toEqual([first, second]);
    expect(groups[1]?.items).toEqual([]);
    expect(groups[6]?.items).toEqual([language]);
  });
});
