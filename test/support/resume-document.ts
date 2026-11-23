import type { ResumeDocument } from "../../src/services/tailor/document";
import type { TailorOutput } from "../../src/services/tailor/output";

/**
 * A Master CV with an intro, Experience (two roles), Education and Skills. Parsed ids:
 * s0 intro, s1 Experience (i1, i2), s2 Education (i3), s3 Skills.
 */
export const sampleCv = `Backend engineer with ten years of experience.

## Experience

### Staff Engineer — Globex (2020-2024)
Led the platform team and its on-call rotation.
- Cut p99 latency by 40% across the public API
- Mentored six engineers

### Engineer — Initech (2016-2020)
- Built the billing service
- Ran the Postgres upgrades

## Education

### BSc Computer Science — State University
2012-2016

## Skills

TypeScript, Postgres, Kubernetes`;

/** A model reply for `sampleCv` that assembles into exactly `sampleDocument()` (Skills left out). */
export function sampleReply(): TailorOutput {
  return {
    sections: [{ source_id: "s0", text: "Backend engineer with 10 years of experience." }],
    items: [
      {
        source_item_id: "i1",
        text: "Led the platform team.",
        bullets: ["Cut p99 latency by 40%", "Mentored **six** engineers"],
      },
      { source_item_id: "i2", text: "", bullets: ["Built the billing service"] },
      { source_item_id: "i3", text: "2012-2016", bullets: [] },
    ],
  };
}

/** A valid Resume Document: intro, experience (two items), education (one item). */
export function sampleDocument(): ResumeDocument {
  return {
    version: 1,
    sections: [
      {
        title: "",
        kind: "intro",
        text: "Backend engineer with 10 years of experience.",
        items: [],
      },
      {
        title: "Experience",
        kind: "experience",
        text: "",
        items: [
          {
            heading: "Staff Engineer — Globex (2020-2024)",
            text: "Led the platform team.",
            bullets: ["Cut p99 latency by 40%", "Mentored **six** engineers"],
          },
          {
            heading: "Engineer — Initech (2016-2020)",
            text: "",
            bullets: ["Built the billing service"],
          },
        ],
      },
      {
        title: "Education",
        kind: "education",
        text: "",
        items: [
          { heading: "BSc Computer Science — State University", text: "2012-2016", bullets: [] },
        ],
      },
    ],
  };
}

/** Section `i` of a document; throws instead of returning undefined. */
export function sectionAt(doc: ResumeDocument, i: number): ResumeDocument["sections"][number] {
  const s = doc.sections[i];
  if (!s) throw new Error(`no section ${i}`);
  return s;
}

/** Item `j` of section `i`; throws instead of returning undefined. */
export function itemAt(
  doc: ResumeDocument,
  i: number,
  j: number,
): ResumeDocument["sections"][number]["items"][number] {
  const it = sectionAt(doc, i).items[j];
  if (!it) throw new Error(`no item ${i}.${j}`);
  return it;
}
