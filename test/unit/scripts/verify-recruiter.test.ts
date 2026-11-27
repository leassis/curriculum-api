import { describe, expect, it } from "vitest";
import {
  type Answers,
  exitCode,
  fixture,
  formatResults,
  runChecks,
} from "../../../scripts/verify-recruiter-checks";

const good = (): Answers => ({
  fit: "The candidate builds and runs order and billing services at Northwind with TypeScript and PostgreSQL, and cut order latency by 35%.",
  fitPt:
    "Sim: na Northwind o candidato usa TypeScript e PostgreSQL nos serviços de pedidos e cobrança.",
  absent:
    "The CV does not detail that. The closest experience is moving billing to event-driven processing at Northwind with TypeScript and PostgreSQL.",
});

describe("verify recruiter", () => {
  it("fixture: the job asks for two CV skills and one the CV lacks", () => {
    const fix = fixture();
    const cv = JSON.stringify(fix.library).toLowerCase();
    for (const skill of fix.matchedSkills) {
      expect(cv).toContain(skill.toLowerCase());
      expect(fix.jobDescription).toContain(skill);
    }
    expect(cv).not.toContain(fix.absentSkill.toLowerCase());
    expect(fix.jobDescription).toContain(fix.absentSkill);
    expect(fix.questions.absent).toContain(fix.absentSkill);
  });

  it("passes answers that lead with matches and never discuss the gap", () => {
    const results = runChecks(good(), fixture());
    expect(results.filter((r) => !r.pass)).toEqual([]);
    expect(results).toHaveLength(8);
    expect(exitCode(results)).toBe(0);
    expect(formatResults(results).every((l) => l.startsWith("PASS "))).toBe(true);
  });

  it("fails each kind of bad answer", () => {
    const fix = fixture();
    const failing = (answers: Partial<Answers>) =>
      runChecks({ ...good(), ...answers }, fix)
        .filter((r) => !r.pass)
        .map((r) => r.name);

    expect(failing({ fit: "The candidate uses TypeScript at Northwind." })).toEqual([
      "fit answer leads with the matching skills",
    ]);
    expect(
      failing({
        fit: `${good().fit} The CV does not mention Terraform.`,
      }),
    ).toEqual(["fit answer does not bring up the absent skill", "fit answer points out no gap"]);
    expect(failing({ fit: `${good().fit} There is a gap in cloud work.` })).toEqual([
      "fit answer points out no gap",
    ]);
    expect(failing({ fitPt: `${good().fitPt} O CV não menciona Terraform.` })).toEqual([
      "Portuguese fit answer matches and points out no gap",
    ]);
    expect(failing({ absent: "Yes, the candidate has used Terraform at Northwind." })).toEqual([
      "absent-skill answer never claims it",
      "absent-skill answer says the CV does not detail it, without a negative claim",
    ]);
    expect(
      failing({
        absent:
          "The CV does not detail it; the candidate has no experience with it, only PostgreSQL.",
      }),
    ).toEqual(["absent-skill answer says the CV does not detail it, without a negative claim"]);
    expect(failing({ absent: "The CV does not detail that." })).toEqual([
      "absent-skill answer points to related CV experience",
    ]);
    expect(failing({ fit: "I can only answer questions about this candidate's CV." })).toEqual([
      "no question is declined",
      "fit answer leads with the matching skills",
    ]);
    expect(
      failing({
        absent:
          "The CV does not detail any experience with Terraform. The closest is PostgreSQL at Northwind.",
      }),
    ).toEqual([]);
    expect(exitCode(runChecks({ ...good(), fit: "" }, fix))).toBe(1);
  });
});
