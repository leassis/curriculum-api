import { describe, expect, it } from "vitest";
import { parseMasterCv, sectionKind } from "../../../../src/services/tailor/parse-cv";

const CV = `# Jane Doe

Backend engineer.

## Experience

Ten years in platforms.

### Staff Engineer — Globex
2020-2024
- Cut latency
* Mentored engineers

### Engineer — Initech
- Built billing

## Skills

TypeScript, Go
`;

function parsed(md: string) {
  const p = parseMasterCv(md);
  if (!p) throw new Error("expected a parse");
  const section = (i: number) => {
    const s = p.sections[i];
    if (!s) throw new Error(`no section ${i}`);
    return s;
  };
  const item = (i: number, j: number) => {
    const it = section(i).items[j];
    if (!it) throw new Error(`no item ${i}.${j}`);
    return it;
  };
  return { ...p, section, item };
}

describe("parse master cv", () => {
  it("returns null without any ## heading", () => {
    expect(parseMasterCv("# Name\n\n### Item\n- x")).toBeNull();
    expect(parseMasterCv("")).toBeNull();
  });

  it("assigns ids in source order and kinds ignoring case and accents", () => {
    const p = parsed(CV);
    expect(p.sections.map((s) => [s.id, s.kind, s.title])).toEqual([
      ["s0", "intro", ""],
      ["s1", "experience", "Experience"],
      ["s2", "other", "Skills"],
    ]);
    expect(p.section(0).text).toBe("# Jane Doe\n\nBackend engineer.");
    expect(p.section(1).items.map((i) => [i.id, i.heading])).toEqual([
      ["i1", "Staff Engineer — Globex"],
      ["i2", "Engineer — Initech"],
    ]);

    const pt = parsed(
      "## EXPERIÊNCIA PROFISSIONAL\n\n## Formação Acadêmica\n\n## Educação\n\n## education\n\n## Hobbies",
    );
    expect(pt.sections.map((s) => s.kind)).toEqual([
      "experience",
      "education",
      "education",
      "education",
      "other",
    ]);
    expect(pt.sections.map((s) => s.id)).toEqual(["s0", "s1", "s2", "s3", "s4"]);

    const dup = parsed("## Experience\n### Dev\n- a\n### Dev\n- b\n## Experience\n### Dev\n- c");
    expect(dup.sections.map((s) => s.id)).toEqual(["s0", "s1"]);
    expect(dup.sections.flatMap((s) => s.items.map((i) => i.id))).toEqual(["i1", "i2", "i3"]);
  });

  it("splits item bullets from text and removes markers", () => {
    const item = parsed(CV).item(1, 0);
    expect(item.text).toBe("2020-2024");
    expect(item.bullets).toEqual(["Cut latency", "Mentored engineers"]);
  });

  it("keeps deeper headings in item text and lead text in sections without items", () => {
    const p = parsed(
      "## Experience\n\n### Dev\n#### Stack\nNode\n- x\n\n## Skills\n\nTypeScript, Go\n",
    );
    expect(p.item(0, 0).text).toBe("#### Stack\nNode");
    expect(p.item(0, 0).bullets).toEqual(["x"]);
    expect(p.section(1).text).toBe("TypeScript, Go");
    expect(p.section(1).items).toEqual([]);
    expect(p.section(0).text).toBe("");
  });

  it("handles a CV that starts at the first section", () => {
    const p = parsed("## Experience\n### Dev\n- x");
    expect(p.sections).toHaveLength(1);
    expect(p.section(0).id).toBe("s0");
    expect(p.annotated).toBe("## Experience [s0]\n### Dev [i1]\n- x");
  });

  it("annotates headings with their ids and the intro with s0", () => {
    const { annotated } = parsed(CV);
    expect(annotated.startsWith("[s0]\n# Jane Doe")).toBe(true);
    expect(annotated).toContain("## Experience [s1]");
    expect(annotated).toContain("### Staff Engineer — Globex [i1]");
    expect(annotated).toContain("### Engineer — Initech [i2]");
    expect(annotated).toContain("## Skills [s2]");
    expect(annotated).toContain("- Cut latency");
  });
});

describe("section kind", () => {
  it("matches the English and Portuguese lists ignoring case and accents", () => {
    for (const t of [
      "Experience",
      "Work Experience",
      "Professional Experience",
      "Employment",
      "Experiência",
      "experiencia PROFISSIONAL",
    ]) {
      expect(sectionKind(t)).toBe("experience");
    }
    for (const t of ["Education", "Formação", "Formacao Academica", "EDUCAÇÃO"]) {
      expect(sectionKind(t)).toBe("education");
    }
    expect(sectionKind("Experience Summary")).toBe("other");
  });
});
