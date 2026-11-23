import { describe, expect, it } from "vitest";
import {
  MAX_DOCUMENT_CHARS,
  parseDocument,
  stripPrefix,
} from "../../../../src/services/tailor/document";
import { itemAt, sampleDocument, sectionAt } from "../../../support/resume-document";

type Doc = ReturnType<typeof sampleDocument>;

function failingPath(mutate: (d: Doc) => void): string {
  const doc = sampleDocument();
  mutate(doc);
  const r = parseDocument(doc);
  if (r.ok) throw new Error("expected failure");
  return r.path;
}

describe("resume document schema", () => {
  it("accepts the sample document unchanged", () => {
    const r = parseDocument(sampleDocument());
    expect(r).toEqual({ ok: true, doc: sampleDocument() });
  });

  it("enforces every bound version kind and heading", () => {
    expect(failingPath((d) => ((d as { version: number }).version = 2))).toBe("version");
    expect(failingPath((d) => ((sectionAt(d, 0) as { kind: string }).kind = "skills"))).toBe(
      "sections.0.kind",
    );
    expect(failingPath((d) => (itemAt(d, 1, 0).heading = ""))).toBe("sections.1.items.0.heading");
    expect(failingPath((d) => (itemAt(d, 1, 1).heading = "x".repeat(201)))).toBe(
      "sections.1.items.1.heading",
    );
    expect(failingPath((d) => (sectionAt(d, 1).title = "x".repeat(201)))).toBe("sections.1.title");
    expect(failingPath((d) => (sectionAt(d, 0).text = "x".repeat(4001)))).toBe("sections.0.text");
    expect(failingPath((d) => (itemAt(d, 1, 0).text = "x".repeat(4001)))).toBe(
      "sections.1.items.0.text",
    );
    expect(failingPath((d) => (itemAt(d, 1, 0).bullets = Array(31).fill("b")))).toBe(
      "sections.1.items.0.bullets",
    );
    expect(failingPath((d) => (itemAt(d, 1, 0).bullets[1] = "x".repeat(601)))).toBe(
      "sections.1.items.0.bullets.1",
    );
    expect(failingPath((d) => (itemAt(d, 1, 0).bullets[0] = ""))).toBe(
      "sections.1.items.0.bullets.0",
    );
    expect(
      failingPath((d) => {
        d.sections = Array.from({ length: 31 }, () => ({
          title: "t",
          kind: "other",
          text: "",
          items: [],
        }));
      }),
    ).toBe("sections");
    expect(
      failingPath((d) => {
        sectionAt(d, 1).items = Array.from({ length: 41 }, () => ({
          heading: "h",
          text: "",
          bullets: [],
        }));
      }),
    ).toBe("sections.1.items");
  });

  it("accepts values exactly at the bounds", () => {
    const doc = sampleDocument();
    sectionAt(doc, 0).text = "x".repeat(4000);
    itemAt(doc, 1, 0).heading = "h".repeat(200);
    itemAt(doc, 1, 0).bullets = Array.from({ length: 30 }, () => "b".repeat(600));
    expect(parseDocument(doc).ok).toBe(true);
  });

  it("rejects a document over 100000 characters serialized", () => {
    const doc = sampleDocument();
    doc.sections = Array.from({ length: 30 }, () => ({
      title: "t",
      kind: "other" as const,
      text: "",
      items: [{ heading: "h", text: "x".repeat(4000), bullets: Array(10).fill("y".repeat(600)) }],
    }));
    expect(JSON.stringify(doc).length).toBeGreaterThan(MAX_DOCUMENT_CHARS);
    expect(parseDocument(doc)).toEqual({ ok: false, path: "document" });
  });

  it("reports the first failing path in field order", () => {
    const doc = sampleDocument();
    itemAt(doc, 2, 0).heading = "";
    itemAt(doc, 1, 1).heading = "";
    expect(parseDocument(doc)).toEqual({ ok: false, path: "sections.1.items.1.heading" });
  });

  it("rejects non-objects", () => {
    expect(parseDocument(null)).toEqual({ ok: false, path: "document" });
    expect(parseDocument("x").ok).toBe(false);
  });
});

describe("strip prefix", () => {
  it("removes one leading heading or bullet marker", () => {
    expect(stripPrefix("# Title")).toBe("Title");
    expect(stripPrefix("###### Deep")).toBe("Deep");
    expect(stripPrefix("- bullet")).toBe("bullet");
    expect(stripPrefix("* bullet")).toBe("bullet");
  });

  it("leaves other text alone", () => {
    expect(stripPrefix("####### seven")).toBe("####### seven");
    expect(stripPrefix("#hashtag")).toBe("#hashtag");
    expect(stripPrefix("-5 degrees")).toBe("-5 degrees");
    expect(stripPrefix("**bold** text")).toBe("**bold** text");
    expect(stripPrefix("a - b")).toBe("a - b");
    expect(stripPrefix("")).toBe("");
  });

  it("strips only the first marker", () => {
    expect(stripPrefix("- - nested")).toBe("- nested");
  });
});
