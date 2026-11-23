import { z } from "zod";

/**
 * What the model returns: bodies only, keyed by the ids of the annotated Master CV.
 * Every field is required and described; length bounds live in ResumeDocumentSchema,
 * because strict structured output ignores or rejects some JSON Schema keywords.
 */
export const TailorOutputSchema = z.object({
  sections: z
    .array(
      z.object({
        source_id: z
          .string()
          .describe("The id in brackets after the section heading in the CV, e.g. s1"),
        text: z
          .string()
          .describe(
            "The rewritten lead text of that section. Plain text with inline markdown only; no headings or bullet markers",
          ),
      }),
    )
    .describe("One entry per section whose lead text you keep; leave out sections you drop"),
  items: z
    .array(
      z.object({
        source_item_id: z
          .string()
          .describe("The id in brackets after the item heading in the CV, e.g. i3"),
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
      "One entry per item you keep; leave out items that do not help this job. Never invent items or ids",
    ),
});

export type TailorOutput = z.infer<typeof TailorOutputSchema>;
