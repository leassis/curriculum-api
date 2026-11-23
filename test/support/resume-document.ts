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

/** The editor form fields of a document, as the form posts them: one bullet per line. */
export function documentForm(doc: ResumeDocument): Record<string, string> {
  const form: Record<string, string> = {};
  doc.sections.forEach((s, i) => {
    form[`sections.${i}.title`] = s.title;
    form[`sections.${i}.kind`] = s.kind;
    form[`sections.${i}.text`] = s.text;
    s.items.forEach((it, j) => {
      form[`sections.${i}.items.${j}.heading`] = it.heading;
      form[`sections.${i}.items.${j}.text`] = it.text;
      form[`sections.${i}.items.${j}.bullets`] = it.bullets.join("\n");
    });
  });
  return form;
}

/** A document of one "Summary" section holding `text`. */
export function textDocument(text: string): ResumeDocument {
  return { version: 1, sections: [{ title: "Summary", kind: "other", text, items: [] }] };
}

/** The editor form of `textDocument(text)`. */
export const textForm = (text: string) => documentForm(textDocument(text));

const unescapeHtml = (s: string) =>
  s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");

const attrOf = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? unescapeHtml(m[1] ?? "") : undefined;
};

/**
 * The fields a browser posts for `#resume-form` in rendered editor HTML: inputs with a name
 * (checkboxes only when checked) and textareas, in document order. Repeated names collect.
 */
export function editorForm(html: string): Record<string, string | string[]> {
  const start = html.indexOf('id="resume-form"');
  if (start < 0) throw new Error("no #resume-form in the html");
  return formFields(html.slice(start, html.indexOf("</form>", start)));
}

/** The named inputs (checkboxes only when checked) and textareas of an html fragment. */
export function formFields(form: string): Record<string, string | string[]> {
  const fields: Record<string, string | string[]> = {};
  const add = (name: string, value: string) => {
    const prev = fields[name];
    if (prev === undefined) fields[name] = value;
    else fields[name] = Array.isArray(prev) ? [...prev, value] : [prev, value];
  };
  for (const m of form.matchAll(/<input\b[^>]*>|<textarea\b([^>]*)>([^<]*)<\/textarea>/g)) {
    const tag = m[0];
    const name = attrOf(tag, "name");
    if (name === undefined) continue;
    if (tag.startsWith("<textarea")) {
      add(name, unescapeHtml(m[2] ?? ""));
      continue;
    }
    if (attrOf(tag, "type") === "checkbox" && !/\schecked(?:[\s=>/])/.test(tag)) continue;
    add(name, attrOf(tag, "value") ?? "");
  }
  return fields;
}

/** The `hx-vals` of the item button labelled `label` for `target` (`s<i>.i<j>`), parsed. */
export function opVals(html: string, label: string, target: string): Record<string, string> {
  for (const m of html.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g)) {
    const vals = attrOf(m[0], "hx-vals");
    if (m[1] !== label || vals === undefined) continue;
    const parsed = JSON.parse(vals) as Record<string, string>;
    if (parsed.target === target) return parsed;
  }
  throw new Error(`no ${label} button for ${target}`);
}
