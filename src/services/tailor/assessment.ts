import { type CareerItem, KIND_META } from "../career/item.js";
import { cleanLine, type ResumeDocument } from "./document.js";
import type { TailorOutput } from "./output.js";

export interface Omission {
  what: string;
  reason: string;
}

export interface Assessment {
  score: number;
  rationale: string;
  missingSkills: string[];
  omissions: Omission[];
}

export const ASSESSMENT_BOUNDS = {
  scoreMin: 0,
  scoreMax: 100,
  rationaleMax: 1000,
  skillsMax: 30,
  skillMax: 200,
  omissionsMax: 30,
  whatMax: 200,
  reasonMax: 300,
} as const;

function within(value: string, max: number): boolean {
  const length = cleanLine(value).length;
  return length >= 1 && length <= max;
}

export function checkAssessment(out: TailorOutput): boolean {
  const b = ASSESSMENT_BOUNDS;
  return (
    Number.isInteger(out.score) &&
    out.score >= b.scoreMin &&
    out.score <= b.scoreMax &&
    within(out.score_rationale, b.rationaleMax) &&
    out.missing_skills.length <= b.skillsMax &&
    out.missing_skills.every((skill) => within(skill, b.skillMax)) &&
    out.omissions.length <= b.omissionsMax &&
    out.omissions.every((o) => within(o.what, b.whatMax) && within(o.reason, b.reasonMax))
  );
}

export function filterMissingSkills(skills: string[], library: CareerItem[]): string[] {
  const known = new Set(library.flatMap((item) => item.skills.map((s) => s.trim().toLowerCase())));
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const skill of skills) {
    const clean = cleanLine(skill);
    const key = clean.toLowerCase();
    if (clean === "" || known.has(key) || seen.has(key)) continue;
    seen.add(key);
    kept.push(clean);
  }
  return kept;
}

function describeItem(item: { title: string; organisation: string }): string {
  return item.organisation ? `${item.title} at ${item.organisation}` : item.title;
}

export function restoreNote(item: CareerItem): Omission {
  return {
    what: describeItem(item),
    reason: `${KIND_META[item.kind].section} items are always kept; restored by code.`,
  };
}

export const COLLAPSE_YEARS = 15;

export function collapseOldRoles(
  doc: ResumeDocument,
  todayYear: number,
): { doc: ResumeDocument; notes: Omission[] } {
  const notes: Omission[] = [];
  const items = doc.items.map((item) => {
    const old =
      item.kind === "experience" &&
      !item.current &&
      item.endYear !== null &&
      item.endYear < todayYear - COLLAPSE_YEARS;
    if (!old) return item;
    if (item.bullets.length <= 1 && item.text === "") return item;
    notes.push({
      what: describeItem(item),
      reason: `Ended more than ${COLLAPSE_YEARS} years ago; shortened to one bullet.`,
    });
    return { ...item, bullets: item.bullets.slice(0, 1), text: "" };
  });
  return { doc: { ...doc, items }, notes };
}
