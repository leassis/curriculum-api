import { describe, expect, it } from "vitest";
import type { CareerItem } from "../../../../src/services/career/item";
import type { ResumeDocument } from "../../../../src/services/tailor/document";
import { estimatePages } from "../../../../src/services/tailor/length";
import { item } from "../../../support/career";

const PAGE_MM = 265;
const WASTE = 1.04;
const LINE_MM = 4.762;
const BULLET_GAP_MM = (3 * 25.4) / 72;

function doc(items: CareerItem[], headline = "", summary = ""): ResumeDocument {
  return {
    version: 2,
    headline,
    summary,
    items: items.map((i) => ({ ...i, sourceId: null })),
  };
}

const role = (bullets: string[]) =>
  item("experience", { title: "Engineer", organisation: "Acme", startYear: 2020, bullets });
const bullets = (n: number, length = 100) => Array.from({ length: n }, () => "x".repeat(length));

describe("estimatePages", () => {
  it("estimates an empty document at the Personal Header allowance only", () => {
    expect(estimatePages(doc([]), "A4")).toBeCloseTo((22.2 * WASTE) / PAGE_MM, 5);
  });

  it("adds one 4.762mm line and a 3pt gap for each further one-line bullet", () => {
    const ten = estimatePages(doc([role(bullets(10))]), "A4");
    const eleven = estimatePages(doc([role(bullets(11))]), "A4");
    expect(eleven - ten).toBeCloseTo(((LINE_MM + BULLET_GAP_MM) * WASTE) / PAGE_MM, 5);
  });

  it("wraps a bullet after 104 characters and a paragraph after 108", () => {
    const oneLine = estimatePages(doc([role(bullets(1, 104))]), "A4");
    const twoLines = estimatePages(doc([role(bullets(1, 105))]), "A4");
    expect(twoLines - oneLine).toBeCloseTo((LINE_MM * WASTE) / PAGE_MM, 5);
    const short = estimatePages(doc([], "", "y".repeat(108)), "A4");
    const long = estimatePages(doc([], "", "y".repeat(109)), "A4");
    expect(long - short).toBeCloseTo((LINE_MM * WASTE) / PAGE_MM, 5);
  });

  it("counts every printed field: headline, summary, text, skills and meta line", () => {
    const base = estimatePages(doc([role([])]), "A4");
    const withText = estimatePages(
      doc([{ ...role([]), text: "t".repeat(300), skills: ["TypeScript", "Go"] }]),
      "A4",
    );
    expect(withText).toBeGreaterThan(base);
    expect(estimatePages(doc([role([])], "A headline"), "A4")).toBeGreaterThan(base);
    expect(estimatePages(doc([role([])], "", "A summary"), "A4")).toBeGreaterThan(base);
  });

  it("scales the estimate for Letter", () => {
    const d = doc([role(bullets(30))]);
    expect(estimatePages(d, "Letter")).toBeCloseTo(estimatePages(d, "A4") / 0.965, 5);
  });
});
