import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TailorOutputSchema } from "../../../../src/services/tailor/output";

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
      sections: [{ source_id: "s1", text: "t" }],
      items: [{ source_item_id: "i1", text: "", bullets: ["b"] }],
    };
    expect(TailorOutputSchema.safeParse(ok).success).toBe(true);
    expect(
      TailorOutputSchema.safeParse({ ...ok, items: [{ source_item_id: "i1", text: "" }] }).success,
    ).toBe(false);
  });
});
