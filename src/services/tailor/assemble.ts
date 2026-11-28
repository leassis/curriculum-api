import { randomUUID } from "node:crypto";
import { type CareerItem, KIND_META, KINDS } from "../career/item.js";
import { cleanLine, cleanText, parseDocument, type ResumeDocument } from "./document.js";
import type { TailorOutput } from "./output.js";

export type AssembleFailure = "unknown_id" | "duplicate_id" | "schema";
export type AssembleResult =
  | { ok: true; doc: ResumeDocument; restored: CareerItem[] }
  | { ok: false; reason: AssembleFailure };

const RESTORED_KINDS: readonly string[] = [
  "experience",
  "education",
  "certification",
  "course",
  "skill_group",
  "language",
];

/** The model's text, except where the library item has none: the CV is the only source of facts. */
function textOf(item: CareerItem, returned: string): string {
  if (!KIND_META[item.kind].fields.includes("text")) return item.text;
  return item.text.trim() === "" ? "" : cleanText(returned);
}

function bodyOf(item: CareerItem, returned?: TailorOutput["items"][number]) {
  const meta = KIND_META[item.kind];
  if (!returned) return { text: item.text, bullets: item.bullets };
  return {
    text: textOf(item, returned.text),
    bullets: meta.fields.includes("bullets")
      ? returned.bullets.map(cleanLine).filter((b) => b !== "")
      : item.bullets,
  };
}

/**
 * Builds the Resume Document from the Career Library. Typed fields are copied by code; the model
 * supplies the headline, the summary, item order per kind, and text and bullets only.
 */
export function assemble(
  library: CareerItem[],
  ids: Map<string, string>,
  out: TailorOutput,
): AssembleResult {
  const byTag = new Map(library.map((item) => [ids.get(item.id), item]));
  const seen = new Set<string>();
  const kept: ResumeDocument["items"] = [];
  for (const returned of out.items) {
    const source = byTag.get(returned.source_id);
    if (!source) return { ok: false, reason: "unknown_id" };
    if (seen.has(source.id)) return { ok: false, reason: "duplicate_id" };
    seen.add(source.id);
    kept.push({ ...source, ...bodyOf(source, returned), id: randomUUID(), sourceId: source.id });
  }
  const restored = library.filter(
    (item) => RESTORED_KINDS.includes(item.kind) && !seen.has(item.id),
  );
  const restoredItems = restored.map((item) => ({
    ...item,
    id: randomUUID(),
    sourceId: item.id,
  }));
  const items = [...kept, ...restoredItems].sort(
    (a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind),
  );
  const result = parseDocument({
    version: 2,
    headline: cleanLine(out.headline),
    summary: cleanText(out.summary),
    items,
  });
  return result.ok ? { ok: true, doc: result.doc, restored } : { ok: false, reason: "schema" };
}
