import { describe, expect, it } from "vitest";
import { renderResumeMarkdown } from "../../../../src/services/tailor/render";
import { sampleDocument } from "../../../support/resume-document";

describe("render resume markdown", () => {
  it("renders sections items and bullets in stored order", () => {
    expect(renderResumeMarkdown(sampleDocument())).toBe(
      [
        "Backend engineer with 10 years of experience.",
        "## Experience",
        "### Staff Engineer — Globex (2020-2024)",
        "Led the platform team.",
        "- Cut p99 latency by 40%\n- Mentored **six** engineers",
        "### Engineer — Initech (2016-2020)",
        "- Built the billing service",
        "## Education",
        "### BSc Computer Science — State University",
        "2012-2016",
      ].join("\n\n") + "\n",
    );
  });

  it("writes no heading for the intro and keeps section text before items", () => {
    const md = renderResumeMarkdown(sampleDocument());
    expect(md.startsWith("Backend")).toBe(true);
    expect(md).not.toMatch(/^## $/m);
    expect(
      renderResumeMarkdown({
        version: 1,
        sections: [{ title: "Skills", kind: "other", text: "TS, Go", items: [] }],
      }),
    ).toBe("## Skills\n\nTS, Go\n");
  });

  it("renders an empty document as an empty string", () => {
    expect(renderResumeMarkdown({ version: 1, sections: [] })).toBe("");
  });
});
