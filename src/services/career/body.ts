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
