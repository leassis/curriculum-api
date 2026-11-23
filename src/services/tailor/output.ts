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
      "One entry per item you keep, in the order they should appear; leave out items that do not help this job. Never invent items or ids",
    ),
});

export type TailorOutput = z.infer<typeof TailorOutputSchema>;

export function annotate(items: CareerItem[]): Map<string, string> {
  return new Map(items.map((item, index) => [item.id, `c${index + 1}`]));
}
