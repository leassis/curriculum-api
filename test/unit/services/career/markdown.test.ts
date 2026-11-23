import { describe, expect, it } from "vitest";
import { renderItemsMarkdown } from "../../../../src/services/career/markdown";
import { item, sampleLibrary } from "../../../support/career";
import { SAMPLE_MARKDOWN } from "../../../support/career-markdown";

describe("library markdown", () => {
  it("renders the sample library in the convention", () => {
    expect(renderItemsMarkdown(sampleLibrary().items)).toBe(SAMPLE_MARKDOWN);
  });

  it("renders sections in kind order and skips empty kinds", () => {
    const md = renderItemsMarkdown([item("language"), item("experience")]);
    expect(md.match(/^## .*$/gm)).toEqual(["## Experience", "## Languages"]);
    expect(renderItemsMarkdown([])).toBe("");
  });

  it("writes a skill group as a plain comma line and a language level as its meta line", () => {
    const md = renderItemsMarkdown([
      item("skill_group", { title: "Backend", skills: ["Go", "SQL"] }),
      item("language", { title: "English", level: "Fluent" }),
    ]);
    expect(md).toBe("## Skills\n\n### Backend\nGo, SQL\n\n## Languages\n\n### English\n*Fluent*");
  });

  it("omits the meta line when a kind has no parts to show", () => {
    expect(renderItemsMarkdown([item("honour", { title: "Award", text: "Won it." })])).toBe(
      "## Honours\n\n### Award\nWon it.",
    );
  });

  it("escapes a text first line that looks like a meta line", () => {
    const md = renderItemsMarkdown([item("honour", { title: "Award", text: "*looks meta*" })]);
    expect(md).toBe("## Honours\n\n### Award\n\\*looks meta*");
    const twice = renderItemsMarkdown([item("honour", { title: "Award", text: "\\*x*" })]);
    expect(twice).toBe("## Honours\n\n### Award\n\\\\*x*");
  });

  it("tags titles with the ids it is given", () => {
    const first = item("experience", { title: "A" });
    const ids = new Map([[first.id, "c1"]]);
    expect(renderItemsMarkdown([first], ids)).toContain("### A [c1]\n");
  });
});
