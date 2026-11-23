import { randomUUID } from "node:crypto";
import { endLabel, groupByKind, META_SEPARATOR, MONTHS, metaLine } from "./display";
import {
  type CareerItem,
  CareerItemSchema,
  KIND_META,
  KINDS,
  type Kind,
  normalizeItem,
} from "./item";

const WRAPPED_FIRST_LINE = /^\\*\*.*\*$/;

function escapeFirstLine(text: string): string {
  return WRAPPED_FIRST_LINE.test(text.split("\n")[0] ?? "") ? `\\${text}` : text;
}

function renderItem(item: CareerItem, ids?: Map<string, string>): string {
  const tag = ids?.get(item.id);
  const lines = [`### ${item.title}${tag ? ` [${tag}]` : ""}`];
  if (item.kind === "skill_group") {
    lines.push(item.skills.join(", "));
    return lines.join("\n");
  }
  const meta = metaLine(item);
  if (meta) lines.push(`*${meta}*`);
  if (item.text) lines.push(escapeFirstLine(item.text));
  for (const bullet of item.bullets) lines.push(`- ${bullet}`);
  if (item.skills.length) lines.push(`Stack: ${item.skills.join(", ")}`);
  return lines.join("\n");
}

export function renderItemsMarkdown(items: CareerItem[], ids?: Map<string, string>): string {
  return groupByKind(items)
    .filter((group) => group.items.length)
    .map((group) =>
      [`## ${group.section}`, ...group.items.map((item) => renderItem(item, ids))].join("\n\n"),
    )
    .join("\n\n");
}

export type ParseResult =
  | { ok: true; items: CareerItem[] }
  | { ok: false; line: number; reason: string };

interface Draft {
  line: number;
  kind: Kind;
  title: string;
  body: string[];
}

interface Dates {
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  current: boolean;
}

const DATE = new RegExp(`^(?:(${MONTHS.join("|")}) )?(\\d{4})$`);
const ESCAPED_FIRST_LINE = /^\\+\*.*\*$/;
const META_LINE = /^\*.*\*$/;

function parseDate(raw: string): { year: number; month: number | null } | null {
  const match = DATE.exec(raw);
  if (!match) return null;
  const month = match[1] ? MONTHS.indexOf(match[1] as (typeof MONTHS)[number]) + 1 : null;
  return { year: Number(match[2]), month };
}

function parseRange(raw: string, kind: Kind): Dates | null {
  const dates: Dates = {
    startYear: null,
    startMonth: null,
    endYear: null,
    endMonth: null,
    current: false,
  };
  const dash = /^[–-] |\s[–-]\s/.exec(raw);
  const startRaw = dash ? raw.slice(0, dash.index) : raw;
  const endRaw = dash ? raw.slice(dash.index + dash[0].length) : "";
  if (startRaw) {
    const start = parseDate(startRaw);
    if (!start) return null;
    dates.startYear = start.year;
    dates.startMonth = start.month;
  }
  if (dash && endRaw === endLabel(kind)) {
    dates.current = true;
  } else if (dash) {
    const end = parseDate(endRaw);
    if (!end) return null;
    dates.endYear = end.year;
    dates.endMonth = end.month;
  }
  return dates;
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fromMeta(kind: Kind, inner: string): Partial<CareerItem> | string {
  if (kind === "language") return { level: inner };
  const parts = inner.split(META_SEPARATOR);
  const dates = parseRange(parts[parts.length - 1] ?? "", kind);
  const names = dates ? parts.slice(0, -1) : parts;
  const slots = kind === "experience" ? 2 : 1;
  if (names.length > slots) return `date not recognised: "${parts[parts.length - 1]}"`;
  return { organisation: names[0] ?? "", location: names[1] ?? "", ...dates };
}

function fromBody(kind: Kind, body: string[]): Partial<CareerItem> | string {
  if (kind === "skill_group") return { skills: splitList(body.join(",")) };
  const lines = [...body];
  while (lines[0]?.trim() === "") lines.shift();
  let item: Partial<CareerItem> = {};
  const first = lines[0];
  if (first !== undefined && META_LINE.test(first) && first.length > 1) {
    const meta = fromMeta(kind, first.slice(1, -1));
    if (typeof meta === "string") return meta;
    item = meta;
    lines.shift();
  }
  const text: string[] = [];
  const bullets: string[] = [];
  let skills: string[] = [];
  for (const line of lines) {
    if (line.trim() === "" && text.length === 0) continue;
    if (line.startsWith("- ")) bullets.push(line.slice(2).trim());
    else if (KIND_META[kind].fields.includes("skills") && line.startsWith("Stack: ")) {
      skills = splitList(line.slice("Stack: ".length));
    } else text.push(text.length === 0 && ESCAPED_FIRST_LINE.test(line) ? line.slice(1) : line);
  }
  return { ...item, text: text.join("\n").trim(), bullets, skills };
}

function keyOf(item: { kind: Kind; title: string; organisation: string }): string {
  return `${item.kind}|${item.title.toLowerCase()}|${item.organisation.toLowerCase()}`;
}

export function parseItemsMarkdown(md: string, existing: CareerItem[]): ParseResult {
  const drafts: Draft[] = [];
  let kind: Kind | null = null;
  let draft: Draft | null = null;
  const lines = md.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const n = index + 1;
    const section = /^## (.*)$/.exec(line);
    const heading = /^### (.*)$/.exec(line);
    if (section) {
      const name = (section[1] ?? "").trim().toLowerCase();
      kind = KINDS.find((k) => KIND_META[k].section.toLowerCase() === name) ?? null;
      if (!kind)
        return { ok: false, line: n, reason: `unknown section "${(section[1] ?? "").trim()}"` };
      draft = null;
    } else if (heading) {
      if (!kind) return { ok: false, line: n, reason: "item outside a section" };
      draft = { line: n, kind, title: (heading[1] ?? "").trim(), body: [] };
      drafts.push(draft);
    } else if (draft) {
      draft.body.push(line);
    } else if (line.trim() !== "") {
      return { ok: false, line: n, reason: "text outside an item" };
    }
  }

  const used = new Set<string>();
  const items: CareerItem[] = [];
  for (const d of drafts) {
    const parsed = fromBody(d.kind, d.body);
    if (typeof parsed === "string") return { ok: false, line: d.line, reason: parsed };
    const key = keyOf({ kind: d.kind, title: d.title, organisation: parsed.organisation ?? "" });
    const reused = existing.find((e) => !used.has(e.id) && keyOf(e) === key);
    const id = reused?.id ?? randomUUID();
    used.add(id);
    const item = normalizeItem({ ...parsed, id, kind: d.kind, title: d.title });
    const checked = CareerItemSchema.safeParse(item);
    if (!checked.success) {
      return {
        ok: false,
        line: d.line,
        reason: checked.error.issues[0]?.message ?? "invalid item",
      };
    }
    items.push(checked.data);
  }
  return { ok: true, items };
}
