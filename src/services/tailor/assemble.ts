import { cleanLine, cleanText, parseDocument, type ResumeDocument } from "./document.js";
import type { TailorOutput } from "./output.js";
import type { ParsedCv } from "./parse-cv.js";

export type AssembleFailure = "unknown_id" | "duplicate_id" | "schema";
export type AssembleResult =
  | { ok: true; doc: ResumeDocument }
  | { ok: false; reason: AssembleFailure };

/** Indexes returned entries by id; reports an id the source does not have, or one returned twice. */
function index<T>(
  entries: T[],
  idOf: (e: T) => string,
  known: Set<string>,
): Map<string, T> | "unknown_id" | "duplicate_id" {
  const byId = new Map<string, T>();
  let duplicate = false;
  for (const e of entries) {
    const id = idOf(e);
    if (!known.has(id)) return "unknown_id";
    if (byId.has(id)) duplicate = true;
    byId.set(id, e);
  }
  return duplicate ? "duplicate_id" : byId;
}

/**
 * Builds the Resume Document in source order. Titles, kinds and headings come from the parsed
 * Master CV; the model only supplies bodies. Anything the model leaves out is dropped.
 */
export function assemble(parsed: ParsedCv, out: TailorOutput): AssembleResult {
  const sectionIds = new Set(parsed.sections.map((s) => s.id));
  const itemIds = new Set(parsed.sections.flatMap((s) => s.items.map((i) => i.id)));
  const sections = index(out.sections, (s) => s.source_id, sectionIds);
  const items = index(out.items, (i) => i.source_item_id, itemIds);
  if (typeof sections === "string") return { ok: false, reason: sections };
  if (typeof items === "string") return { ok: false, reason: items };

  const built = parsed.sections.flatMap((section) => {
    const keptItems = section.items.flatMap((item) => {
      const returned = items.get(item.id);
      if (!returned) return [];
      return [
        {
          heading: item.heading,
          text: cleanText(returned.text),
          bullets: returned.bullets.map(cleanLine).filter((b) => b !== ""),
        },
      ];
    });
    const text = cleanText(sections.get(section.id)?.text ?? "");
    if (text === "" && keptItems.length === 0) return [];
    return [{ title: section.title, kind: section.kind, text, items: keptItems }];
  });

  const result = parseDocument({ version: 1, sections: built });
  return result.ok ? { ok: true, doc: result.doc } : { ok: false, reason: "schema" };
}
