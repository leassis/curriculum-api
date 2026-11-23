import { groupByKind, metaLine } from "./display";
import type { CareerItem } from "./item";

const WRAPPED_FIRST_LINE = /^\\*\*.*\*$/;

function escapeFirstLine(text: string): string {
  return WRAPPED_FIRST_LINE.test(text.split("\n")[0] ?? "") ? `\\${text}` : text;
}

function renderItem(item: CareerItem, ids?: Map<string, string>): string {
  const tag = ids?.get(item.id);
  const lines = [`### ${item.title}${tag ? ` [${tag}]` : ""}`];
  if (item.kind === "skill_group") {
    lines.push(item.skills.join(", "));
    return lines.join("\n");
  }
  const meta = metaLine(item);
  if (meta) lines.push(`*${meta}*`);
  if (item.text) lines.push(escapeFirstLine(item.text));
  for (const bullet of item.bullets) lines.push(`- ${bullet}`);
  if (item.skills.length) lines.push(`Stack: ${item.skills.join(", ")}`);
  return lines.join("\n");
}

export function renderItemsMarkdown(items: CareerItem[], ids?: Map<string, string>): string {
  return groupByKind(items)
    .filter((group) => group.items.length)
    .map((group) =>
      [`## ${group.section}`, ...group.items.map((item) => renderItem(item, ids))].join("\n\n"),
    )
    .join("\n\n");
}
