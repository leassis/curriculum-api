import { randomUUID } from "node:crypto";
import type { CareerItem, CareerLibrary, Kind } from "../../src/services/career/item";
import type { ResumeDocument } from "../../src/services/tailor/document";
import type { TailorOutput } from "../../src/services/tailor/output";

const VALID: Record<Kind, Partial<CareerItem>> = {
  experience: { title: "Engineer", organisation: "Acme", startYear: 2020 },
  project: { title: "Project", startYear: 2020 },
  education: { title: "BSc Computer Science", organisation: "State University" },
  certification: { title: "Certified", organisation: "Issuer" },
  course: { title: "Course", organisation: "Provider" },
  skill_group: { title: "Languages", skills: ["TypeScript"] },
  language: { title: "English", level: "Fluent" },
  publication: { title: "Paper" },
  honour: { title: "Award" },
};

export function item(kind: Kind, overrides: Partial<CareerItem> = {}): CareerItem {
  return {
    id: randomUUID(),
    kind,
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
    ...VALID[kind],
    ...overrides,
  };
}

export const SAMPLE_IDS = {
  globex: "11111111-1111-4111-8111-111111111111",
  initech: "22222222-2222-4222-8222-222222222222",
  platform: "33333333-3333-4333-8333-333333333333",
  bsc: "44444444-4444-4444-8444-444444444444",
  msc: "55555555-5555-4555-8555-555555555555",
  aws: "66666666-6666-4666-8666-666666666666",
  course: "77777777-7777-4777-8777-777777777777",
  backend: "88888888-8888-4888-8888-888888888888",
  tools: "99999999-9999-4999-8999-999999999999",
  english: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const;

export function sampleLibrary(): CareerLibrary {
  return {
    version: 1,
    items: [
      item("experience", {
        id: SAMPLE_IDS.globex,
        title: "Staff Engineer",
        organisation: "Globex",
        location: "Remote",
        startYear: 2020,
        startMonth: 1,
        current: true,
        text: "Led the platform team and its on-call rotation.",
        bullets: ["Cut p99 latency by 40%", "Mentored six engineers"],
        skills: ["TypeScript", "Postgres"],
      }),
      item("experience", {
        id: SAMPLE_IDS.initech,
        title: "Engineer",
        organisation: "Initech",
        startYear: 2016,
        endYear: 2020,
        bullets: ["Built the billing service"],
      }),
      item("project", {
        id: SAMPLE_IDS.platform,
        title: "Open source CLI",
        organisation: "Personal",
        startYear: 2022,
        startMonth: 3,
        endYear: 2023,
        text: "A command line tool for migrations.",
        skills: ["Rust"],
      }),
      item("education", {
        id: SAMPLE_IDS.bsc,
        title: "BSc Computer Science",
        organisation: "State University",
        startYear: 2012,
        endYear: 2016,
      }),
      item("education", {
        id: SAMPLE_IDS.msc,
        title: "MSc Software Engineering",
        organisation: "Tech Institute",
        startYear: 2017,
        endYear: 2019,
        bullets: ["Thesis on distributed systems"],
      }),
      item("certification", {
        id: SAMPLE_IDS.aws,
        title: "AWS Solutions Architect",
        organisation: "Amazon",
        startYear: 2021,
        startMonth: 6,
        current: true,
      }),
      item("course", {
        id: SAMPLE_IDS.course,
        title: "Distributed Systems",
        organisation: "Online School",
        startYear: 2018,
      }),
      item("skill_group", {
        id: SAMPLE_IDS.backend,
        title: "Backend",
        skills: ["TypeScript", "Postgres", "Kubernetes"],
      }),
      item("skill_group", { id: SAMPLE_IDS.tools, title: "Tools", skills: ["Git", "Docker"] }),
      item("language", { id: SAMPLE_IDS.english, title: "English", level: "Fluent" }),
    ],
  };
}

export function sampleDocumentV2(): ResumeDocument {
  return {
    version: 2,
    headline: "Backend engineer",
    summary: "Ten years building payment systems.",
    items: sampleLibrary().items.map((i) => ({
      ...i,
      id: i.id.replace(/^./, "b"),
      sourceId: i.id,
    })),
  };
}

export function sampleReplyV2(library: CareerItem[] = sampleLibrary().items): TailorOutput {
  return {
    headline: "Backend engineer",
    summary: "Ten years building payment systems.",
    items: library.map((i, n) => ({ source_id: `c${n + 1}`, text: i.text, bullets: i.bullets })),
    score: 70,
    score_rationale: "Covers the core requirements.",
    missing_skills: [],
    omissions: [],
    job_description_short: "- Backend engineer\n- Five years of TypeScript",
  };
}

export function textDocumentV2(summary: string): ResumeDocument {
  return { version: 2, headline: "", summary, items: [] };
}
