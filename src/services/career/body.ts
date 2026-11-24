import type { CareerItem } from "./item";
import { renderItemsMarkdown } from "./markdown";

export interface BodyHeader {
  headline: string;
  summary: string;
}

export function renderCareerBody(
  header: BodyHeader,
  items: CareerItem[],
  options: { ids?: Map<string, string> } = {},
): string {
  return [header.headline.trim(), header.summary.trim(), renderItemsMarkdown(items, options.ids)]
    .filter(Boolean)
    .join("\n\n");
}

export const PROFILE_SECTIONS = {
  additionalInformation: "Additional information",
  lookingForwardNext: "Looking forward next",
} as const;

export interface BodySection {
  heading: string;
  text: string;
}

export function appendSections(body: string, sections: BodySection[]): string {
  return sections.reduce((out, { heading, text }) => {
    const trimmed = text.trim();
    return trimmed === "" ? out : `${out}\n\n## ${heading}\n\n${trimmed}`;
  }, body);
}
