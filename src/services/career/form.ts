import { type CareerItem, type Field, KIND_META, type Kind } from "./item";

type FormBody = Record<string, unknown>;
export type FormValues = Record<string, string>;
export type FormItem = Omit<CareerItem, "id">;

const BULLET = "- ";

function str(body: FormBody, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

function year(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitDetails(raw: string): { text: string; bullets: string[] } {
  const text: string[] = [];
  const bullets: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith(BULLET)) {
      const bullet = line.slice(BULLET.length).trim();
      if (bullet) bullets.push(bullet);
    } else {
      text.push(line.trimEnd());
    }
  }
  return { text: text.join("\n").trim(), bullets };
}

function listKey(kind: Kind): "stack" | "skills" {
  return kind === "skill_group" ? "skills" : "stack";
}

export function itemFromForm(kind: Kind, body: FormBody): FormItem {
  const has = (field: Field) => KIND_META[kind].fields.includes(field);
  const { text, bullets } = splitDetails(has("text") ? str(body, "details") : "");
  return {
    kind,
    title: str(body, "title"),
    organisation: has("organisation") ? str(body, "organisation") : "",
    location: has("location") ? str(body, "location") : "",
    startYear: has("startYear") ? year(str(body, "startYear")) : null,
    startMonth: has("startMonth") ? year(str(body, "startMonth")) : null,
    endYear: has("endYear") ? year(str(body, "endYear")) : null,
    endMonth: has("endMonth") ? year(str(body, "endMonth")) : null,
    current: has("current") && str(body, "current") !== "",
    text,
    bullets,
    skills: has("skills") ? splitList(str(body, listKey(kind))) : [],
    level: has("level") ? str(body, "level") : "",
  };
}

function digits(value: number | null): string {
  return value === null ? "" : String(value);
}

export function formValues(item: CareerItem): FormValues {
  const details = [item.text, ...item.bullets.map((b) => `${BULLET}${b}`)]
    .filter(Boolean)
    .join("\n");
  const values: FormValues = {
    title: item.title,
    organisation: item.organisation,
    location: item.location,
    startYear: digits(item.startYear),
    startMonth: digits(item.startMonth),
    endYear: digits(item.endYear),
    endMonth: digits(item.endMonth),
    current: item.current ? "on" : "",
    details,
    level: item.level,
  };
  values[listKey(item.kind)] = item.skills.join(", ");
  return values;
}
