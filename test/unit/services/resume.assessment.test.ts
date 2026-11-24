import { describe, expect, it } from "vitest";
import { LlmUnavailableError } from "../../../src/services/errors";
import { TAILOR_ASSESSMENT_RULES } from "../../../src/services/tailor/rubric";
import { item, SAMPLE_IDS, sampleLibrary, sampleReplyV2 } from "../../support/career";
import { FULL_NAME, JD, resumeSetup, TAILOR_PROMPT } from "../../support/resumes";

const draft = { title: "Backend at Acme", company: "Acme", jobDescription: JD };

type Library = ReturnType<typeof sampleLibrary>["items"];

function replyFor(
  library: Library,
  overrides: Partial<ReturnType<typeof sampleReplyV2>> = {},
  without: string[] = [],
): string {
  const full = sampleReplyV2(library);
  const tags = new Map(library.map((i, n) => [i.id, `c${n + 1}`]));
  const dropped = new Set(without.map((id) => tags.get(id)));
  return JSON.stringify({
    ...full,
    items: full.items.filter((i) => !dropped.has(i.source_id)),
    ...overrides,
  });
}

const oldRole = () =>
  item("experience", {
    title: "Analyst",
    organisation: "Initech Legacy",
    startYear: 1998,
    endYear: 2005,
    text: "Reported.",
    bullets: ["One", "Two"],
  });

describe("resume assessment", () => {
  it("stores model omissions, then restore notes, then collapse notes", async () => {
    const library = [...sampleLibrary().items, oldRole()];
    const old = library[library.length - 1];
    const text = replyFor(
      library,
      {
        score: 64,
        score_rationale: "  Solid backend fit. ",
        missing_skills: ["typescript", " Terraform ", "terraform", "Go"],
        omissions: [{ what: " A bullet ", reason: "Off topic" }],
      },
      [SAMPLE_IDS.english, old?.id as string],
    );
    const { resumes, repo, logs } = await resumeSetup({ items: library, mock: { text } });
    const { id } = await resumes.create(draft);
    const saved = await resumes.generate(id);
    expect(saved.assessment).toEqual({
      score: 64,
      rationale: "Solid backend fit.",
      missingSkills: ["Terraform", "Go"],
      omissions: [
        { what: "A bullet", reason: "Off topic" },
        {
          what: "Analyst at Initech Legacy",
          reason: "Experience items are always kept; restored by code.",
        },
        {
          what: "Analyst at Initech Legacy",
          reason: "Ended more than 15 years ago; shortened to one bullet.",
        },
      ],
    });
    expect(repo.rows[0]).toMatchObject({
      score: 64,
      scoreRationale: "Solid backend fit.",
      missingSkills: ["Terraform", "Go"],
    });
    expect(logs.filter((l) => l.level === "info")).toEqual([
      { level: "info", message: "tailor assessment notes", data: { restored: 1, collapsed: 1 } },
    ]);
  });

  it("stores empty lists when nothing is missing or cut", async () => {
    const { resumes, repo, logs } = await resumeSetup();
    const { id } = await resumes.create(draft);
    const saved = await resumes.generate(id);
    expect(saved.assessment).toEqual({
      score: 70,
      rationale: "Covers the core requirements.",
      missingSkills: [],
      omissions: [],
    });
    expect(repo.rows[0]).toMatchObject({ missingSkills: [], omissions: [] });
    expect(logs.filter((l) => l.level === "info")).toEqual([]);
  });

  it("keeps the assessment on save, item edit, add back and preview", async () => {
    const library = sampleLibrary().items;
    const text = replyFor(library, { score: 55, missing_skills: ["Terraform"] }, [
      SAMPLE_IDS.platform,
    ]);
    const { resumes, repo } = await resumeSetup({ mock: { text } });
    const { id } = await resumes.create(draft);
    const saved = await resumes.generate(id);
    const before = saved.assessment;
    expect(before).toMatchObject({ score: 55, missingSkills: ["Terraform"] });

    await resumes.updateOptions(id, [], "Be brief");
    const first = (await resumes.get(id)).document?.items[0];
    await resumes.editItem(id, first?.id as string, {
      title: "Renamed",
      organisation: "Acme",
      startYear: "2020",
    });
    await resumes.addBack(id, SAMPLE_IDS.platform);
    await resumes.printData(id);
    const after = await resumes.get(id);
    expect(after.assessment).toEqual(before);
    expect(repo.rows[0]).toMatchObject({ score: 55, missingSkills: ["Terraform"] });
  });

  it("has no assessment before the first generation", async () => {
    const { resumes, repo } = await resumeSetup();
    const created = await resumes.create(draft);
    expect(created.assessment).toBeNull();
    expect(repo.rows[0]?.score).toBeNull();
    expect((await resumes.get(created.id)).assessment).toBeNull();
  });

  it("keeps the stored assessment when generate fails", async () => {
    const library = sampleLibrary().items;
    const good = replyFor(library, { score: 61 });
    const bad = replyFor(library, { score: 150 });
    const { resumes, repo } = await resumeSetup({ mock: { replies: [good, bad, bad] } });
    const { id } = await resumes.create(draft);
    await resumes.generate(id);
    const stored = { ...repo.rows[0] };
    await expect(resumes.generate(id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(repo.rows[0]).toMatchObject({
      score: 61,
      scoreRationale: stored.scoreRationale,
      structured: stored.structured,
    });
    expect((await resumes.get(id)).assessment?.score).toBe(61);
  });

  it("replaces the assessment on a second generation", async () => {
    const library = sampleLibrary().items;
    const first = replyFor(library, { score: 61, missing_skills: ["Terraform"] });
    const second = replyFor(
      library,
      { score: 22, score_rationale: "Weak.", omissions: [{ what: "Bullet", reason: "Old" }] },
      [SAMPLE_IDS.platform],
    );
    const { resumes } = await resumeSetup({ mock: { replies: [first, second] } });
    const { id } = await resumes.create(draft);
    await resumes.generate(id);
    const saved = await resumes.generate(id);
    expect(saved.assessment).toEqual({
      score: 22,
      rationale: "Weak.",
      missingSkills: [],
      omissions: [{ what: "Bullet", reason: "Old" }],
    });
  });

  it("rejects an out-of-bounds assessment twice then fails", async () => {
    const library = sampleLibrary().items;
    const bad = replyFor(library, { score: 101 });
    const { resumes, repo, calls, logs } = await resumeSetup({ mock: { replies: [bad] } });
    const { id } = await resumes.create(draft);
    const error = await resumes.generate(id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LlmUnavailableError);
    expect(calls).toHaveLength(2);
    expect(repo.rows[0]).toMatchObject({ score: null, structured: null });
    expect(logs.map((l) => l.data)).toEqual([{ reason: "assessment" }, { reason: "assessment" }]);
  });

  it("sends no personal info value or full name", async () => {
    const { resumes, calls, addField } = await resumeSetup();
    await addField("EMAIL", "Email", "ada@example.com", 1);
    await addField("PHONE", "Phone", "+44 20 7946 0958", 2);
    const { id } = await resumes.create({
      ...draft,
      jobDescription: `${JD} Reach ada@example.com or +44 20 7946 0958.`,
    });
    await resumes.generate(id);
    for (const secret of ["ada@example.com", "+44 20 7946 0958", FULL_NAME, "Ada"]) {
      expect(calls[0]?.prompt).not.toContain(secret);
      expect(calls[0]?.system).not.toContain(secret);
    }
  });

  it("appends the assessment rules to the stored tailor prompt", async () => {
    const { resumes, calls } = await resumeSetup();
    const { id } = await resumes.create(draft);
    await resumes.generate(id);
    expect(calls[0]?.system.startsWith(`${TAILOR_PROMPT}\n\n${TAILOR_ASSESSMENT_RULES}\n\n`)).toBe(
      true,
    );
  });

  it("input starts with today's date", async () => {
    const { resumes, calls } = await resumeSetup();
    const { id } = await resumes.create(draft);
    await resumes.generate(id);
    const { prompt = "", system = "" } = calls[0] ?? {};
    const input = prompt.slice(system.length).trimStart();
    expect(input.startsWith(`Today's date: ${new Date().toISOString().slice(0, 10)}`)).toBe(true);
  });
});
