import { describe, expect, it } from "vitest";
import {
  MAX_DOCUMENT_CHARS,
  parseDocument,
  stripPrefix,
} from "../../../../src/services/tailor/document";
import { item, sampleDocumentV2 } from "../../../support/career";

type Doc = ReturnType<typeof sampleDocumentV2>;

function failingPath(mutate: (d: Doc) => void): string {
  const doc = sampleDocumentV2();
  mutate(doc);
  const r = parseDocument(doc);
  if (r.ok) throw new Error("expected failure");
  return r.path;
}

const first = (d: Doc) => d.items[0] as Doc["items"][number];

describe("resume document v2", () => {
  it("accepts the v2 shape and rejects v1", () => {
    expect(parseDocument(sampleDocumentV2())).toEqual({ ok: true, doc: sampleDocumentV2() });
    const v1 = { version: 1, sections: [] };
    expect(parseDocument(v1)).toEqual({ ok: false, path: "version" });
    expect(failingPath((d) => ((d as { version: number }).version = 1))).toBe("version");
  });

  it("holds the item fields of the spec and a nullable source id", () => {
    const doc = sampleDocumentV2();
    const parsed = parseDocument(doc);
    expect(parsed.ok && Object.keys(parsed.doc.items[0] ?? {}).sort()).toEqual(
      [
        "id",
        "sourceId",
        "kind",
        "title",
        "organisation",
        "location",
        "startYear",
        "startMonth",
        "endYear",
        "endMonth",
        "current",
        "text",
        "bullets",
        "skills",
        "level",
      ].sort(),
    );
    first(doc).sourceId = null;
    expect(parseDocument(doc).ok).toBe(true);
    expect(failingPath((d) => ((first(d) as { sourceId: unknown }).sourceId = "nope"))).toBe(
      "items.0.sourceId",
    );
    expect(failingPath((d) => delete (first(d) as { sourceId?: unknown }).sourceId)).toBe(
      "items.0.sourceId",
    );
  });

  it("applies the career item rules to every item", () => {
    expect(failingPath((d) => (first(d).title = ""))).toBe("items.0");
    expect(failingPath((d) => (first(d).startYear = 1949))).toBe("items.0");
    expect(failingPath((d) => (first(d).bullets = Array(31).fill("b")))).toBe("items.0");
    expect(failingPath((d) => (first(d).kind = "nonsense" as never))).toBe("items.0.kind");
  });

  it("bounds headline summary and item count", () => {
    expect(failingPath((d) => (d.headline = "x".repeat(201)))).toBe("headline");
    expect(failingPath((d) => (d.summary = "x".repeat(4001)))).toBe("summary");
    expect(
      failingPath((d) => {
        d.items = Array.from({ length: 201 }, (_, n) => ({
          ...item("honour", { title: `h${n}` }),
          sourceId: null,
        }));
      }),
    ).toBe("items");
  });

  it("accepts values exactly at the bounds", () => {
    const doc = sampleDocumentV2();
    doc.headline = "h".repeat(200);
    doc.summary = "s".repeat(4000);
    expect(parseDocument(doc).ok).toBe(true);
  });

  it("rejects a document over 100000 characters serialized", () => {
    const doc = sampleDocumentV2();
    doc.items = Array.from({ length: 30 }, (_, n) => ({
      ...item("honour", { title: `h${n}`, text: "x".repeat(4000) }),
      sourceId: null,
    }));
    expect(JSON.stringify(doc).length).toBeGreaterThan(MAX_DOCUMENT_CHARS);
    expect(parseDocument(doc)).toEqual({ ok: false, path: "document" });
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
