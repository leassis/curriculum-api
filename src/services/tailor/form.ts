import type { ResumeDocument } from "./document.js";

type Leaf = string;

/** Flattens Hono's `parseBody({ dot: true })` objects (or already dotted keys) into `a.b.c` -> string. */
function flatten(value: unknown, prefix: string, out: Map<string, Leaf>): void {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    return;
  }
  const leaf = Array.isArray(value) ? value.at(-1) : value;
  if (typeof leaf === "string") out.set(prefix, leaf);
}

const SECTION_KEY = /^sections\.(\d+)\.(title|kind|text)$/;
const ITEM_KEY = /^sections\.(\d+)\.items\.(\d+)\.(heading|text|bullets)$/;

interface RawItem {
  heading?: string;
  text?: string;
  bullets?: string;
}
interface RawSection {
  title?: string;
  kind?: string;
  text?: string;
  items: Map<number, RawItem>;
}

const byIndex = <T>(m: Map<number, T>): T[] =>
  [...m.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);

/**
 * Builds a candidate Resume Document from the editor form. Sections are read in numeric key
 * order, bullets split on newlines with blank lines dropped, and a section with no items and
 * no text is dropped. The result is unvalidated: pass it to `parseDocument`.
 */
export function documentFromForm(body: Record<string, unknown>): unknown {
  const flat = new Map<string, Leaf>();
  flatten(body, "", flat);

  const sections = new Map<number, RawSection>();
  const section = (i: number): RawSection => {
    let s = sections.get(i);
    if (!s) {
      s = { items: new Map() };
      sections.set(i, s);
    }
    return s;
  };

  for (const [key, value] of flat) {
    const sm = SECTION_KEY.exec(key);
    if (sm) {
      section(Number(sm[1]))[sm[2] as "title" | "kind" | "text"] = value;
      continue;
    }
    const im = ITEM_KEY.exec(key);
    if (im) {
      const s = section(Number(im[1]));
      const j = Number(im[2]);
      const item = s.items.get(j) ?? {};
      item[im[3] as keyof RawItem] = value;
      s.items.set(j, item);
    }
  }

  const built = byIndex(sections).flatMap((s) => {
    const items = byIndex(s.items).map((i) => ({
      heading: (i.heading ?? "").trim(),
      text: (i.text ?? "").trim(),
      bullets: (i.bullets ?? "")
        .split(/\r?\n/)
        .map((b) => b.trim())
        .filter((b) => b !== ""),
    }));
    const text = (s.text ?? "").trim();
    if (items.length === 0 && text === "") return [];
    return [{ title: (s.title ?? "").trim(), kind: s.kind ?? "other", text, items }];
  });
  return { version: 1, sections: built };
}

export type ItemOp = "remove" | "up" | "down";

const TARGET = /^s(\d+)\.i(\d+)$/;

/** Removes an item or swaps it with its neighbour in the same section; edges and bad targets are no-ops. */
export function applyOp(doc: ResumeDocument, op: ItemOp, target: string): ResumeDocument {
  const m = TARGET.exec(target);
  if (!m) return doc;
  const si = Number(m[1]);
  const ii = Number(m[2]);
  const section = doc.sections[si];
  if (!section || ii >= section.items.length) return doc;

  const items = [...section.items];
  if (op === "remove") {
    items.splice(ii, 1);
  } else {
    const other = op === "up" ? ii - 1 : ii + 1;
    const a = items[ii];
    const b = items[other];
    if (!a || !b) return doc;
    items[ii] = b;
    items[other] = a;
  }
  return { ...doc, sections: doc.sections.map((s, i) => (i === si ? { ...s, items } : s)) };
}
