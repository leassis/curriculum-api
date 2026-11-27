import { describe, expect, it } from "vitest";
import { LlmUnavailableError } from "../../../src/services/errors";
import { TAILOR_ASSESSMENT_RULES } from "../../../src/services/tailor/rubric";
import { SHORT_JD_RULES } from "../../../src/services/tailor/short-description";
import { sampleReplyV2 } from "../../support/career";
import { JD, resumeSetup, TAILOR_PROMPT } from "../../support/resumes";

const draft = { title: "Backend at Acme", company: "Acme", jobDescription: JD };

const reply = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ ...sampleReplyV2(), ...overrides });

describe("resume generate", () => {
  it("appends the short job description rules to the system prompt", async () => {
    const { resumes, calls, profile } = await resumeSetup();
    const { id } = await resumes.create(draft);
    await resumes.generate(id);
    expect(
      calls[0]?.system.startsWith(
        `${TAILOR_PROMPT}\n\n${TAILOR_ASSESSMENT_RULES}\n\n${SHORT_JD_RULES}`,
      ),
    ).toBe(true);
    expect((await profile.get()).tailorSystemPrompt).toBe(TAILOR_PROMPT);
  });

  it("stores the short job description and replaces an earlier one", async () => {
    const first = reply({ job_description_short: "  - First requirement\n- Second  " });
    const second = reply({ job_description_short: "- Only the new one" });
    const { resumes, repo } = await resumeSetup({ mock: { replies: [first, second] } });
    const created = await resumes.create(draft);
    expect(created.jobDescriptionShort).toBeNull();

    const saved = await resumes.generate(created.id);
    expect(saved.jobDescriptionShort).toBe("- First requirement\n- Second");
    expect(repo.rows[0]?.jobDescriptionShort).toBe("- First requirement\n- Second");

    const again = await resumes.generate(created.id);
    expect(again.jobDescriptionShort).toBe("- Only the new one");
    expect(repo.rows[0]?.jobDescriptionShort).toBe("- Only the new one");
  });

  it("keeps the short job description when generation fails", async () => {
    const good = reply({ job_description_short: "- Kept requirement" });
    const bad = reply({ score: 150, job_description_short: "- Rejected" });
    const { resumes, repo } = await resumeSetup({ mock: { replies: [good, bad, bad] } });
    const { id } = await resumes.create(draft);
    await resumes.generate(id);
    await expect(resumes.generate(id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(repo.rows[0]?.jobDescriptionShort).toBe("- Kept requirement");
    expect((await resumes.get(id)).jobDescriptionShort).toBe("- Kept requirement");
  });
});
