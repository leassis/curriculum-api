import { describe, expect, it } from "vitest";
import { z } from "zod";
import { annotate, TailorOutputSchema } from "../../../../src/services/tailor/output";
import { item, sampleLibrary } from "../../../support/career";

type Node = Record<string, unknown>;

function walk(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, visit);
  } else if (node && typeof node === "object") {
    visit(node as Node);
    for (const v of Object.values(node)) walk(v, visit);
  }
}

describe("tailor output schema", () => {
  const json = z.toJSONSchema(TailorOutputSchema) as Node;

  it("describes every property and array of the model-facing schema", () => {
    const missing: string[] = [];
    const check = (path: string, n: Node) => {
      if (typeof n.description !== "string" || n.description.trim() === "") missing.push(path);
    };
    const visit = (schema: Node, path: string) => {
      if (schema.properties) {
        for (const [name, prop] of Object.entries(schema.properties as Record<string, Node>)) {
          check(`${path}.${name}`, prop);
          visit(prop, `${path}.${name}`);
        }
      }
      if (schema.items) {
        // Object items are described through their properties; scalar items need their own text.
        if (!(schema.items as Node).properties) check(`${path}[]`, schema.items as Node);
        visit(schema.items as Node, `${path}[]`);
      }
    };
    visit(json, "$");
    expect(missing).toEqual([]);
  });

  it("requires every field and carries no length keywords", () => {
    const keywords = ["maxLength", "minLength", "maxItems", "minItems"];
    walk(json, (n) => {
      for (const k of keywords) expect(n).not.toHaveProperty(k);
      if (n.properties) expect(n.required).toEqual(Object.keys(n.properties as Node));
    });
  });

  it("accepts a well-formed reply and rejects a missing field", () => {
    const ok = {
      headline: "h",
      summary: "s",
      items: [{ source_id: "c1", text: "", bullets: ["b"] }],
    };
    expect(TailorOutputSchema.safeParse(ok).success).toBe(true);
    expect(
      TailorOutputSchema.safeParse({ ...ok, items: [{ source_id: "c1", text: "" }] }).success,
    ).toBe(false);
    expect(TailorOutputSchema.safeParse({ ...ok, headline: undefined }).success).toBe(false);
    expect(TailorOutputSchema.safeParse({ ...ok, summary: undefined }).success).toBe(false);
  });

  it("describes the id the model must return as the bracketed id after a title", () => {
    const items = (json.properties as Record<string, Node>).items as Node;
    const props = (items.items as Node).properties as Record<string, Node>;
    expect(Object.keys(props)).toEqual(["source_id", "text", "bullets"]);
    expect(props.source_id?.description).toContain("in brackets");
  });
});

describe("annotate", () => {
  it("numbers items c1..cn in library order", () => {
    const lib = sampleLibrary().items;
    const ids = annotate(lib);
    expect([...ids.values()]).toEqual(lib.map((_, n) => `c${n + 1}`));
    expect([...ids.keys()]).toEqual(lib.map((i) => i.id));
  });

  it("is empty for an empty library", () => {
    expect(annotate([]).size).toBe(0);
  });

  it("numbers per call from one regardless of kind", () => {
    const a = item("honour");
    const b = item("experience");
    expect(annotate([a, b]).get(b.id)).toBe("c2");
  });
});
