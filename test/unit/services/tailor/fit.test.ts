import { describe, expect, it } from "vitest";
import type { CareerItem } from "../../../../src/services/career/item";
import type { ResumeDocument } from "../../../../src/services/tailor/document";
import { fitToBudget } from "../../../../src/services/tailor/fit";
import { estimatePages } from "../../../../src/services/tailor/length";
import { item } from "../../../support/career";

const bullets = (n: number, tag = "b") =>
  Array.from({ length: n }, (_, i) => `${tag}${i}`.padEnd(100, "."));

/** A resume document whose items point at their own id as the library source. */
function doc(items: CareerItem[]): ResumeDocument {
  return {
    version: 2,
    headline: "",
    summary: "",
    items: items.map((i) => ({ ...i, sourceId: i.id })),
  };
}

const role = (year: number, count: number) =>
  item("experience", { startYear: year - 1, endYear: year, bullets: bullets(count, `r${year}-`) });
const bulletsOf = (d: ResumeDocument, id: string) => d.items.find((i) => i.id === id)?.bullets;

describe("fitToBudget", () => {
  it("keeps only the first cap bullets of an experience", () => {
    const a = role(2022, 10);
    const { doc: out } = fitToBudget(doc([a]), new Map([[a.id, 3]]), 3, "A4");
    expect(bulletsOf(out, a.id)).toEqual(a.bullets.slice(0, 3));
  });

  it("keeps every bullet under the cap", () => {
    const a = role(2022, 2);
    const { doc: out } = fitToBudget(doc([a]), new Map([[a.id, 5]]), 3, "A4");
    expect(bulletsOf(out, a.id)).toEqual(a.bullets);
  });

  it("drops project bullets first, then experiences oldest to newest", () => {
    const oldest = role(2015, 10);
    const newest = role(2022, 10);
    const project = item("project", { bullets: bullets(10, "p") });
    const full = doc([newest, oldest, project]);
    const caps = new Map([
      [newest.id, 10],
      [oldest.id, 10],
    ]);
    const fullEstimate = estimatePages(full, "A4");
    // Room to cut some bullets but not all of the project's.
    const roomForProject = fitToBudget(full, caps, fullEstimate - 0.2, "A4").doc;
    expect(bulletsOf(roomForProject, project.id)?.length).toBeLessThan(10);
    expect(bulletsOf(roomForProject, oldest.id)).toHaveLength(10);
    expect(bulletsOf(roomForProject, newest.id)).toHaveLength(10);
    // Tighter: the project is empty before the oldest role loses a bullet.
    const noProject = estimatePages(doc([newest, oldest, { ...project, bullets: [] }]), "A4");
    const tight = fitToBudget(full, caps, noProject - 0.1, "A4").doc;
    expect(bulletsOf(tight, project.id)).toEqual([]);
    expect(bulletsOf(tight, oldest.id)?.length).toBeLessThan(10);
    expect(bulletsOf(tight, newest.id)).toHaveLength(10);
  });

  it("keeps every experience whatever the budget", () => {
    const roles = [2015, 2018, 2022].map((y) => role(y, 6));
    const caps = new Map(roles.map((r) => [r.id, 6]));
    const { doc: out } = fitToBudget(doc(roles), caps, 0.01, "A4");
    expect(out.items.map((i) => i.id)).toEqual(roles.map((r) => r.id));
    for (const r of roles) expect(bulletsOf(out, r.id)).toEqual([]);
  });

  it("returns an over-minimum document with its estimate", () => {
    const roles = Array.from({ length: 60 }, (_, i) => role(1960 + i, 3));
    const caps = new Map(roles.map((r) => [r.id, 3]));
    const result = fitToBudget(doc(roles), caps, 1, "A4");
    expect(result.estimate).toBeGreaterThan(1);
    expect(result.estimate).toBe(estimatePages(result.doc, "A4"));
    expect(result.doc.items.every((i) => i.bullets.length === 0)).toBe(true);
  });
});
