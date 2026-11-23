import type { Kind } from "./document.js";

export interface ParsedItem {
  id: string;
  heading: string;
  text: string;
  bullets: string[];
}

export interface ParsedSection {
  id: string;
  title: string;
  kind: Kind;
  text: string;
  items: ParsedItem[];
}

export interface ParsedCv {
  sections: ParsedSection[];
  /** The Master CV with each `## ` / `### ` line suffixed by its id, for the model. */
  annotated: string;
}

const EXPERIENCE = new Set([
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "experiencia",
  "experiencia profissional",
]);
const EDUCATION = new Set(["education", "formacao", "formacao academica", "educacao"]);

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Kind of a `## ` section by its title, ignoring case and accents (intro is assigned by the parser). */
export function sectionKind(title: string): Kind {
  const t = normalize(title);
  if (EXPERIENCE.has(t)) return "experience";
  if (EDUCATION.has(t)) return "education";
  return "other";
}

const BULLET = /^\s*[-*] +(.*)$/;

function splitBody(lines: string[]): { text: string; bullets: string[] } {
  const text: string[] = [];
  const bullets: string[] = [];
  for (const line of lines) {
    const b = BULLET.exec(line);
    if (b) {
      const bullet = (b[1] ?? "").trim();
      if (bullet) bullets.push(bullet);
    } else if (line.trim()) text.push(line.trim());
  }
  return { text: text.join("\n"), bullets };
}

/** Parses the Master CV into sections and items; null when it has no `## ` heading. */
export function parseMasterCv(md: string): ParsedCv | null {
  const lines = md.split(/\r?\n/);
  const first = lines.findIndex((l) => l.startsWith("## "));
  if (first === -1) return null;

  const intro = lines.slice(0, first).join("\n").trim();
  const sections: ParsedSection[] = [];
  const annotatedLines: string[] = [];
  if (intro) {
    sections.push({ id: "s0", title: "", kind: "intro", text: intro, items: [] });
    annotatedLines.push("[s0]");
  }
  annotatedLines.push(...lines.slice(0, first));

  let section: ParsedSection | null = null;
  let lead: string[] = [];
  let itemLines: string[] = [];
  let item: ParsedItem | null = null;
  let itemCount = 0;

  const closeItem = () => {
    if (item) Object.assign(item, splitBody(itemLines));
    item = null;
    itemLines = [];
  };
  const closeSection = () => {
    closeItem();
    if (section) section.text = lead.join("\n").trim();
    lead = [];
  };

  for (const line of lines.slice(first)) {
    if (line.startsWith("## ")) {
      closeSection();
      const title = line.slice(3).trim();
      section = { id: `s${sections.length}`, title, kind: sectionKind(title), text: "", items: [] };
      sections.push(section);
      annotatedLines.push(`${line} [${section.id}]`);
    } else if (section && line.startsWith("### ")) {
      closeItem();
      itemCount += 1;
      item = { id: `i${itemCount}`, heading: line.slice(4).trim(), text: "", bullets: [] };
      section.items.push(item);
      annotatedLines.push(`${line} [${item.id}]`);
    } else {
      (item ? itemLines : lead).push(line);
      annotatedLines.push(line);
    }
  }
  closeSection();

  return { sections, annotated: annotatedLines.join("\n") };
}
