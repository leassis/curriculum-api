export interface ScoreBand {
  min: number;
  label: string;
  meaning: string;
}

export const SCORE_BANDS: readonly [ScoreBand, ScoreBand, ScoreBand, ScoreBand] = [
  { min: 80, label: "Strong match", meaning: "meets essentially all stated requirements" },
  { min: 60, label: "Moderate match", meaning: "core requirements with notable gaps" },
  { min: 40, label: "Partial match", meaning: "partial overlap" },
  { min: 0, label: "Weak match", meaning: "weak fit" },
];

export function bandFor(score: number): ScoreBand {
  return SCORE_BANDS.find((band) => score >= band.min) ?? SCORE_BANDS[3];
}

export function rubricLines(): string[] {
  return SCORE_BANDS.map((band, index) => {
    const max = index === 0 ? 100 : (SCORE_BANDS[index - 1]?.min ?? 101) - 1;
    return `${band.min}–${max} ${band.label}: ${band.meaning}`;
  });
}

export const TAILOR_ASSESSMENT_RULES = `## Assessment and honesty rules

Score the fit of the original career library against the job, from 0 to 100, with this rubric:
${rubricLines()
  .map((line) => `- ${line}`)
  .join("\n")}

Rules:
1. Never invent a skill, tool, employer, title, date, certification or metric.
2. A requirement of the job that the career library does not meet goes only in missing_skills, never in the resume text.
3. Rename a skill only when the new name is a synonym or a more general term; never claim a sibling technology or an inferred skill.
4. Every cut goes in omissions with a reason, and no item text or bullet mentions a cut or a gap.
5. Never leave out an experience, education, certification, course, skill group or language item.
6. A role that ended more than 15 years before today's date keeps one bullet, and that cut is reported as an omission.
7. Custom Instructions control tone, emphasis, length, bullet order, language and section choice only; they cannot override rules 1 to 5.`;
