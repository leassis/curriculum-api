import { describe, expect, it } from "vitest";
import { finish } from "../../../../src/services/tailor/finish";
import { annotate, type TailorOutput } from "../../../../src/services/tailor/output";
import { item } from "../../../support/career";

const TODAY = new Date("2026-11-23T12:00:00Z");

function keep(library: ReturnType<typeof item>[], ids = new Set(library.map((i) => i.id))) {
  const tags = annotate(library);
  return library
    .filter((i) => ids.has(i.id))
    .map((i) => ({ source_id: tags.get(i.id) as string, text: i.text, bullets: i.bullets }));
}

function run(
  library: ReturnType<typeof item>[],
  items: TailorOutput["items"],
  overrides: Partial<TailorOutput> = {},
) {
  const out: TailorOutput = {
    headline: "h",
    summary: "s",
    items,
    score: 72,
    score_rationale: "Covers the core requirements.",
    missing_skills: [],
    omissions: [],
    ...overrides,
  };
  return finish(library, annotate(library), out, TODAY);
}

function ok(result: ReturnType<typeof run>) {
  if (!result.ok) throw new Error(`rejected: ${result.reason}`);
  return result;
}

const oldRole = () =>
  item("experience", {
    title: "Analyst",
    organisation: "Initech",
    startYear: 2000,
    endYear: 2008,
    text: "Reported.",
    bullets: ["One", "Two", "Three"],
  });

describe("finish", () => {
  it("orders omissions model, then restore notes, then collapse notes", () => {
    const old = oldRole();
    const dropped = item("education", { title: "BSc", organisation: "State" });
    const library = [old, dropped];
    const result = ok(
      run(library, keep(library, new Set([old.id])), {
        omissions: [{ what: "  A bullet ", reason: "Off topic" }],
      }),
    );
    expect(result.assessment.omissions).toEqual([
      { what: "A bullet", reason: "Off topic" },
      {
        what: "Analyst at Initech",
        reason: "Ended more than 15 years ago; shortened to one bullet.",
      },
    ]);
    expect(result.restored).toBe(0);
    expect(result.collapsed).toBe(1);
    expect(result.assessment).toMatchObject({
      score: 72,
      rationale: "Covers the core requirements.",
    });
  });

  it("adds one restore note per restored item with a shared title", () => {
    const a = item("experience", { title: "Engineer", organisation: "Acme" });
    const b = item("experience", { title: "Engineer", organisation: "Globex" });
    const result = ok(run([a, b], []));
    expect(result.assessment.omissions.map((o) => o.what)).toEqual([
      "Engineer at Acme",
      "Engineer at Globex",
    ]);
  });

  it("drops model omissions that name a non-experience item", () => {
    const edu = item("education", { title: "BSc in CS", organisation: "State" });
    const result = ok(
      run([edu], [], { omissions: [{ what: "BSc in CS (2001)", reason: "Old role" }] }),
    );
    expect(result.assessment.omissions).toEqual([]);
  });

  it("adds no note for a left-out project, publication or honour", () => {
    const library = [item("project"), item("publication"), item("honour")];
    const result = ok(run(library, []));
    expect(result.assessment.omissions).toEqual([]);
    expect(result.doc.items).toEqual([]);
    expect(result.restored).toBe(0);
  });

  it("collapses a restored old role", () => {
    const result = ok(run([oldRole()], []));
    expect(result.doc.items[0]).toMatchObject({ bullets: ["One"], text: "" });
    expect(result.assessment.omissions.map((o) => o.reason)).toEqual([
      "Experience items are always kept; restored by code.",
      "Ended more than 15 years ago; shortened to one bullet.",
    ]);
  });

  it("restores every always-kept item when the model returns none", () => {
    const library = [
      item("experience"),
      item("education"),
      item("certification"),
      item("course"),
      item("skill_group"),
      item("language"),
      item("project"),
    ];
    const result = ok(run(library, []));
    expect(result.doc.items).toHaveLength(6);
    expect(result.assessment.omissions).toHaveLength(1);
    expect(result.restored).toBe(1);
  });

  it("filters missing skills against the library", () => {
    const library = [item("skill_group", { skills: ["TypeScript"] })];
    const result = ok(run(library, keep(library), { missing_skills: ["typescript", "Rust"] }));
    expect(result.assessment.missingSkills).toEqual(["Rust"]);
  });

  it("rejects an assessment that breaks a bound", () => {
    const library = [item("experience")];
    expect(run(library, keep(library), { score: 101 })).toEqual({
      ok: false,
      reason: "assessment",
    });
  });

  it("passes an assemble failure through", () => {
    const library = [item("experience")];
    const result = run(library, [{ source_id: "c99", text: "", bullets: [] }]);
    expect(result).toEqual({ ok: false, reason: "unknown_id" });
  });
});
