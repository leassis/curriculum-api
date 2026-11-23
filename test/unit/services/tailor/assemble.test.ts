import { describe, expect, it } from "vitest";
import { assemble } from "../../../../src/services/tailor/assemble";
import { annotate, type TailorOutput } from "../../../../src/services/tailor/output";
import { item, SAMPLE_IDS, sampleLibrary } from "../../../support/career";

const library = sampleLibrary().items;
const ids = annotate(library);
const tag = (id: string) => ids.get(id) as string;

function reply(items: TailorOutput["items"], overrides: Partial<TailorOutput> = {}): TailorOutput {
  return { headline: "Backend engineer", summary: "Summary.", items, ...overrides };
}

const all = (): TailorOutput["items"] =>
  library.map((i) => ({ source_id: tag(i.id), text: i.text, bullets: i.bullets }));

function built(out: TailorOutput) {
  const r = assemble(library, ids, out);
  if (!r.ok) throw new Error(`rejected: ${r.reason}`);
  return r.doc;
}

describe("assemble v2", () => {
  it("copies typed fields from the library and bodies from the model", () => {
    const out = reply(
      all().map((o) =>
        o.source_id === tag(SAMPLE_IDS.globex)
          ? { source_id: o.source_id, text: "Reworded lead.", bullets: ["Reworded **bullet**", ""] }
          : o,
      ),
    );
    const globex = built(out).items.find((i) => i.sourceId === SAMPLE_IDS.globex);
    const lib = library.find((i) => i.id === SAMPLE_IDS.globex);
    expect(globex).toMatchObject({
      kind: "experience",
      title: lib?.title,
      organisation: lib?.organisation,
      location: lib?.location,
      startYear: lib?.startYear,
      startMonth: lib?.startMonth,
      endYear: lib?.endYear,
      endMonth: lib?.endMonth,
      current: lib?.current,
      skills: lib?.skills,
      level: lib?.level,
      text: "Reworded lead.",
      bullets: ["Reworded **bullet**"],
    });
  });

  it("ignores a different title or date in the model reply", () => {
    const extra = all().map((o) => ({ ...o, title: "Invented CTO", startYear: 1999 }));
    const doc = built(reply(extra as TailorOutput["items"]));
    expect(doc.items.map((i) => i.title)).toEqual(library.map((i) => i.title));
    expect(doc.items.map((i) => i.startYear)).toEqual(library.map((i) => i.startYear));
  });

  it("sets source id to the library item id", () => {
    const doc = built(reply(all()));
    expect(doc.items.map((i) => i.sourceId)).toEqual(library.map((i) => i.id));
    for (const i of doc.items) expect(i.id).not.toBe(i.sourceId);
    expect(new Set(doc.items.map((i) => i.id)).size).toBe(doc.items.length);
  });

  it("takes headline and summary from the model with markers stripped", () => {
    const doc = built(reply(all(), { headline: "# Backend\nengineer", summary: "- Ten years" }));
    expect(doc).toMatchObject({ version: 2, headline: "Backend engineer", summary: "Ten years" });
  });

  it("restores omitted experience and education after the model items", () => {
    const keep = all().filter((o) =>
      [SAMPLE_IDS.initech, SAMPLE_IDS.msc, SAMPLE_IDS.platform].includes(
        library.find((i) => ids.get(i.id) === o.source_id)?.id as never,
      ),
    );
    const out = reply(keep.map((o) => ({ ...o, text: "Model text", bullets: ["Model bullet"] })));
    const doc = built(out);
    const exp = doc.items.filter((i) => i.kind === "experience");
    expect(exp.map((i) => i.sourceId)).toEqual([SAMPLE_IDS.initech, SAMPLE_IDS.globex]);
    expect(exp[0]?.bullets).toEqual(["Model bullet"]);
    expect(exp[1]).toMatchObject({
      text: library[0]?.text,
      bullets: library[0]?.bullets,
    });
    const edu = doc.items.filter((i) => i.kind === "education");
    expect(edu.map((i) => i.sourceId)).toEqual([SAMPLE_IDS.msc, SAMPLE_IDS.bsc]);
    expect(doc.items.some((i) => i.kind === "certification")).toBe(false);
    expect(doc.items.some((i) => i.kind === "skill_group")).toBe(false);
    expect(doc.items.filter((i) => i.kind === "project")).toHaveLength(1);

    const noExperience = all().filter(
      (o) => library.find((i) => ids.get(i.id) === o.source_id)?.kind !== "experience",
    );
    const both = built(
      reply(noExperience.map((o) => ({ ...o, text: "Model text", bullets: ["Model bullet"] }))),
    );
    const restored = both.items.filter((i) => i.kind === "experience");
    expect(restored.map((i) => i.sourceId)).toEqual([SAMPLE_IDS.globex, SAMPLE_IDS.initech]);
    for (const [at, source] of [library[0], library[1]].entries()) {
      expect(restored[at]).toMatchObject({ text: source?.text, bullets: source?.bullets });
    }
  });

  it("keeps the model order inside a kind and orders kinds as the library does", () => {
    const [globex, initech, platform] = all();
    const doc = built(reply([platform, initech, globex].filter(Boolean) as TailorOutput["items"]));
    expect(doc.items.map((i) => i.sourceId)).toEqual([
      SAMPLE_IDS.initech,
      SAMPLE_IDS.globex,
      SAMPLE_IDS.platform,
      SAMPLE_IDS.bsc,
      SAMPLE_IDS.msc,
    ]);
  });

  it("rejects an unknown id", () => {
    const out = reply([...all(), { source_id: "c99", text: "", bullets: [] }]);
    expect(assemble(library, ids, out)).toEqual({ ok: false, reason: "unknown_id" });
  });

  it("rejects a duplicate id", () => {
    const out = reply([...all(), ...all().slice(0, 1)]);
    expect(assemble(library, ids, out)).toEqual({ ok: false, reason: "duplicate_id" });
  });

  it("rejects a document the schema refuses", () => {
    expect(assemble(library, ids, reply(all(), { headline: "x".repeat(201) }))).toEqual({
      ok: false,
      reason: "schema",
    });
  });

  it("keeps a skill group's library body whatever the model returns", () => {
    const skills = item("skill_group", { title: "Tools", skills: ["Git"] });
    const map = annotate([skills]);
    const r = assemble(
      [skills],
      map,
      reply([{ source_id: "c1", text: "invented", bullets: ["invented"] }]),
    );
    expect(r.ok && r.doc.items[0]).toMatchObject({ text: "", bullets: [], skills: ["Git"] });
  });
});
