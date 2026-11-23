import { z } from "zod";

export const SECTION_KINDS = ["intro", "experience", "education", "other"] as const;
export type Kind = (typeof SECTION_KINDS)[number];

export const MAX_DOCUMENT_CHARS = 100_000;

const ItemSchema = z.object({
  heading: z.string().min(1).max(200),
  text: z.string().max(4000),
  bullets: z.array(z.string().min(1).max(600)).max(30),
});

const SectionSchema = z.object({
  title: z.string().max(200),
  kind: z.enum(SECTION_KINDS),
  text: z.string().max(4000),
  items: z.array(ItemSchema).max(40),
});

/** The single definition of a stored Tailored Resume. */
export const ResumeDocumentSchema = z
  .object({
    version: z.literal(1),
    sections: z.array(SectionSchema).max(30),
  })
  .superRefine((doc, ctx) => {
    if (JSON.stringify(doc).length > MAX_DOCUMENT_CHARS) {
      ctx.addIssue({
        code: "custom",
        message: `document exceeds ${MAX_DOCUMENT_CHARS} characters`,
      });
    }
  });

export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>;

export type ParseDocumentResult = { ok: true; doc: ResumeDocument } | { ok: false; path: string };

/** Validates a value; on failure returns the first failing field path, e.g. `sections.2.items.0.heading`. */
export function parseDocument(value: unknown): ParseDocumentResult {
  const parsed = ResumeDocumentSchema.safeParse(value);
  if (parsed.success) return { ok: true, doc: parsed.data };
  const path = parsed.error.issues[0]?.path.join(".") ?? "";
  return { ok: false, path: path || "document" };
}

const PREFIX = /^(?:#{1,6}|[-*]) /;

/** Removes one leading markdown heading or bullet marker (`# `..`###### `, `- `, `* `). */
export function stripPrefix(s: string): string {
  return s.replace(PREFIX, "");
}
