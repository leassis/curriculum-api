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

export type ItemOp = "remove" | "up" | "down";

const TARGET = /^s(\d+)\.i(\d+)$/;

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

const byIndex = <T>(m: Map<number, T>): [number, T][] => [...m.entries()].sort(([a], [b]) => a - b);

/** An item operation on the form, its target named by the form's own indices (`s<i>.i<j>`). */
export interface FormOp {
  op: ItemOp;
  target: string;
}

/**
 * Applies an op to the sections as posted, before empty sections are dropped, so the target
 * names the clicked item; edges and unknown targets are no-ops.
 */
function applyFormOp(sections: [number, [number, RawItem][]][], { op, target }: FormOp): void {
  const m = TARGET.exec(target);
  if (!m) return;
  const items = sections.find(([key]) => key === Number(m[1]))?.[1];
  const at = items?.findIndex(([key]) => key === Number(m[2])) ?? -1;
  if (!items || at === -1) return;
  if (op === "remove") {
    items.splice(at, 1);
    return;
  }
  const other = op === "up" ? at - 1 : at + 1;
  const a = items[at];
  const b = items[other];
  if (!a || !b) return;
  items[at] = b;
  items[other] = a;
}

/**
 * Builds a candidate Resume Document from the editor form. Sections are read in numeric key
 * order, bullets split on newlines with blank lines dropped, and a section with no items and
 * no text is dropped. An `op` acts on the form as posted, before that drop. The result is
 * unvalidated: pass it to `parseDocument`.
 */
export function documentFromForm(body: Record<string, unknown>, op?: FormOp): unknown {
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

  const ordered = byIndex(sections);
  const itemsOf = ordered.map(([key, s]): [number, [number, RawItem][]] => [key, byIndex(s.items)]);
  if (op) applyFormOp(itemsOf, op);

  const built = ordered.flatMap(([, s], n) => {
    const items = (itemsOf[n]?.[1] ?? []).map(([, i]) => ({
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
