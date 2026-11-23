import type { CareerItem } from "../src/services/career/item.js";
import type { Assessment } from "../src/services/tailor/assessment.js";
import { COLLAPSE_YEARS } from "../src/services/tailor/assessment.js";
import type { ResumeDocument } from "../src/services/tailor/document.js";
import { item } from "../test/support/career.js";

export interface TailorFixture {
  library: CareerItem[];
  jobDescription: string;
  requiredSkills: string[];
  absentSkill: string;
  oldRoleId: string;
}

const OLD_ROLE_ID = "0d1e2f30-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

export function fixture(): TailorFixture {
  return {
    library: [
      item("experience", {
        title: "Backend Engineer",
        organisation: "Northwind",
        startYear: 2019,
        current: true,
        text: "Builds and runs the order and billing services.",
        bullets: ["Cut order latency by 35%", "Moved billing to event-driven processing"],
        skills: ["TypeScript", "PostgreSQL"],
      }),
      item("experience", {
        id: OLD_ROLE_ID,
        title: "Support Analyst",
        organisation: "Contoso Telecom",
        startYear: 1999,
        endYear: 2005,
        text: "Handled customer escalations for the billing team.",
        bullets: [
          "Resolved escalated billing disputes",
          "Wrote the first internal knowledge base",
          "Trained new agents on the ticketing system",
        ],
        skills: ["Excel"],
      }),
      item("project", {
        title: "Recipe organiser",
        organisation: "Personal",
        startYear: 2021,
        text: "A mobile app that sorts family recipes by season.",
        skills: ["Flutter"],
      }),
      item("education", { title: "BSc Computer Science", organisation: "State University" }),
      item("skill_group", { title: "Backend", skills: ["TypeScript", "PostgreSQL"] }),
      item("language", { title: "English", level: "Fluent" }),
    ],
    jobDescription:
      "We need a backend engineer with strong TypeScript and PostgreSQL experience who can also write Terraform to provision our cloud infrastructure.",
    requiredSkills: ["TypeScript", "PostgreSQL", "Terraform"],
    absentSkill: "Terraform",
    oldRoleId: OLD_ROLE_ID,
  };
}

export interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

export function runChecks(
  doc: ResumeDocument,
  assessment: Assessment,
  fix: TailorFixture,
  today: Date,
): CheckResult[] {
  const skill = fix.absentSkill.toLowerCase();
  const leaked = JSON.stringify(doc).toLowerCase().includes(skill);
  const reported = assessment.missingSkills.some((s) => s.toLowerCase().includes(skill));
  const noReason = assessment.omissions.filter((o) => o.reason.trim() === "");
  const old = doc.items.find((i) => i.sourceId === fix.oldRoleId);
  const oldEnough =
    (old?.endYear ?? Number.POSITIVE_INFINITY) < today.getUTCFullYear() - COLLAPSE_YEARS;
  const collapsed = old !== undefined && old.bullets.length === 1 && old.text === "";
  return [
    {
      name: "absent skill is not in the resume",
      pass: !leaked,
      detail: leaked ? `"${fix.absentSkill}" appears in the Resume Document` : "",
    },
    {
      name: "absent skill is in missing_skills",
      pass: reported,
      detail: reported ? "" : `missing_skills: ${JSON.stringify(assessment.missingSkills)}`,
    },
    {
      name: "every omission has a reason",
      pass: noReason.length === 0,
      detail: noReason.length === 0 ? "" : `${noReason.length} omission(s) without a reason`,
    },
    {
      name: "old role has one bullet and no text",
      pass: collapsed && oldEnough,
      detail: !old
        ? "the old role is missing from the resume"
        : !oldEnough
          ? "the fixture role is not older than 15 years"
          : collapsed
            ? ""
            : `${old.bullets.length} bullet(s), text ${old.text === "" ? "empty" : "kept"}`,
    },
  ];
}

export function formatResults(results: CheckResult[]): string[] {
  return results.map(
    (r) => `${r.pass ? "PASS" : "FAIL"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`,
  );
}

export function exitCode(results: CheckResult[]): 0 | 1 {
  return results.every((r) => r.pass) ? 0 : 1;
}
