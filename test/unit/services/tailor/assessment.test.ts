import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_BOUNDS,
  checkAssessment,
  collapseOldRoles,
  filterMissingSkills,
  restoreNote,
} from "../../../../src/services/tailor/assessment";
import type { ResumeDocument } from "../../../../src/services/tailor/document";
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
    job_description_short: "- Backend engineer",
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

describe("old role collapse", () => {
  const TODAY = 2026;
  const BULLETS = ["First", "Second", "Third"];

  function docOf(...items: Parameters<typeof item>[1][]): ResumeDocument {
    return {
      version: 2,
      headline: "",
      summary: "",
      items: items.map((overrides) => ({
        ...item((overrides?.kind ?? "experience") as "experience", overrides),
        sourceId: null,
      })),
    };
  }

  const role = (overrides: Parameters<typeof item>[1]) =>
    ({ title: "Engineer", organisation: "Initech", startYear: 2000, ...overrides }) as const;

  it("keeps the first bullet and empties the text of a role ended more than 15 years ago", () => {
    const doc = docOf(role({ endYear: 2010, bullets: BULLETS, text: "Led the team." }));
    const result = collapseOldRoles(doc, TODAY);
    expect(result.doc.items[0]).toMatchObject({ bullets: ["First"], text: "" });
    expect(result.notes).toEqual([
      {
        what: "Engineer at Initech",
        reason: "Ended more than 15 years ago; shortened to one bullet.",
      },
    ]);
  });

  it("adds the note only when something was removed", () => {
    const untouched = [
      role({ endYear: 2010, bullets: [], text: "" }),
      role({ endYear: 2010, bullets: ["Only"], text: "" }),
    ];
    for (const overrides of untouched) {
      expect(collapseOldRoles(docOf(overrides), TODAY).notes).toEqual([]);
    }
    expect(
      collapseOldRoles(docOf(role({ endYear: 2010, bullets: ["Only"], text: "T" })), TODAY).notes,
    ).toHaveLength(1);
    expect(
      collapseOldRoles(docOf(role({ endYear: 2010, bullets: ["A", "B"], text: "" })), TODAY).notes,
    ).toHaveLength(1);
  });

  it("leaves a role ending 15 years ago, without end year or current unchanged", () => {
    const doc = docOf(
      role({ endYear: 2011, bullets: BULLETS, text: "Kept." }),
      role({ endYear: null, bullets: BULLETS, text: "Kept." }),
      role({ endYear: 2005, current: true, bullets: BULLETS, text: "Kept." }),
    );
    const result = collapseOldRoles(doc, TODAY);
    expect(result.doc).toEqual(doc);
    expect(result.notes).toEqual([]);
  });

  it("leaves other kinds unchanged", () => {
    const doc = docOf(
      {
        kind: "project",
        title: "Old project",
        startYear: 2000,
        endYear: 2005,
        bullets: BULLETS,
        text: "Kept.",
      },
      {
        kind: "education",
        title: "BSc",
        organisation: "Uni",
        endYear: 2005,
        bullets: BULLETS,
        text: "Kept.",
      },
    );
    const result = collapseOldRoles(doc, TODAY);
    expect(result.doc).toEqual(doc);
    expect(result.notes).toEqual([]);
  });
});
