import { randomUUID } from "node:crypto";
import { dataBlock } from "../llm/data-block.js";
import { IMPORT_PROMPT } from "../llm/import-prompt.js";
import { findPii, type PiiField, redactPii } from "../llm/pii-guard.js";
import type { CareerRepo } from "../repositories/career.repository.js";
import { itemFromForm } from "./career/form.js";
import {
  type CareerItem,
  type CareerLibrary,
  CareerLibrarySchema,
  type Kind,
  normalizeItem,
} from "./career/item.js";
import { parseItemsMarkdown, renderItemsMarkdown } from "./career/markdown.js";
import { addItem, type Direction, moveItem, removeItem, replaceItem } from "./career/ops.js";
import { NotFoundError, ValidationError } from "./errors.js";
import type { LlmService } from "./llm.service.js";
import type { PersonalInfoService } from "./personal-info.service.js";
import type { ProfileService } from "./profile.service.js";

const IMPORT_MAX_CHARS = 50_000;
const IMPORT_MAX_OUTPUT_TOKENS = 16_000;
const FENCE = /^```[\w-]*\r?\n([\s\S]*?)\r?\n```$/;
const NOT_FOUND = "Career item not found";
const FULL_NAME_MESSAGE = "Your full name is in the library — it is added when printed";

export function itemStrings(item: CareerItem): string[] {
  return [
    item.title,
    item.organisation,
    item.location,
    item.text,
    item.level,
    ...item.bullets,
    ...item.skills,
  ];
}

function parseLibrary(value: unknown): CareerLibrary {
  return CareerLibrarySchema.parse(value);
}

export class CareerService {
  constructor(
    private readonly repo: CareerRepo,
    private readonly personalInfo: PersonalInfoService,
    private readonly profile: ProfileService,
    private readonly llm: LlmService,
  ) {}

  async library(): Promise<CareerLibrary> {
    return parseLibrary(await this.repo.get());
  }

  async add(kind: Kind, body: Record<string, unknown>): Promise<CareerItem> {
    const item = normalizeItem({ ...itemFromForm(kind, body), id: randomUUID() });
    await this.write((items) => addItem(items, item));
    return item;
  }

  async edit(id: string, body: Record<string, unknown>): Promise<CareerItem> {
    let saved: CareerItem | undefined;
    await this.write((items) => {
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new NotFoundError(NOT_FOUND);
      saved = normalizeItem({ ...itemFromForm(existing.kind, body), id, kind: existing.kind });
      return replaceItem(items, id, saved) as CareerItem[];
    });
    return saved as CareerItem;
  }

  async move(id: string, direction: Direction): Promise<void> {
    await this.write((items) => moveItem(items, id, direction) ?? notFound());
  }

  async remove(id: string): Promise<void> {
    await this.write((items) => removeItem(items, id) ?? notFound());
  }

  async markdown(): Promise<string> {
    return renderItemsMarkdown((await this.library()).items);
  }

  async saveMarkdown(markdown: string): Promise<void> {
    await this.write((existing) => {
      const parsed = parseItemsMarkdown(markdown, existing);
      if (!parsed.ok) throw new ValidationError(`line ${parsed.line}: ${parsed.reason}`);
      return parsed.items;
    });
  }

  async importText(text: string): Promise<string> {
    if (text.trim() === "") throw new ValidationError("Paste some text to import");
    if (text.length > IMPORT_MAX_CHARS) {
      throw new ValidationError(`Text is limited to ${IMPORT_MAX_CHARS} characters`);
    }
    const fields: PiiField[] = [...(await this.personalInfo.allValues())];
    const fullName = await this.fullName();
    if (fullName) fields.push({ key: "FULL_NAME", label: "Full name", value: fullName });
    const { text: reply, truncated } = await this.llm.generate({
      area: "import",
      system: IMPORT_PROMPT,
      body: "",
      input: dataBlock("CV_TEXT", redactPii(text, fields)),
      maxOutputTokens: IMPORT_MAX_OUTPUT_TOKENS,
    });
    if (truncated) {
      throw new ValidationError(
        "The import was cut short, so later sections would be lost. Try a shorter text",
      );
    }
    const trimmed = reply.trim();
    return FENCE.exec(trimmed)?.[1] ?? trimmed;
  }

  private async write(change: (items: CareerItem[]) => CareerItem[]): Promise<void> {
    await this.repo.update(async (current) => {
      const before = parseLibrary(current).items;
      const candidate = { version: 1, items: change(before) };
      const checked = CareerLibrarySchema.safeParse(candidate);
      if (!checked.success) {
        throw new ValidationError(checked.error.issues[0]?.message ?? "Invalid career item");
      }
      const known = new Set(before);
      await this.guard(candidate.items.filter((i) => !known.has(i)));
      return checked.data;
    });
  }

  private async guard(items: CareerItem[]): Promise<void> {
    if (items.length === 0) return;
    const fields = await this.personalInfo.allValues();
    const fullName = await this.fullName();
    for (const item of items) {
      const strings = itemStrings(item).join("\n");
      const found = findPii(strings, fields)[0];
      if (found) {
        throw new ValidationError(
          `Your ${found.label} is in the body — keep contact data in Personal info`,
        );
      }
      if (fullName && strings.toLowerCase().includes(fullName.toLowerCase())) {
        throw new ValidationError(FULL_NAME_MESSAGE);
      }
    }
  }

  private async fullName(): Promise<string> {
    try {
      return (await this.profile.get()).fullName.trim();
    } catch (error) {
      if (error instanceof NotFoundError) return "";
      throw error;
    }
  }
}

function notFound(): never {
  throw new NotFoundError(NOT_FOUND);
}
