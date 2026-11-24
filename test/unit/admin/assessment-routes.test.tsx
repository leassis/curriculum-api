import { describe, expect, it } from "vitest";
import { SCORE_BANDS } from "../../../src/services/tailor/rubric";
import { sampleLibrary, sampleReplyV2 } from "../../support/career";
import { decode, tags } from "../../support/html";
import { resumeApp } from "../../support/resumes";

const newResume = { title: "Backend at Acme", company: "Acme", jobDescription: "Build things" };
const reply = (overrides: Record<string, unknown>) =>
  JSON.stringify({ ...sampleReplyV2(sampleLibrary().items), ...overrides });
const panels = (html: string) =>
  tags(html, "article").map((a) => decode(a.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")));

describe("assessment panels", () => {
  it("shows the band label from SCORE_BANDS on the editor page", async () => {
    const strong = SCORE_BANDS[0];
    const weak = SCORE_BANDS[3];
    for (const [score, band] of [
      [strong.min + 5, strong.label],
      [weak.min + 5, weak.label],
    ] as const) {
      const s = await resumeApp({ mock: { text: reply({ score }) } });
      const { id } = await s.resumes.create(newResume);
      await s.resumes.generate(id);
      const html = await (await s.get(`/admin/resumes/${id}`)).text();
      const [why] = panels(html);
      expect(why).toContain(`${score} · ${band}`);
    }
  });

  it("generate swaps in the new assessment", async () => {
    const s = await resumeApp({
      mock: {
        replies: [
          reply({ score: 85, score_rationale: "First rationale.", missing_skills: ["Terraform"] }),
          reply({ score: 35, score_rationale: "Second rationale.", missing_skills: ["Haskell"] }),
        ],
      },
    });
    const { id } = await s.resumes.create(newResume);
    const before = await (await s.get(`/admin/resumes/${id}`)).text();
    expect(panels(before).join(" ")).toContain("Not assessed yet");

    const first = await s.post(`/admin/resumes/${id}/generate`);
    expect(first.status).toBe(200);
    const firstHtml = await first.text();
    expect(firstHtml.startsWith('<div id="editor"')).toBe(true);
    expect(panels(firstHtml).join(" ")).toContain("85 · Strong match");
    expect(panels(firstHtml).join(" ")).toContain("First rationale.");
    expect(panels(firstHtml).join(" ")).toContain("Terraform");

    const second = await (await s.post(`/admin/resumes/${id}/generate`)).text();
    const text = panels(second);
    expect(text).toHaveLength(3);
    expect(text[0]).toContain("35 · Weak match");
    expect(text[0]).toContain("Second rationale.");
    expect(text[1]).toContain("Haskell");
    expect(text.join(" ")).not.toContain("Terraform");
    expect(second.indexOf('id="assessment"')).toBeLessThan(second.indexOf('id="career-library"'));
  });
});
