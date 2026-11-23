import type { ResumeDocument } from "../../src/services/tailor/document";

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
