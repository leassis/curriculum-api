import { z } from "zod";
import type { CareerItem } from "../career/item.js";

/**
 * What the model returns: headline, summary and item bodies, keyed by the per-call ids of the
 * annotated Career Body. Every field is required and described; length bounds live in
 * ResumeDocumentSchema, because strict structured output ignores or rejects some JSON Schema keywords.
 */
export const TailorOutputSchema = z.object({
  headline: z
    .string()
    .describe("The resume headline for this job: one plain line, no markdown, no contact details"),
  summary: z
    .string()
    .describe(
      "The professional summary for this job. Plain text with inline markdown only; no headings or bullet markers",
    ),
  items: z
    .array(
      z.object({
        source_id: z
          .string()
          .describe("The id in brackets after the item title in the CV, e.g. c3"),
        text: z
          .string()
          .describe(
            "The rewritten description of that item. Plain text with inline markdown only; no headings or bullet markers; empty when the CV has none",
          ),
        bullets: z
          .array(z.string().describe("One rewritten bullet, without a leading dash or asterisk"))
          .describe("The bullets you keep for that item, most relevant first"),
      }),
    )
    .describe(
      "One entry per item, in the order they should appear within its kind, most relevant to this job first. Return every experience, education, certification, course, skill group and language item; only projects, publications and honours may be left out when they do not help this job. Never invent items or ids",
    ),
  score: z
    .number()
    .int()
    .describe(
      "An integer from 0 to 100 rating how well the original career library fits the job, not the rewritten resume, using the rubric",
    ),
  score_rationale: z
    .string()
    .describe(
      "One short paragraph saying why the library earns that score: what matches the job and what does not",
    ),
  missing_skills: z
    .array(
      z
        .string()
        .describe(
          "One skill, tool or requirement of the job that the career library does not show",
        ),
    )
    .describe(
      "The requirements of the job description that the career library does not meet, most important first; empty when none",
    ),
  omissions: z
    .array(
      z.object({
        what: z
          .string()
          .describe("What was cut: a bullet, a detail, or a whole project, publication or honour"),
        reason: z.string().describe("Why it was cut, in one short sentence"),
      }),
    )
    .describe(
      "Every cut you made inside a kept item, and every project, publication or honour you left out, each with its reason; empty when nothing was cut",
    ),
});

export type TailorOutput = z.infer<typeof TailorOutputSchema>;

export function annotate(items: CareerItem[]): Map<string, string> {
  return new Map(items.map((item, index) => [item.id, `c${index + 1}`]));
}
