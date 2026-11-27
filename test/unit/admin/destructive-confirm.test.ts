import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN = join(import.meta.dirname, "../../../src/admin");

/** Requests that remove data or switch something off for good. */
const DESTRUCTIVE = /hx-delete=|hx-patch=\{`[^`]*\/(?:revoke|reset)`\}/;

function views(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return views(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

/** The opening tags of every JSX element in `source`, with the line they start on. */
function openingTags(source: string): { line: number; tag: string }[] {
  return [...source.matchAll(/<[a-z][\w-]*\b(?:[^>{]|\{(?:[^{}]|\{[^{}]*\})*\})*>/g)].map((m) => ({
    line: source.slice(0, m.index).split("\n").length,
    tag: m[0],
  }));
}

describe("admin destructive actions", () => {
  it("all ask for confirmation", () => {
    const found: string[] = [];
    const missing: string[] = [];
    for (const file of views(ADMIN)) {
      for (const { line, tag } of openingTags(readFileSync(file, "utf8"))) {
        if (!DESTRUCTIVE.test(tag)) continue;
        const where = `${relative(ADMIN, file)}:${line}`;
        found.push(where);
        if (!tag.includes("hx-confirm=")) missing.push(where);
      }
    }
    expect(found.length).toBeGreaterThanOrEqual(6);
    expect(missing).toEqual([]);
  });
});
