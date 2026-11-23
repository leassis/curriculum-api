import { describe, expect, it } from "vitest";
import { assemble } from "../../../../src/services/tailor/assemble";
import type { TailorOutput } from "../../../../src/services/tailor/output";
import { type ParsedCv, parseMasterCv } from "../../../../src/services/tailor/parse-cv";
import { renderResumeMarkdown } from "../../../../src/services/tailor/render";

const CV = `Intro line.

## Experience

### Staff Engineer — Globex
- Original bullet

### Engineer — Initech
- Other bullet

## Education

### BSc — State University

## Skills

TypeScript
`;

function source(md = CV): ParsedCv {
  const p = parseMasterCv(md);
  if (!p) throw new Error("expected a parse");
  return p;
}

function out(partial: Partial<TailorOutput>): TailorOutput {
  return { sections: [], items: [], ...partial };
}

function docOf(parsed: ParsedCv, o: TailorOutput) {
  const r = assemble(parsed, o);
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r.doc;
}

describe("assemble", () => {
  it("copies titles kinds and headings from the source in source order", () => {
    const o = out({
      // Returned in reverse order and with bodies that pretend to be other headings.
      items: [
        { source_item_id: "i3", text: "### Fake Heading", bullets: ["- study"] },
        { source_item_id: "i2", text: "", bullets: ["b2"] },
        { source_item_id: "i1", text: "Led things", bullets: ["b1"] },
      ],
      sections: [
        { source_id: "s3", text: "TS and Go" },
        { source_id: "s0", text: "Hello" },
      ],
    });
    const doc = docOf(source(), o);
    expect(doc.version).toBe(1);
    expect(doc.sections.map((s) => [s.title, s.kind])).toEqual([
      ["", "intro"],
      ["Experience", "experience"],
      ["Education", "education"],
      ["Skills", "other"],
    ]);
    expect(doc.sections[1]?.items.map((i) => i.heading)).toEqual([
      "Staff Engineer — Globex",
      "Engineer — Initech",
    ]);
    expect(doc.sections[2]?.items[0]?.heading).toBe("BSc — State University");
    expect(doc.sections[1]?.items[0]).toEqual({
      heading: "Staff Engineer — Globex",
      text: "Led things",
      bullets: ["b1"],
    });
  });

  it("drops items the model left out", () => {
    const doc = docOf(
      source(),
      out({ items: [{ source_item_id: "i2", text: "", bullets: ["kept"] }] }),
    );
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]?.items.map((i) => i.heading)).toEqual(["Engineer — Initech"]);
  });

  it("drops a section with no text and no kept item, and keeps lead text alone", () => {
    const doc = docOf(source(), out({ sections: [{ source_id: "s3", text: "Only skills" }] }));
    expect(doc.sections.map((s) => s.title)).toEqual(["Skills"]);
    expect(doc.sections[0]?.items).toEqual([]);
  });

  it("keeps a section with items but no returned text", () => {
    const doc = docOf(source(), out({ items: [{ source_item_id: "i3", text: "", bullets: [] }] }));
    expect(doc.sections).toEqual([
      {
        title: "Education",
        kind: "education",
        text: "",
        items: [{ heading: "BSc — State University", text: "", bullets: [] }],
      },
    ]);
  });

  it("assembles items with the same heading independently", () => {
    const parsed = source("## Experience\n### Dev\n- a\n### Dev\n- b\n");
    const doc = docOf(
      parsed,
      out({
        items: [
          { source_item_id: "i1", text: "first", bullets: [] },
          { source_item_id: "i2", text: "second", bullets: [] },
        ],
      }),
    );
    expect(doc.sections[0]?.items.map((i) => [i.heading, i.text])).toEqual([
      ["Dev", "first"],
      ["Dev", "second"],
    ]);
    const only2 = docOf(
      parsed,
      out({ items: [{ source_item_id: "i2", text: "second", bullets: [] }] }),
    );
    expect(only2.sections[0]?.items).toHaveLength(1);
  });

  it("strips heading and bullet prefixes from returned strings", () => {
    const doc = docOf(
      source(),
      out({
        sections: [{ source_id: "s0", text: "## Intro text" }],
        items: [
          {
            source_item_id: "i1",
            text: "# Led",
            bullets: ["- one", "* two", "###### three", "-4 not a bullet", "- "],
          },
        ],
      }),
    );
    expect(doc.sections[0]?.text).toBe("Intro text");
    expect(doc.sections[1]?.items[0]).toEqual({
      heading: "Staff Engineer — Globex",
      text: "Led",
      bullets: ["one", "two", "three", "-4 not a bullet"],
    });
  });

  it("strips prefixes on every text line and flattens headings and bullets", () => {
    const doc = docOf(
      source(),
      out({
        sections: [
          { source_id: "s0", text: "Intro\n## Injected Section\n  - listed\r\n* starred" },
        ],
        items: [
          {
            source_item_id: "i1",
            text: "ok\n## Injected Section\n### Fake Role\n###### six\n####### seven\n-not a marker",
            bullets: ["a\n- b", "first\r\n  ### second  \nthird", "- \n"],
          },
        ],
      }),
    );
    expect(doc.sections[0]?.text).toBe("Intro\nInjected Section\nlisted\nstarred");
    expect(doc.sections[1]?.items[0]).toEqual({
      heading: "Staff Engineer — Globex",
      text: "ok\nInjected Section\nFake Role\nsix\n####### seven\n-not a marker",
      bullets: ["a - b", "first ### second third"],
    });
    const md = renderResumeMarkdown(doc);
    expect(md.match(/^#{1,6} .*$/gm)).toEqual(["## Experience", "### Staff Engineer — Globex"]);
    expect(md.match(/^- .*$/gm)).toEqual(["- a - b", "- first ### second third"]);
  });

  it("reports unknown and repeated ids", () => {
    expect(
      assemble(source(), out({ items: [{ source_item_id: "i9", text: "", bullets: [] }] })),
    ).toEqual({ ok: false, reason: "unknown_id" });
    expect(assemble(source(), out({ sections: [{ source_id: "i1", text: "x" }] }))).toEqual({
      ok: false,
      reason: "unknown_id",
    });
    expect(
      assemble(
        source(),
        out({
          items: [
            { source_item_id: "i1", text: "", bullets: [] },
            { source_item_id: "i1", text: "", bullets: [] },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: "duplicate_id" });
    expect(
      assemble(
        source(),
        out({
          sections: [
            { source_id: "s1", text: "a" },
            { source_id: "s1", text: "b" },
          ],
        }),
      ),
    ).toEqual({ ok: false, reason: "duplicate_id" });
  });

  it("reports a document over the bounds as a schema failure", () => {
    const r = assemble(
      source(),
      out({ items: [{ source_item_id: "i1", text: "x".repeat(4001), bullets: [] }] }),
    );
    expect(r).toEqual({ ok: false, reason: "schema" });
  });
});
