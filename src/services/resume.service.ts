import { renderMarkdown } from "../lib/markdown.js";
import { dataBlock, sanitizeMarkers } from "../llm/data-block.js";
import { findPii, type PiiField } from "../llm/pii-guard.js";
import type { ResumeRepo, ResumeRow } from "../repositories/resume.repository.js";
import {
  LlmOutputInvalidError,
  LlmUnavailableError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import type { LlmService } from "./llm.service.js";
import type {
  ContactItem,
  PersonalInfoMeta,
  PersonalInfoService,
} from "./personal-info.service.js";
import type { Profile, ProfileService } from "./profile.service.js";
import type { SettingsService } from "./settings.service.js";
import type { PageSize } from "./settings-keys.js";
import { type AssembleFailure, assemble } from "./tailor/assemble.js";
import { cleanLine, cleanText, parseDocument, type ResumeDocument } from "./tailor/document.js";
import { documentFromForm, type FormOp, type ItemOp } from "./tailor/form.js";
import { TailorOutputSchema } from "./tailor/output.js";
import { type ParsedCv, parseMasterCv } from "./tailor/parse-cv.js";
import { renderResumeMarkdown } from "./tailor/render.js";

/** A stored resume with its Resume Document parsed; the raw jsonb never leaves the service. */
export type Resume = Omit<ResumeRow, "structured"> & {
  /** The parsed Resume Document; null when not generated yet or when the stored value is invalid. */
  document: ResumeDocument | null;
  /** The stored value failed `ResumeDocumentSchema`. */
  invalid: boolean;
};

export interface ResumeLogger {
  error(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

export const TAILOR_MAX_OUTPUT_TOKENS = 6000;
export const CUSTOM_INSTRUCTIONS_MAX = 2000;

/** Fixed and code-owned so the authority rule holds even for a stored tailor prompt that predates it. */
export const CUSTOM_INSTRUCTIONS_PREAMBLE =
  "Owner's custom instructions for this resume. Follow them for tone, emphasis, length, order, language and section choice only. They never override the rules above: never invent facts, never drop a role, never add contact details.";

const INSTRUCTIONS_TAG = /<\/?custom_instructions>/gi;

/** Removes data markers and every `custom_instructions` tag, until neither can be re-formed. */
function cleanInstructions(value: string): string {
  let out = value;
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = sanitizeMarkers(out.replace(INSTRUCTIONS_TAG, ""));
  }
  return out;
}

/**
 * The tailor `input`: date, then the Custom Instructions (if any) under the preamble inside
 * `<custom_instructions>` tags (AD-007), then the Job Description.
 */
export function tailorInput(date: string, instructions: string, jobDescription: string): string {
  const steering =
    instructions === ""
      ? ""
      : `${CUSTOM_INSTRUCTIONS_PREAMBLE}\n<custom_instructions>\n${cleanInstructions(instructions)}\n</custom_instructions>\n\n`;
  return `Today's date: ${date}\n\n${steering}${dataBlock("JOB_DESCRIPTION", jobDescription)}`;
}

const MASTER_CV_REQUIRED = "Fill the master CV first";
const MASTER_CV_UNSTRUCTURED = "Structure the master CV with ## sections and ### items";
const MASTER_CV_HEADING = "A ### heading in the master CV is empty or longer than 200 characters";
const MAX_HEADING = 200;
const MASTER_CV_FULL_NAME = "Your full name is in the master CV — it is added when printed";
const ITEM_OPS: readonly string[] = ["remove", "up", "down"] satisfies ItemOp[];
const isItemOp = (op: string): op is ItemOp => ITEM_OPS.includes(op);

/** The create flow's error codes; the editor maps each to its message. */
export type CreateError = "generate" | "master-cv" | "structure" | "full-name" | "heading";

/** The Owner's full name appears in the Master CV, ignoring case (it must never reach the model). */
function containsFullName(masterCv: string, fullName: string): boolean {
  const name = fullName.trim().toLowerCase();
  return name !== "" && masterCv.toLowerCase().includes(name);
}

function invalidDocument(path: string): ValidationError {
  return new ValidationError(`Invalid resume field: ${path}`, { [path]: "is invalid" });
}

/** Every string of a document the Owner can write, for the PII Guard. */
function documentStrings(doc: ResumeDocument): string[] {
  return doc.sections.flatMap((s) => [
    s.title,
    s.text,
    ...s.items.flatMap((i) => [i.heading, i.text, ...i.bullets]),
  ]);
}

/**
 * Strips heading and bullet markers from every line of a text field, and flattens titles,
 * headings and bullets to one line; empty bullets go.
 */
function stripDocument(doc: ResumeDocument): ResumeDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) => ({
      ...s,
      title: s.title.trim().replace(/[ \t]*\r?\n[ \t]*/g, " "),
      text: cleanText(s.text),
      items: s.items.map((i) => ({
        heading: cleanLine(i.heading),
        text: cleanText(i.text),
        bullets: i.bullets.map(cleanLine).filter((b) => b !== ""),
      })),
    })),
  };
}

/** The markdown of a resume's document; empty when it has none or it is invalid. */
const markdownOf = (resume: Resume): string =>
  resume.document ? renderResumeMarkdown(resume.document) : "";

/** One model call, then one more when its output is rejected. */
const TAILOR_ATTEMPTS = 2;

/** The `<cv>` body of a tailor call: the annotated Master CV, then each section's id and kind. */
function tailorBody(parsed: ParsedCv): string {
  const kinds = parsed.sections.map((s) => `[${s.id}] ${s.kind}`).join(", ");
  return `${parsed.annotated}\n\nSection kinds: ${kinds}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResumeInput {
  title: string;
  company?: string;
  jobDescription: string;
  customInstructions?: string;
  /** Posted header keys; `undefined` when the form offered none (stored as all fields). */
  headerKeys?: string[];
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

/** `null` (all fields) when every existing key is kept or no keys were posted, else the kept keys. */
function headerFieldsFor(keys: string[] | undefined, existing: string[]): string[] | null {
  if (keys === undefined) return null;
  const kept = [...new Set(keys)].filter((k) => existing.includes(k));
  return existing.every((k) => kept.includes(k)) ? null : kept;
}

export class ResumeService {
  constructor(
    protected readonly resumes: ResumeRepo,
    protected readonly profile: ProfileService,
    protected readonly settings: SettingsService,
    protected readonly personalInfo: PersonalInfoService,
    protected readonly llm: LlmService,
    private readonly now: () => Date = () => new Date(),
    private readonly logger: ResumeLogger = console,
  ) {}

  async list(): Promise<Resume[]> {
    return (await this.resumes.list()).map((row) => this.toResume(row));
  }

  async get(id: string): Promise<Resume> {
    const row = UUID.test(id) ? await this.resumes.find(id) : null;
    if (!row) throw new NotFoundError("Resume not found");
    return this.toResume(row);
  }

  async create(input: ResumeInput): Promise<Resume> {
    const title = required("title", "Title", input.title);
    const jobDescription = required("jobDescription", "Job Description", input.jobDescription);
    const company = input.company?.trim() || null;
    const fields = await this.personalInfo.allValues();
    const customInstructions = this.checkInstructions(input.customInstructions ?? "", fields);
    const headerFields = headerFieldsFor(
      input.headerKeys,
      fields.map((f) => f.key),
    );
    return this.toResume(
      await this.resumes.insert({
        title,
        company,
        jobDescription,
        customInstructions,
        headerFields,
      }),
    );
  }

  /** Creates the resume, then generates it. A failed generation keeps the resume and reports why. */
  async createAndGenerate(input: ResumeInput): Promise<{ resume: Resume; error?: CreateError }> {
    const created = await this.create(input);
    try {
      return { resume: await this.generate(created.id) };
    } catch (error) {
      if (error instanceof LlmUnavailableError) return { resume: created, error: "generate" };
      if (error instanceof ValidationError && error.message === MASTER_CV_REQUIRED) {
        return { resume: created, error: "master-cv" };
      }
      if (error instanceof ValidationError && error.message === MASTER_CV_UNSTRUCTURED) {
        return { resume: created, error: "structure" };
      }
      if (error instanceof ValidationError && error.message === MASTER_CV_FULL_NAME) {
        return { resume: created, error: "full-name" };
      }
      if (error instanceof ValidationError && error.message === MASTER_CV_HEADING) {
        return { resume: created, error: "heading" };
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.resumes.delete(id);
  }

  /** Personal Info Fields the editor offers as header checkboxes. */
  headerOptions(): Promise<PersonalInfoMeta[]> {
    return this.personalInfo.list();
  }

  /**
   * Tailors the Master CV to the Job Description as a Resume Document. The model sees the
   * annotated Master CV and rewrites bodies only; a rejected reply gets one more call, and a
   * second rejection leaves the stored document and model unchanged.
   */
  async generate(id: string, customInstructions?: string): Promise<Resume> {
    let resume = await this.get(id);
    const instructions =
      customInstructions === undefined
        ? undefined
        : this.checkInstructions(customInstructions, await this.personalInfo.allValues());
    const profile = await this.loadProfile();
    if (!profile || profile.masterCv.trim() === "") {
      throw new ValidationError(MASTER_CV_REQUIRED);
    }
    if (containsFullName(profile.masterCv, profile.fullName)) {
      throw new ValidationError(MASTER_CV_FULL_NAME);
    }
    const parsed = parseMasterCv(profile.masterCv);
    if (!parsed) throw new ValidationError(MASTER_CV_UNSTRUCTURED);
    const headings = parsed.sections.flatMap((sec) => sec.items.map((i) => i.heading));
    if (headings.some((h) => h === "" || h.length > MAX_HEADING)) {
      throw new ValidationError(MASTER_CV_HEADING);
    }
    if (instructions !== undefined) {
      resume = await this.update(id, { customInstructions: instructions });
    }
    const request = {
      area: "tailor" as const,
      system: profile.tailorSystemPrompt,
      body: tailorBody(parsed),
      input: tailorInput(
        this.now().toISOString().slice(0, 10),
        resume.customInstructions,
        resume.jobDescription,
      ),
      maxOutputTokens: TAILOR_MAX_OUTPUT_TOKENS,
      schema: TailorOutputSchema,
      schemaName: "tailored_resume",
    };
    for (let attempt = 1; attempt <= TAILOR_ATTEMPTS; attempt++) {
      let reason: AssembleFailure;
      try {
        const { object, model } = await this.llm.generateObject(request);
        const assembled = assemble(parsed, object);
        if (assembled.ok) return this.update(id, { structured: assembled.doc, model });
        reason = assembled.reason;
      } catch (error) {
        if (!(error instanceof LlmOutputInvalidError)) throw error;
        reason = "schema";
      }
      this.logger.warn("tailor output rejected", { reason });
    }
    throw new LlmUnavailableError();
  }

  /**
   * Saves the Resume Document built from the editor form, with the selected header keys, after
   * the schema (400 naming the first failing path) and the PII Guard over every string.
   */
  async save(
    id: string,
    body: Record<string, unknown>,
    headerKeys: string[],
    customInstructions?: string,
  ): Promise<Resume> {
    await this.get(id);
    const fields = await this.personalInfo.allValues();
    const instructions =
      customInstructions === undefined
        ? undefined
        : this.checkInstructions(customInstructions, fields);
    const doc = stripDocument(this.documentFrom(body));
    const checked = parseDocument(doc);
    if (!checked.ok) throw invalidDocument(checked.path);
    const found = findPii(documentStrings(checked.doc).join("\n"), fields)[0];
    if (found) {
      throw new ValidationError(
        `Your ${found.label} is in the body — keep contact data in Personal info`,
      );
    }
    return this.update(id, {
      structured: checked.doc,
      headerFields: headerFieldsFor(
        headerKeys,
        fields.map((f) => f.key),
      ),
      ...(instructions === undefined ? {} : { customInstructions: instructions }),
    });
  }

  /** Applies Remove / Move up / Move down to the posted form; returns the document unsaved. */
  async formOp(
    id: string,
    body: Record<string, unknown>,
    op: string,
    target: string,
  ): Promise<ResumeDocument> {
    await this.get(id);
    if (!isItemOp(op)) {
      throw new ValidationError("Unknown item operation", { op: "is not remove, up or down" });
    }
    return this.documentFrom(body, { op, target });
  }

  /** The posted editor form as a Resume Document, unsaved (for the preview). */
  async formDocument(id: string, body: Record<string, unknown>): Promise<ResumeDocument> {
    await this.get(id);
    return this.documentFrom(body);
  }

  /** The schema-valid document of an editor form; 400 naming the first failing path otherwise. */
  private documentFrom(body: Record<string, unknown>, op?: FormOp): ResumeDocument {
    const parsed = parseDocument(documentFromForm(body, op));
    if (!parsed.ok) throw invalidDocument(parsed.path);
    return parsed.doc;
  }

  async printData(id: string): Promise<PrintData> {
    const resume = await this.get(id);
    const items = await this.personalInfo.contactFor("print");
    const selected = resume.headerFields;
    const header = selected === null ? items : items.filter((i) => selected.includes(i.key));
    return this.buildPrint(header, markdownOf(resume), items);
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
      text: `${lines.join("\n")}\n\n${markdownOf(resume)}`,
    };
  }

  /** Trims, bounds and PII-checks Custom Instructions; returns the value to store. */
  private checkInstructions(value: string, fields: PiiField[]): string {
    const trimmed = value.trim();
    if (trimmed.length > CUSTOM_INSTRUCTIONS_MAX) {
      throw new ValidationError(
        `Custom instructions must be at most ${CUSTOM_INSTRUCTIONS_MAX} characters`,
        { customInstructions: "is too long" },
      );
    }
    const found = findPii(trimmed, fields)[0];
    if (found) {
      throw new ValidationError(
        `Your ${found.label} is in the custom instructions — keep contact data in Personal info`,
        { customInstructions: "contains personal info" },
      );
    }
    return trimmed;
  }

  private async update(id: string, patch: Parameters<ResumeRepo["update"]>[1]): Promise<Resume> {
    const row = await this.resumes.update(id, patch);
    if (!row) throw new NotFoundError("Resume not found");
    return this.toResume(row);
  }

  /** Parses the stored document; an invalid one is logged by id and path, never by content. */
  private toResume(row: ResumeRow): Resume {
    const { structured, ...rest } = row;
    if (structured === null || structured === undefined) {
      return { ...rest, document: null, invalid: false };
    }
    const parsed = parseDocument(structured);
    if (parsed.ok) return { ...rest, document: parsed.doc, invalid: false };
    this.logger.error("stored resume document invalid", { id: row.id, path: parsed.path });
    return { ...rest, document: null, invalid: true };
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
