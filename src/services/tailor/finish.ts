import type { CareerItem } from "../career/item.js";
import { type AssembleFailure, assemble } from "./assemble.js";
import {
  type Assessment,
  checkAssessment,
  collapseOldRoles,
  filterMissingSkills,
  restoreNote,
} from "./assessment.js";
import { cleanLine, type ResumeDocument } from "./document.js";
import type { TailorOutput } from "./output.js";
import { shortJobDescription } from "./short-description.js";

export type FinishResult =
  | {
      ok: true;
      doc: ResumeDocument;
      assessment: Assessment;
      jobDescriptionShort: string | null;
      restored: number;
      collapsed: number;
    }
  | { ok: false; reason: AssembleFailure | "assessment" };

/**
 * Turns the model's output into the stored document and assessment: assembles the document,
 * shortens old roles, and orders omissions as the model's cuts, then code's restores, then code's
 * collapses.
 */
export function finish(
  library: CareerItem[],
  ids: Map<string, string>,
  out: TailorOutput,
  today: Date,
): FinishResult {
  const assembled = assemble(library, ids, out);
  if (!assembled.ok) return assembled;
  if (!checkAssessment(out)) return { ok: false, reason: "assessment" };
  const { doc, notes: collapseNotes } = collapseOldRoles(assembled.doc, today.getUTCFullYear());
  const restoreNotes = assembled.restored.filter((i) => i.kind === "experience").map(restoreNote);
  const otherTitles = library
    .filter((i) => i.kind !== "experience")
    .map((i) => i.title.trim().toLowerCase())
    .filter((t) => t !== "");
  // What was left out lists experience only: drop model omissions that name a non-experience item.
  const modelCuts = out.omissions.filter((o) => {
    const what = o.what.toLowerCase();
    return !otherTitles.some((t) => what.includes(t));
  });
  return {
    ok: true,
    doc,
    assessment: {
      score: out.score,
      rationale: cleanLine(out.score_rationale),
      missingSkills: filterMissingSkills(out.missing_skills, library),
      omissions: [
        ...modelCuts.map((o) => ({ what: cleanLine(o.what), reason: cleanLine(o.reason) })),
        ...restoreNotes,
        ...collapseNotes,
      ],
    },
    jobDescriptionShort: shortJobDescription(out.job_description_short),
    restored: restoreNotes.length,
    collapsed: collapseNotes.length,
  };
}
