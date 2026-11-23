import type { ResumeDocument } from "./document.js";

/** The one markdown rendering of a Resume Document: Print View, download and recruiter context. */
export function renderResumeMarkdown(doc: ResumeDocument): string {
  const blocks: string[] = [];
  for (const section of doc.sections) {
    if (section.kind !== "intro") blocks.push(`## ${section.title}`);
    if (section.text) blocks.push(section.text);
    for (const item of section.items) {
      blocks.push(`### ${item.heading}`);
      if (item.text) blocks.push(item.text);
      if (item.bullets.length > 0) blocks.push(item.bullets.map((b) => `- ${b}`).join("\n"));
    }
  }
  return blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
}
