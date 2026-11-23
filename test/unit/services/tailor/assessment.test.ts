import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_BOUNDS,
  checkAssessment,
  filterMissingSkills,
  restoreNote,
} from "../../../../src/services/tailor/assessment";
import type { TailorOutput } from "../../../../src/services/tailor/output";
import { item } from "../../../support/career";

function output(overrides: Partial<TailorOutput> = {}): TailorOutput {
  return {
    headline: "h",
    summary: "s",
    items: [],
    score: 70,
    score_rationale: "Covers the core requirements.",
    missing_skills: [],
    omissions: [],
    ...overrides,
  };
}

describe("assessment bounds", () => {
  it("accepts each value at its bound", () => {
    expect(ASSESSMENT_BOUNDS.skillsMax).toBe(30);
    const edge = output({
      score: 100,
      score_rationale: "r".repeat(1000),
      missing_skills: Array.from({ length: 30 }, (_, n) => `${n}`.padEnd(200, "x")),
      omissions: Array.from({ length: 30 }, () => ({
        what: "w".repeat(200),
        reason: "y".repeat(300),
      })),
    });
    expect(checkAssessment(edge)).toBe(true);
    expect(checkAssessment(output({ score: 0, score_rationale: "r" }))).toBe(true);
  });

  it("rejects each value one past its bound", () => {
    const rejected: Partial<TailorOutput>[] = [
      { score: -1 },
      { score: 101 },
      { score: 70.5 },
      { score_rationale: "" },
      { score_rationale: "r".repeat(1001) },
      { missing_skills: Array.from({ length: 31 }, (_, n) => `skill ${n}`) },
      { missing_skills: ["s".repeat(201)] },
      { omissions: Array.from({ length: 31 }, () => ({ what: "w", reason: "r" })) },
      { omissions: [{ what: "w".repeat(201), reason: "r" }] },
      { omissions: [{ what: "w", reason: "r".repeat(301) }] },
    ];
    for (const overrides of rejected) {
      expect(checkAssessment(output(overrides)), JSON.stringify(overrides).slice(0, 60)).toBe(
        false,
      );
    }
  });
});

describe("missing skills filter", () => {
  const library = [
    item("skill_group", { title: "Languages", skills: ["TypeScript", " Go "] }),
    item("experience", { skills: ["PostgreSQL"] }),
  ];

  it("drops a skill equal to a library skill ignoring case", () => {
    expect(filterMissingSkills(["typescript", "GO", "postgresql"], library)).toEqual([]);
  });

  it("keeps unmatched skills trimmed in model order", () => {
    expect(filterMissingSkills(["  Kubernetes ", "typescript", "Terraform"], library)).toEqual([
      "Kubernetes",
      "Terraform",
    ]);
  });

  it("keeps the first of duplicate skills", () => {
    expect(filterMissingSkills(["Kubernetes", "kubernetes ", "KUBERNETES"], library)).toEqual([
      "Kubernetes",
    ]);
  });

  it("keeps every skill when the library has none", () => {
    expect(filterMissingSkills([" Rust", "rust", "Zig"], [item("honour")])).toEqual([
      "Rust",
      "Zig",
    ]);
  });
});

describe("restore notes", () => {
  it("names the title, organisation and section", () => {
    const note = restoreNote(item("experience", { title: "Engineer", organisation: "Globex" }));
    expect(note).toEqual({
      what: "Engineer at Globex",
      reason: "Experience items are always kept; restored by code.",
    });
    expect(restoreNote(item("skill_group", { title: "Tools", skills: ["Git"] })).reason).toBe(
      "Skills items are always kept; restored by code.",
    );
  });

  it("leaves out the organisation when the item has none", () => {
    const note = restoreNote(
      item("language", { title: "English", organisation: "", level: "Fluent" }),
    );
    expect(note.what).toBe("English");
    expect(note.what).not.toContain(" at ");
    expect(note.reason).toBe("Languages items are always kept; restored by code.");
  });
});
