import { describe, expect, it } from "vitest";
import { groupByKind } from "../../../../src/services/career/display";
import {
  type CareerItem,
  CareerLibrarySchema,
  KIND_META,
  KINDS,
  type Kind,
} from "../../../../src/services/career/item";
import { parseItemsMarkdown, renderItemsMarkdown } from "../../../../src/services/career/markdown";
import { item, sampleLibrary } from "../../../support/career";
import { SAMPLE_MARKDOWN } from "../../../support/career-markdown";

describe("library markdown", () => {
  it("renders the sample library in the convention", () => {
    expect(renderItemsMarkdown(sampleLibrary().items)).toBe(SAMPLE_MARKDOWN);
  });

  it("renders sections in kind order and skips empty kinds", () => {
    const md = renderItemsMarkdown([item("language"), item("experience")]);
    expect(md.match(/^## .*$/gm)).toEqual(["## Experience", "## Languages"]);
    expect(renderItemsMarkdown([])).toBe("");
  });

  it("writes a skill group as a plain comma line and a language level as its meta line", () => {
    const md = renderItemsMarkdown([
      item("skill_group", { title: "Backend", skills: ["Go", "SQL"] }),
      item("language", { title: "English", level: "Fluent" }),
    ]);
    expect(md).toBe("## Skills\n\n### Backend\nGo, SQL\n\n## Languages\n\n### English\n*Fluent*");
  });

  it("omits the meta line when a kind has no parts to show", () => {
    expect(renderItemsMarkdown([item("honour", { title: "Award", text: "Won it." })])).toBe(
      "## Honours\n\n### Award\nWon it.",
    );
  });

  it("escapes a text first line that looks like a meta line", () => {
    const md = renderItemsMarkdown([item("honour", { title: "Award", text: "*looks meta*" })]);
    expect(md).toBe("## Honours\n\n### Award\n\\*looks meta*");
    const twice = renderItemsMarkdown([item("honour", { title: "Award", text: "\\*x*" })]);
    expect(twice).toBe("## Honours\n\n### Award\n\\\\*x*");
  });

  it("tags titles with the ids it is given", () => {
    const first = item("experience", { title: "A" });
    const ids = new Map([[first.id, "c1"]]);
    expect(renderItemsMarkdown([first], ids)).toContain("### A [c1]\n");
  });
});

function parsed(md: string, existing: CareerItem[] = []): CareerItem[] {
  const result = parseItemsMarkdown(md, existing);
  if (!result.ok) throw new Error(`line ${result.line}: ${result.reason}`);
  return result.items;
}

function failure(md: string, existing: CareerItem[] = []) {
  const result = parseItemsMarkdown(md, existing);
  if (result.ok) throw new Error("expected a parse error");
  return { line: result.line, reason: result.reason };
}

function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const WORDS = [
  "Alpha",
  "beta",
  "Gamma",
  "delta",
  "Epsilon",
  "zeta",
  "Théta",
  "io-ta",
  "Kappa",
  "x",
];
const FIRST_LINES = ["Plain text", "*wrapped*", "\\*already escaped*", "Stack overflow tales", "a"];

function generateItem(random: () => number, kind: Kind): CareerItem {
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const words = (max: number) =>
    Array.from({ length: 1 + Math.floor(random() * max) }, () => pick(WORDS)).join(" ");
  const meta = KIND_META[kind];
  const has = (field: (typeof meta.fields)[number]) => meta.fields.includes(field);
  const startYear = has("startYear") && random() < 0.85 ? 1990 + Math.floor(random() * 30) : null;
  const startMonth = startYear && random() < 0.5 ? 1 + Math.floor(random() * 11) : null;
  const current = has("current") && random() < 0.3;
  let endYear: number | null = null;
  let endMonth: number | null = null;
  if (has("endYear") && !current && random() < 0.7) {
    endYear = (startYear ?? 2000) + Math.floor(random() * 5);
    if (random() < 0.5) {
      endMonth =
        endYear === startYear && startMonth
          ? startMonth + Math.floor(random() * (13 - startMonth))
          : 1 + Math.floor(random() * 12);
    }
  }
  const lines: string[] = [];
  if (has("text") && random() < 0.7) {
    lines.push(pick(FIRST_LINES));
    if (random() < 0.4) lines.push("");
    if (random() < 0.5) lines.push(words(6));
  }
  return item(kind, {
    title: words(3),
    organisation: has("organisation") && random() < 0.8 ? words(2) : "",
    location: has("location") && random() < 0.5 ? words(2) : "",
    startYear,
    startMonth,
    endYear,
    endMonth,
    current,
    text: lines.join("\n").trim(),
    bullets: has("bullets") ? Array.from({ length: Math.floor(random() * 4) }, () => words(5)) : [],
    skills: has("skills") ? Array.from({ length: Math.floor(random() * 4) }, () => words(1)) : [],
    level: has("level") ? words(2) : "",
  });
}

function generateLibrary(random: () => number, size: number): CareerItem[] {
  const items: CareerItem[] = [];
  for (const kind of KINDS) {
    for (let i = 0; i < size; i++) {
      const candidate = generateItem(random, kind);
      if (kind === "skill_group")
        candidate.skills = candidate.skills.length ? candidate.skills : ["Go"];
      if (kind === "experience" && !candidate.organisation) candidate.organisation = "Acme";
      if (kind === "experience" && candidate.startYear === null) candidate.startYear = 2000;
      if (kind === "project" && candidate.startYear === null) candidate.startYear = 2000;
      if (
        (kind === "education" || kind === "certification" || kind === "course") &&
        !candidate.organisation
      ) {
        candidate.organisation = "School";
      }
      items.push(candidate);
    }
  }
  return items;
}

describe("library markdown parsing", () => {
  it("parses the sample markdown back into the sample library", () => {
    const library = sampleLibrary().items;
    expect(parsed(SAMPLE_MARKDOWN, library)).toEqual(library);
  });

  it("keeps the order of the markdown", () => {
    const md = "## Experience\n\n### Second\n*Org · 2020*\n\n### First\n*Org · 2019*";
    expect(parsed(md).map((i) => i.title)).toEqual(["Second", "First"]);
  });

  it("reads dates, months and the ongoing end per kind", () => {
    const [exp, cert] = parsed(
      "## Experience\n\n### E\n*Org · Remote · Jan 2020 - Present*\n\n## Certifications\n\n### C\n*Issuer · Mar 2021 – No expiry*",
    );
    expect(exp).toMatchObject({
      organisation: "Org",
      location: "Remote",
      startYear: 2020,
      startMonth: 1,
      current: true,
      endYear: null,
    });
    expect(cert).toMatchObject({ organisation: "Issuer", startMonth: 3, current: true });
  });

  it("reuses ids by kind title and organisation", () => {
    const kept = item("experience", { title: "Engineer", organisation: "Acme" });
    const other = item("experience", { title: "Engineer", organisation: "Globex" });
    const md =
      "## Experience\n\n### engineer\n*ACME · 2020*\n\n### Engineer\n*Initech · 2019*\n\n### Engineer\n*Globex · 2018*";
    const items = parsed(md, [kept, other]);
    expect(items.map((i) => i.id)).toEqual([kept.id, expect.any(String), other.id]);
    expect(items[1]?.id).not.toBe(kept.id);
    expect(items[1]?.id).not.toBe(other.id);
    expect(new Set(items.map((i) => i.id)).size).toBe(3);
  });

  it("gives two parsed items with one key two different existing ids", () => {
    const a = item("honour", { title: "Award" });
    const b = item("honour", { title: "Award" });
    expect(parsed("## Honours\n\n### Award\n\n### Award", [a, b]).map((i) => i.id)).toEqual([
      a.id,
      b.id,
    ]);
  });

  it("reports the line of a convention error", () => {
    expect(failure("## Hobbies\n\n### Chess")).toEqual({
      line: 1,
      reason: 'unknown section "Hobbies"',
    });
    expect(failure("### Lonely\n*Org · 2020*")).toEqual({
      line: 1,
      reason: "item outside a section",
    });
    expect(failure("## Experience\n\n### E\n*Acme · Remote · sometime*")).toEqual({
      line: 3,
      reason: 'date not recognised: "sometime"',
    });
    expect(failure("## Projects\n\n### P\n*Org · Smarch 2020*").line).toBe(3);
    expect(failure("## Education\n\n### E\n*Uni · 2012 – Present*").reason).toContain(
      "date not recognised",
    );
    expect(failure("intro text\n## Experience")).toEqual({
      line: 1,
      reason: "text outside an item",
    });
  });

  it("reports a field rule at the item line", () => {
    const md = "## Education\n\n### Fine\n*Uni · 2012*\n\n### Broken\n*Uni · 2016 – 2012*";
    expect(failure(md)).toEqual({ line: 6, reason: "End date is before start date" });
    expect(failure("## Experience\n\n### No company\n*2020*")).toEqual({
      line: 3,
      reason: "Company is required",
    });
    expect(failure("## Skills\n\n### Empty\n")).toEqual({ line: 3, reason: "Skills is required" });
    expect(failure("## Projects\n\n### P\n*Org · 1900*")).toEqual({
      line: 3,
      reason: "Start year is out of range",
    });
  });

  it("accepts an empty markdown as an empty library", () => {
    expect(parsed("")).toEqual([]);
    expect(parsed("\n\n")).toEqual([]);
  });

  it("round trips generated libraries", () => {
    const random = rng(20261123);
    for (let run = 0; run < 220; run++) {
      const library = generateLibrary(random, 1 + Math.floor(random() * 2));
      const valid = CareerLibrarySchema.safeParse({ version: 1, items: library });
      expect(valid.error?.issues[0], `run ${run}`).toBeUndefined();
      const md = renderItemsMarkdown(library);
      expect(parseItemsMarkdown(md, library), `run ${run}\n${md}`).toEqual({
        ok: true,
        items: library,
      });
      expect(parseItemsMarkdown(md, []).ok).toBe(true);
    }
  });

  it("round trips an interleaved library with each kind in its order", () => {
    const [a, b, c] = [
      item("experience", { title: "A" }),
      item("education", { title: "B" }),
      item("experience", { title: "C" }),
    ] as [CareerItem, CareerItem, CareerItem];
    const result = parseItemsMarkdown(renderItemsMarkdown([a, b, c]), [a, b, c]);
    expect(result).toEqual({
      ok: true,
      items: groupByKind([a, b, c]).flatMap((g) => g.items),
    });
  });
});
