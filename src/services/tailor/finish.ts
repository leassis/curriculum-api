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

export type FinishResult =
  | { ok: true; doc: ResumeDocument; assessment: Assessment; restored: number; collapsed: number }
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
  const restoreNotes = assembled.restored.map(restoreNote);
  return {
    ok: true,
    doc,
    assessment: {
      score: out.score,
      rationale: cleanLine(out.score_rationale),
      missingSkills: filterMissingSkills(out.missing_skills, library),
      omissions: [
        ...out.omissions.map((o) => ({ what: cleanLine(o.what), reason: cleanLine(o.reason) })),
        ...restoreNotes,
        ...collapseNotes,
      ],
    },
    restored: restoreNotes.length,
    collapsed: collapseNotes.length,
  };
}
