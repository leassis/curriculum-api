import { describe, expect, it } from "vitest";
import { exitCode, fixture, formatResults, runChecks } from "../../../scripts/verify-tailor-checks";
import type { Assessment } from "../../../src/services/tailor/assessment";
import type { ResumeDocument } from "../../../src/services/tailor/document";

const TODAY = new Date("2026-11-23T00:00:00Z");

function itemStrings(
  i: ResumeDocument["items"][number] | ReturnType<typeof fixture>["library"][number],
) {
  return [i.title, i.organisation, i.location, i.level, i.text, ...i.bullets, ...i.skills];
}

function passingDoc(): ResumeDocument {
  const fix = fixture();
  return {
    version: 2,
    headline: "Backend engineer",
    summary: "Builds billing services.",
    items: fix.library.map((i) => ({
      ...i,
      bullets: i.id === fix.oldRoleId ? i.bullets.slice(0, 1) : i.bullets,
      text: i.id === fix.oldRoleId ? "" : i.text,
      sourceId: i.id,
    })),
  };
}

const passingAssessment = (): Assessment => ({
  score: 70,
  rationale: "Good fit apart from Terraform.",
  missingSkills: ["Terraform (infrastructure as code)"],
  omissions: [{ what: "Recipe organiser", reason: "Unrelated to the role." }],
});

describe("verify tailor", () => {
  it("fixtures hold one absent skill, an old role and an unrelated project", () => {
    const fix = fixture();
    const haystack = fix.library.flatMap(itemStrings).join("\n").toLowerCase();
    const absent = fix.requiredSkills.filter((s) => !haystack.includes(s.toLowerCase()));
    expect(absent).toEqual([fix.absentSkill]);
    for (const skill of fix.requiredSkills) expect(fix.jobDescription).toContain(skill);

    const old = fix.library.find((i) => i.id === fix.oldRoleId);
    expect(old?.kind).toBe("experience");
    expect(old?.current).toBe(false);
    expect(old?.endYear ?? 9999).toBeLessThan(TODAY.getUTCFullYear() - 15);
    expect(old?.bullets.length).toBeGreaterThanOrEqual(3);

    const project = fix.library.find((i) => i.kind === "project");
    expect(project).toBeDefined();
    expect(fix.jobDescription.toLowerCase()).not.toContain("recipe");
    expect(fix.jobDescription.toLowerCase()).not.toContain("flutter");
  });

  it("reports pass or fail for each of the four checks", () => {
    const fix = fixture();
    const pass = runChecks(passingDoc(), passingAssessment(), fix, TODAY);
    expect(pass.map((r) => r.pass)).toEqual([true, true, true, true]);
    expect(formatResults(pass).map((l) => l.slice(0, 5))).toEqual([
      "PASS ",
      "PASS ",
      "PASS ",
      "PASS ",
    ]);

    const leaking = passingDoc();
    leaking.summary = "Experienced with terraform.";
    const notReported: Assessment = { ...passingAssessment(), missingSkills: ["Kubernetes"] };
    const noReason: Assessment = {
      ...passingAssessment(),
      omissions: [{ what: "Recipe organiser", reason: "  " }],
    };
    const uncollapsed = passingDoc();
    const oldItem = uncollapsed.items.find((i) => i.sourceId === fix.oldRoleId);
    if (oldItem) oldItem.bullets = ["a", "b", "c"];
    const results = [
      runChecks(leaking, passingAssessment(), fix, TODAY),
      runChecks(passingDoc(), notReported, fix, TODAY),
      runChecks(passingDoc(), noReason, fix, TODAY),
      runChecks(uncollapsed, passingAssessment(), fix, TODAY),
    ];
    for (const [index, run] of results.entries()) {
      expect(
        run.map((r) => r.pass),
        `check ${index + 1}`,
      ).toEqual([0, 1, 2, 3].map((n) => n !== index));
    }
    const lines = formatResults(results[0] ?? []);
    expect(lines[0]).toMatch(/^FAIL absent skill is not in the resume/);
    expect(lines.slice(1).every((l) => l.startsWith("PASS "))).toBe(true);

    const keptText = passingDoc();
    const kept = keptText.items.find((i) => i.sourceId === fix.oldRoleId);
    if (kept) kept.text = "Still here.";
    expect(runChecks(keptText, passingAssessment(), fix, TODAY)[3]?.pass).toBe(false);
  });

  it("exits 1 when any check fails", () => {
    const fix = fixture();
    const pass = runChecks(passingDoc(), passingAssessment(), fix, TODAY);
    expect(exitCode(pass)).toBe(0);
    for (let n = 0; n < 4; n++) {
      const failing = pass.map((r, i) => (i === n ? { ...r, pass: false } : r));
      expect(exitCode(failing)).toBe(1);
    }
  });
});
