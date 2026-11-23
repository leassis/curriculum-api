import { describe, expect, it } from "vitest";
import { parseDocument } from "../../../../src/services/tailor/document";
import { applyOp, documentFromForm } from "../../../../src/services/tailor/form";
import { itemAt, sampleDocument, sectionAt } from "../../../support/resume-document";

/** The flat dotted body an HTML form posts. */
function formOf(doc = sampleDocument()): Record<string, string> {
  const body: Record<string, string> = {};
  doc.sections.forEach((s, i) => {
    body[`sections.${i}.title`] = s.title;
    body[`sections.${i}.kind`] = s.kind;
    body[`sections.${i}.text`] = s.text;
    s.items.forEach((it, j) => {
      body[`sections.${i}.items.${j}.heading`] = it.heading;
      body[`sections.${i}.items.${j}.text`] = it.text;
      body[`sections.${i}.items.${j}.bullets`] = it.bullets.join("\n");
    });
  });
  return body;
}

describe("form codec", () => {
  it("round-trips a document through the form", () => {
    expect(parseDocument(documentFromForm(formOf()))).toEqual({ ok: true, doc: sampleDocument() });
  });

  it("reads nested objects from parseBody dot mode in numeric key order", () => {
    const body = {
      sections: {
        "10": { title: "Last", kind: "other", text: "z", items: {} },
        "2": {
          title: "Mid",
          kind: "experience",
          text: "",
          items: {
            "10": { heading: "B", text: "", bullets: "b" },
            "9": { heading: "A", text: "", bullets: "a" },
          },
        },
      },
    };
    const r = parseDocument(documentFromForm(body));
    if (!r.ok) throw new Error(r.path);
    expect(r.doc.sections.map((s) => s.title)).toEqual(["Mid", "Last"]);
    expect(sectionAt(r.doc, 0).items.map((i) => i.heading)).toEqual(["A", "B"]);
  });

  it("orders flat keys numerically, not as strings", () => {
    const body: Record<string, string> = {};
    for (const n of [10, 2, 1]) {
      body[`sections.${n}.title`] = `S${n}`;
      body[`sections.${n}.kind`] = "other";
      body[`sections.${n}.text`] = "t";
    }
    const r = parseDocument(documentFromForm(body));
    if (!r.ok) throw new Error(r.path);
    expect(r.doc.sections.map((s) => s.title)).toEqual(["S1", "S2", "S10"]);
  });

  it("drops empty sections and stores blank bullets as an empty list", () => {
    const body = formOf();
    body["sections.1.items.0.bullets"] = "  \n\r\n \n";
    body["sections.1.items.1.bullets"] = "\nkeep me  \n\n second\r\n";
    for (const k of Object.keys(body)) if (k.startsWith("sections.2.items.")) delete body[k];
    body["sections.2.text"] = "  ";
    const r = parseDocument(documentFromForm(body));
    if (!r.ok) throw new Error(r.path);
    expect(r.doc.sections.map((s) => s.title)).toEqual(["", "Experience"]);
    expect(itemAt(r.doc, 1, 0).bullets).toEqual([]);
    expect(itemAt(r.doc, 1, 1).bullets).toEqual(["keep me", "second"]);
  });

  it("rejects an empty heading and keeps text-only sections", () => {
    const body = formOf();
    body["sections.1.items.0.heading"] = "  ";
    expect(parseDocument(documentFromForm(body))).toEqual({
      ok: false,
      path: "sections.1.items.0.heading",
    });
    expect(sectionAt(parseOk(formOf()), 0).items).toEqual([]);
  });

  it("removes an item", () => {
    const doc = applyOp(sampleDocument(), "remove", "s1.i0");
    expect(sectionAt(doc, 1).items.map((i) => i.heading)).toEqual([
      "Engineer — Initech (2016-2020)",
    ]);
    expect(sampleDocument().sections[1]?.items).toHaveLength(2);
  });

  it("moves items within their section and ignores moves past the edges", () => {
    const base = sampleDocument();
    const [a, b] = sectionAt(base, 1).items.map((i) => i.heading);

    const down = applyOp(base, "down", "s1.i0");
    expect(sectionAt(down, 1).items.map((i) => i.heading)).toEqual([b, a]);
    const up = applyOp(down, "up", "s1.i1");
    expect(sectionAt(up, 1).items.map((i) => i.heading)).toEqual([a, b]);

    expect(applyOp(base, "up", "s1.i0")).toEqual(base);
    expect(applyOp(base, "down", "s1.i1")).toEqual(base);
    // A single-item section never swaps with another section's item.
    expect(applyOp(base, "down", "s2.i0")).toEqual(base);
    expect(applyOp(base, "up", "s2.i0")).toEqual(base);
  });

  it("ignores targets that do not exist", () => {
    const base = sampleDocument();
    for (const t of ["", "s9.i0", "s1.i9", "x", "s1.i-1"]) {
      for (const op of ["remove", "up", "down"] as const)
        expect(applyOp(base, op, t)).toEqual(base);
    }
  });
});

function parseOk(body: Record<string, string>) {
  const r = parseDocument(documentFromForm(body));
  if (!r.ok) throw new Error(r.path);
  return r.doc;
}
