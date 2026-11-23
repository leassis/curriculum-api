import { z } from "zod";

export const KINDS = [
  "experience",
  "project",
  "education",
  "certification",
  "course",
  "skill_group",
  "language",
  "publication",
  "honour",
] as const;
export type Kind = (typeof KINDS)[number];

export type Field =
  | "title"
  | "organisation"
  | "location"
  | "startYear"
  | "startMonth"
  | "endYear"
  | "endMonth"
  | "current"
  | "text"
  | "bullets"
  | "skills"
  | "level";

export const MAX_ITEMS = 200;
export const MIN_YEAR = 1950;
export const MAX_YEAR = 2100;

const DATES: Field[] = ["startYear", "startMonth", "endYear", "endMonth"];
const BODY: Field[] = ["text", "bullets"];

export interface KindMeta {
  section: string;
  add: string;
  ongoing?: string;
  fields: Field[];
  required: Field[];
  labels: Partial<Record<Field, string>>;
}

export const KIND_META: Record<Kind, KindMeta> = {
  experience: {
    section: "Experience",
    add: "Add experience",
    ongoing: "I currently work here",
    fields: ["title", "organisation", "location", ...DATES, "current", ...BODY, "skills"],
    required: ["title", "organisation", "startYear"],
    labels: { title: "Position", organisation: "Company", skills: "Tech stack" },
  },
  project: {
    section: "Projects",
    add: "Add project",
    ongoing: "Ongoing",
    fields: ["title", "organisation", ...DATES, "current", ...BODY, "skills"],
    required: ["title", "startYear"],
    labels: { title: "Project", organisation: "Client or organisation", skills: "Tech stack" },
  },
  education: {
    section: "Education",
    add: "Add education",
    fields: ["title", "organisation", ...DATES, ...BODY],
    required: ["title", "organisation"],
    labels: { title: "Degree", organisation: "Institution" },
  },
  certification: {
    section: "Certifications",
    add: "Add certification",
    ongoing: "No expiry",
    fields: ["title", "organisation", ...DATES, "current", ...BODY],
    required: ["title", "organisation"],
    labels: { title: "Certification", organisation: "Issuer" },
  },
  course: {
    section: "Courses",
    add: "Add course",
    fields: ["title", "organisation", ...DATES, ...BODY],
    required: ["title", "organisation"],
    labels: { title: "Course", organisation: "Provider" },
  },
  skill_group: {
    section: "Skills",
    add: "Add skill group",
    fields: ["title", "skills"],
    required: ["title", "skills"],
    labels: { title: "Skill group" },
  },
  language: {
    section: "Languages",
    add: "Add language",
    fields: ["title", "level"],
    required: ["title", "level"],
    labels: { title: "Language" },
  },
  publication: {
    section: "Publications",
    add: "Add publication",
    fields: ["title", "organisation", ...DATES, ...BODY],
    required: ["title"],
    labels: { title: "Publication", organisation: "Publisher" },
  },
  honour: {
    section: "Honours",
    add: "Add honour",
    fields: ["title", "organisation", ...DATES, ...BODY],
    required: ["title"],
    labels: { title: "Honour", organisation: "Awarded by" },
  },
};

const FIELD_LABELS: Record<Field, string> = {
  title: "Title",
  organisation: "Organisation",
  location: "Location",
  startYear: "Start year",
  startMonth: "Start month",
  endYear: "End year",
  endMonth: "End month",
  current: "Ongoing",
  text: "Details",
  bullets: "Bullets",
  skills: "Skills",
  level: "Level",
};

export function fieldLabel(kind: Kind, field: Field): string {
  return KIND_META[kind].labels[field] ?? FIELD_LABELS[field];
}

export const CareerItemObject = z.object({
  id: z.uuid(),
  kind: z.enum(KINDS),
  title: z.string(),
  organisation: z.string(),
  location: z.string(),
  startYear: z.number().nullable(),
  startMonth: z.number().nullable(),
  endYear: z.number().nullable(),
  endMonth: z.number().nullable(),
  current: z.boolean(),
  text: z.string(),
  bullets: z.array(z.string()),
  skills: z.array(z.string()),
  level: z.string(),
});

export type CareerItem = z.infer<typeof CareerItemObject>;

const MAX_LENGTH = {
  title: 200,
  organisation: 200,
  location: 200,
  level: 200,
  text: 4000,
} as const;
const MAX_BULLETS = 30;
const MAX_BULLET = 600;
const MAX_SKILLS = 50;
const MAX_SKILL = 100;
const SEPARATOR = " · ";
const DATE_PART = "(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) )?\\d{4}";
const DATE_LIKE = new RegExp(
  `^(?:${DATE_PART}|(?:${DATE_PART} )?[–-] (?:${DATE_PART}|Present|No expiry))$`,
);
const ONE_LINE: Field[] = ["title", "organisation", "location", "level"];

function isEmpty(value: unknown): boolean {
  return (
    value === "" || value === null || value === false || (Array.isArray(value) && !value.length)
  );
}

function isBlank(value: unknown): boolean {
  return isEmpty(typeof value === "string" ? value.trim() : value);
}

function validYear(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR);
}

function validMonth(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 12);
}

function itemIssues(item: CareerItem): string[] {
  const meta = KIND_META[item.kind];
  const label = (field: Field) => fieldLabel(item.kind, field);
  const issues: string[] = [];

  for (const field of meta.required) {
    if (isBlank(item[field])) issues.push(`${label(field)} is required`);
  }
  for (const field of Object.keys(FIELD_LABELS) as Field[]) {
    if (!meta.fields.includes(field) && !isEmpty(item[field])) {
      issues.push(`${label(field)} is not used by ${item.kind}`);
    }
  }
  for (const field of ["title", "organisation", "location", "level", "text"] as const) {
    if (item[field].length > MAX_LENGTH[field]) {
      issues.push(`${label(field)} is too long (max ${MAX_LENGTH[field]} characters)`);
    }
  }
  if (item.bullets.length > MAX_BULLETS) {
    issues.push(`${label("bullets")} are limited to ${MAX_BULLETS}`);
  }
  if (item.bullets.some((b) => b.length > MAX_BULLET)) {
    issues.push(`A bullet is too long (max ${MAX_BULLET} characters)`);
  }
  if (item.skills.length > MAX_SKILLS) {
    issues.push(`${label("skills")} are limited to ${MAX_SKILLS}`);
  }
  if (item.skills.some((s) => s.length > MAX_SKILL)) {
    issues.push(`A skill in ${label("skills")} is too long (max ${MAX_SKILL} characters)`);
  }
  for (const field of DATES) {
    const value = item[field as "startYear"];
    const valid = field.endsWith("Year") ? validYear(value) : validMonth(value);
    if (!valid) issues.push(`${label(field)} is out of range`);
  }
  if (item.startMonth !== null && item.startYear === null) {
    issues.push(`${label("startMonth")} needs a year`);
  }
  if (item.endMonth !== null && item.endYear === null) {
    issues.push(`${label("endMonth")} needs a year`);
  }
  if (item.startYear !== null && item.endYear !== null) {
    const sameYear = item.endYear === item.startYear;
    const monthsKnown = item.startMonth !== null && item.endMonth !== null;
    const before =
      item.endYear < item.startYear ||
      (sameYear && monthsKnown && (item.endMonth as number) < (item.startMonth as number));
    if (before) issues.push("End date is before start date");
  }
  for (const field of ONE_LINE) {
    if (/[\r\n]/.test(item[field as "title"])) issues.push(`${label(field)} must be one line`);
  }
  for (const field of ["organisation", "location"] as const) {
    if (item[field].includes(SEPARATOR)) issues.push(`${label(field)} cannot contain " · "`);
    if (DATE_LIKE.test(item[field].trim())) issues.push(`${label(field)} cannot read as a date`);
  }
  if (item.bullets.some((b) => /[\r\n]/.test(b))) issues.push("A bullet must be one line");
  if (item.skills.some((s) => /[\r\n,]/.test(s))) {
    issues.push(`A skill in ${label("skills")} cannot contain a comma or a line break`);
  }
  if (item.text.split(/\r?\n/).some((line) => /^(#|- |Stack: )/.test(line))) {
    issues.push(`${label("text")} lines cannot start with "#", "- " or "Stack: "`);
  }
  return issues;
}

export function refineItem(item: CareerItem, ctx: z.RefinementCtx): void {
  for (const message of itemIssues(item)) ctx.addIssue({ code: "custom", message });
}

export const CareerItemSchema = CareerItemObject.superRefine(refineItem);

export const CareerLibrarySchema = z.object({
  version: z.literal(1),
  items: z.array(CareerItemSchema).max(MAX_ITEMS, `The library is limited to ${MAX_ITEMS} items`),
});

export type CareerLibrary = z.infer<typeof CareerLibrarySchema>;

const EMPTY: Omit<CareerItem, "id" | "kind"> = {
  title: "",
  organisation: "",
  location: "",
  startYear: null,
  startMonth: null,
  endYear: null,
  endMonth: null,
  current: false,
  text: "",
  bullets: [],
  skills: [],
  level: "",
};

function clean(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v.trim() : v)).filter((v) => v !== "");
  }
  return value;
}

export function normalizeItem(
  item: Pick<CareerItem, "id" | "kind"> & Partial<CareerItem>,
): CareerItem {
  const meta = KIND_META[item.kind];
  const out: Record<string, unknown> = { id: item.id, kind: item.kind };
  for (const field of Object.keys(EMPTY) as Field[]) {
    out[field] = meta.fields.includes(field) ? clean(item[field] ?? EMPTY[field]) : EMPTY[field];
  }
  if (out.current) {
    out.endYear = null;
    out.endMonth = null;
  }
  return out as CareerItem;
}
