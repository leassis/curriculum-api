import { describe, expect, it } from "vitest";
import { AssessmentPanels, type AssessmentView } from "../../../src/admin/resumes/view";
import { decode, tags } from "../../support/html";

const view = (overrides: Partial<AssessmentView> = {}): AssessmentView => ({
  score: 72,
  band: "Moderate match",
  rationale: "Strong backend work, no Kubernetes.",
  missingSkills: ["Kubernetes", "Terraform"],
  omissions: [
    { what: "Open source CLI", reason: "Not relevant to the role." },
    {
      what: "Engineer at Initech",
      reason: "Ended more than 15 years ago; shortened to one bullet.",
    },
  ],
  ...overrides,
});

const render = (assessment: AssessmentView | null) =>
  String(<AssessmentPanels assessment={assessment} />);
const titles = (html: string) => tags(html, "article").map((a) => tags(a.html, "h2")[0]?.text);
const panel = (html: string, title: string) => {
  const found = tags(html, "article").find((a) => tags(a.html, "h2")[0]?.text === title);
  if (!found) throw new Error(`no panel ${title}`);
  return found.html;
};
const text = (html: string) =>
  decode(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

describe("assessment panels", () => {
  it("shows score, band and rationale", () => {
    const body = text(panel(render(view()), "Why this score"));
    expect(body).toContain("72 · Moderate match");
    expect(body).toContain("Strong backend work, no Kubernetes.");
  });

  it("shows one badge per missing skill in order", () => {
    const html = panel(render(view()), "Missing skills");
    const badges = tags(html, "span").filter((t) => /\bbadge\b/.test(t.attrs.class ?? ""));
    expect(badges.map((b) => b.text)).toEqual(["Kubernetes", "Terraform"]);
    expect(text(html)).not.toContain("No significant gaps");
  });

  it("shows the no gaps state", () => {
    const html = panel(render(view({ missingSkills: [] })), "Missing skills");
    expect(text(html)).toContain("No significant gaps");
    expect(text(html)).toContain("Your career library covers the role's stated requirements.");
    expect(html).not.toContain("badge");
  });

  it("shows one row per omission with its reason in order", () => {
    const html = panel(render(view()), "What was left out");
    const rows = tags(html, "li").map((li) => text(li.html));
    expect(rows).toEqual([
      "Open source CLI Not relevant to the role.",
      "Engineer at Initech Ended more than 15 years ago; shortened to one bullet.",
    ]);
  });

  it("shows the nothing left out state", () => {
    const html = panel(render(view({ omissions: [] })), "What was left out");
    expect(text(html)).toContain("Nothing was left out");
    expect(text(html)).toContain("Your whole career library made it into this resume.");
    expect(html).not.toContain("<li");
  });

  it("shows only not assessed yet when the score is null", () => {
    const html = render(null);
    expect(titles(html)).toEqual(["Not assessed yet"]);
    expect(text(html)).toContain("Generate to see the assessment.");
    for (const title of ["Why this score", "Missing skills", "What was left out"]) {
      expect(html).not.toContain(title);
    }
  });

  it("escapes model text", () => {
    const evil = "<script>alert(1)</script>";
    const html = render(
      view({
        rationale: evil,
        missingSkills: [evil],
        omissions: [{ what: evil, reason: evil }],
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
