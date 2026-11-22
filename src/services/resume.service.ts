import { renderMarkdown } from "../lib/markdown.js";
import { dataBlock } from "../llm/data-block.js";
import { findPii } from "../llm/pii-guard.js";
import type { ResumeRepo, ResumeRow } from "../repositories/resume.repository.js";
import { NotFoundError, ValidationError } from "./errors.js";
import type { LlmService } from "./llm.service.js";
import type {
  ContactItem,
  PersonalInfoMeta,
  PersonalInfoService,
} from "./personal-info.service.js";
import type { Profile, ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";
import type { PageSize } from "./settings-keys.js";

export type Resume = ResumeRow;

export const TAILOR_MAX_OUTPUT_TOKENS = 4000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResumeInput {
  title: string;
  company?: string;
  jobDescription: string;
}

/** Everything a Print View needs, already resolved and sanitized. */
export interface PrintData {
  fullName: string;
  header: ContactItem[];
  bodyHtml: string;
  empty: boolean;
  /** Labels of Personal Info Fields found inside the body. */
  warnings: string[];
  pageSize: PageSize;
}

export interface Download {
  filename: string;
  text: string;
}

export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "resume";
}

const required = (field: string, label: string, value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${label} is required`, { [field]: "is required" });
  }
  return value.trim();
};

export class ResumeService {
  constructor(
    protected readonly resumes: ResumeRepo,
    protected readonly profile: ProfileService,
    protected readonly settings: SettingsService,
    protected readonly personalInfo: PersonalInfoService,
    protected readonly llm: LlmService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(): Promise<Resume[]> {
    return this.resumes.list();
  }

  async get(id: string): Promise<Resume> {
    const row = UUID.test(id) ? await this.resumes.find(id) : null;
    if (!row) throw new NotFoundError("Resume not found");
    return row;
  }

  async create(input: ResumeInput): Promise<Resume> {
    const title = required("title", "Title", input.title);
    const jobDescription = required("jobDescription", "Job Description", input.jobDescription);
    const company = input.company?.trim() || null;
    return this.resumes.insert({ title, company, jobDescription });
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.resumes.delete(id);
  }

  /** Personal Info Fields the editor offers as header checkboxes. */
  headerOptions(): Promise<PersonalInfoMeta[]> {
    return this.personalInfo.list();
  }

  /** Tailors the Master CV to the Job Description. The model sees only those two texts. */
  async generate(id: string): Promise<Resume> {
    const resume = await this.get(id);
    const profile = await this.loadProfile();
    if (!profile || profile.masterCv.trim() === "") {
      throw new ValidationError("Fill the master CV first");
    }
    const { text, model } = await this.llm.generate({
      area: "tailor",
      system: profile.tailorSystemPrompt,
      body: profile.masterCv,
      input: `Today's date: ${this.now().toISOString().slice(0, 10)}\n\n${dataBlock("JOB_DESCRIPTION", resume.jobDescription)}`,
      maxOutputTokens: TAILOR_MAX_OUTPUT_TOKENS,
    });
    return this.update(id, { content: text, model });
  }

  /** Saves the markdown and the selected header keys after the PII Guard. */
  async save(id: string, content: string, headerKeys: string[]): Promise<Resume> {
    await this.get(id);
    const fields = await this.personalInfo.allValues();
    const found = findPii(content, fields)[0];
    if (found) {
      throw new ValidationError(
        `Your ${found.label} is in the body — keep contact data in Personal info`,
      );
    }
    const existing = fields.map((f) => f.key);
    const kept = [...new Set(headerKeys)].filter((k) => existing.includes(k));
    const all = existing.every((k) => kept.includes(k));
    return this.update(id, { content, headerFields: all ? null : kept });
  }

  async printData(id: string): Promise<PrintData> {
    const resume = await this.get(id);
    const items = await this.personalInfo.contactFor("print");
    const selected = resume.headerFields;
    const header = selected === null ? items : items.filter((i) => selected.includes(i.key));
    return this.buildPrint(header, resume.content, items);
  }

  async profilePrintData(): Promise<PrintData> {
    const profile = await this.loadProfile();
    const items = await this.personalInfo.contactFor("print");
    return this.buildPrint(items, profile?.masterCv ?? "", items, profile);
  }

  async download(id: string): Promise<Download> {
    const resume = await this.get(id);
    const data = await this.printData(id);
    const lines = [`# ${data.fullName}`, ...data.header.map((h) => `${h.label}: ${h.value}`)];
    return {
      filename: `${slugify(resume.title)}.md`,
      text: `${lines.join("\n")}\n\n${resume.content}`,
    };
  }

  private async update(id: string, patch: Parameters<ResumeRepo["update"]>[1]): Promise<Resume> {
    const row = await this.resumes.update(id, patch);
    if (!row) throw new NotFoundError("Resume not found");
    return row;
  }

  private async loadProfile(): Promise<Profile | null> {
    try {
      return await this.profile.get();
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  private async buildPrint(
    header: ContactItem[],
    body: string,
    allFields: ContactItem[],
    known?: Profile | null,
  ): Promise<PrintData> {
    const profile = known === undefined ? await this.loadProfile() : known;
    return {
      fullName: profile?.fullName ?? "",
      header,
      bodyHtml: renderMarkdown(body),
      empty: body.trim() === "",
      warnings: findPii(body, allFields).map((m) => m.label),
      pageSize: await this.settings.pageSize(),
    };
  }
}
