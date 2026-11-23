import { describe, expect, it } from "vitest";
import {
  bandFor,
  rubricLines,
  SCORE_BANDS,
  TAILOR_ASSESSMENT_RULES,
} from "../../../../src/services/tailor/rubric";

describe("score rubric", () => {
  it("maps each score to its band at the edges", () => {
    const labelAt = (score: number) => bandFor(score).label;
    expect(labelAt(0)).toBe("Weak match");
    expect(labelAt(39)).toBe("Weak match");
    expect(labelAt(40)).toBe("Partial match");
    expect(labelAt(59)).toBe("Partial match");
    expect(labelAt(60)).toBe("Moderate match");
    expect(labelAt(79)).toBe("Moderate match");
    expect(labelAt(80)).toBe("Strong match");
    expect(labelAt(100)).toBe("Strong match");
  });

  it("builds prompt lines and labels from SCORE_BANDS", () => {
    expect(rubricLines()).toEqual([
      "80–100 Strong match: meets essentially all stated requirements",
      "60–79 Moderate match: core requirements with notable gaps",
      "40–59 Partial match: partial overlap",
      "0–39 Weak match: weak fit",
    ]);
    expect(SCORE_BANDS.map((band) => band.label)).toEqual([
      "Strong match",
      "Moderate match",
      "Partial match",
      "Weak match",
    ]);
  });

  it("rules block holds every rubric line and rules 1 to 7", () => {
    for (const line of rubricLines()) expect(TAILOR_ASSESSMENT_RULES).toContain(line);
    const rules = TAILOR_ASSESSMENT_RULES.split("\n").filter((l) => /^[1-7]\. /.test(l));
    expect(rules).toHaveLength(7);
    expect(rules[0]).toContain(
      "Never invent a skill, tool, employer, title, date, certification or metric",
    );
    expect(rules[1]).toContain("missing_skills");
    expect(rules[2]).toContain("synonym");
    expect(rules[3]).toContain("omissions with a reason");
    expect(rules[4]).toContain(
      "experience, education, certification, course, skill group or language",
    );
    expect(rules[5]).toContain("15 years");
    expect(rules[6]).toContain("Custom Instructions");
    expect(rules[6]).toContain("rules 1 to 5");
  });
});
