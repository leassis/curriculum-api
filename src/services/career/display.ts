import { type CareerItem, KIND_META, KINDS, type Kind } from "./item";

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const RANGE_SEPARATOR = " – ";
export const META_SEPARATOR = " · ";

const END_LABELS: Partial<Record<Kind, string>> = {
  experience: "Present",
  project: "Present",
  certification: "No expiry",
};

export function endLabel(kind: Kind): string | undefined {
  return END_LABELS[kind];
}

export function formatDate(year: number, month?: number | null): string {
  return month ? `${MONTHS[month - 1]} ${year}` : `${year}`;
}

export function dateRange(item: CareerItem): string {
  const start = item.startYear === null ? "" : formatDate(item.startYear, item.startMonth);
  let end = "";
  if (item.current) end = endLabel(item.kind) ?? "";
  else if (item.endYear !== null) end = formatDate(item.endYear, item.endMonth);
  if (start && end) return `${start}${RANGE_SEPARATOR}${end}`;
  if (end) return `– ${end}`;
  return start;
}

export function metaLine(item: CareerItem): string {
  switch (item.kind) {
    case "skill_group":
      return "";
    case "language":
      return item.level;
    case "experience":
      return [item.organisation, item.location, dateRange(item)]
        .filter(Boolean)
        .join(META_SEPARATOR);
    default:
      return [item.organisation, dateRange(item)].filter(Boolean).join(META_SEPARATOR);
  }
}

export interface KindGroup {
  kind: Kind;
  section: string;
  items: CareerItem[];
}

export function groupByKind(items: CareerItem[]): KindGroup[] {
  return KINDS.map((kind) => ({
    kind,
    section: KIND_META[kind].section,
    items: items.filter((i) => i.kind === kind),
  }));
}
