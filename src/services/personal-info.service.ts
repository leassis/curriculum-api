import type {
  PersonalInfoPatch,
  PersonalInfoRepo,
  PersonalInfoRow,
} from "../repositories/personal-info.repository.js";
import { decrypt, encrypt } from "../security/crypto.js";
import { NotFoundError, ValidationError } from "./errors.js";

export const VISIBILITIES = ["public", "recruiter", "print"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export type Channel = "public" | "recruiter" | "print";

const KEY_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;

export interface PersonalInfoInput {
  key: string;
  label: string;
  value: string;
  visibility: string;
  sortOrder?: number;
}

export interface PersonalInfoUpdate {
  label?: string;
  value?: string;
  visibility?: string;
  sortOrder?: number;
}

/** Metadata only: the value never leaves the service except through reveal, contactFor and allValues. */
export interface PersonalInfoMeta {
  key: string;
  label: string;
  sortOrder: number;
  visibility: string;
  updatedAt: Date;
}

export interface ContactItem {
  key: string;
  label: string;
  value: string;
}

const CHANNEL_VISIBILITIES: Record<Channel, readonly string[]> = {
  public: ["public"],
  recruiter: ["public", "recruiter"],
  print: ["public", "recruiter", "print"],
};

function invalid(field: string, reason: string): never {
  throw new ValidationError(`Invalid ${field}: ${reason}`, { [field]: reason });
}

function requireText(field: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") invalid(field, "must not be empty");
  return value as string;
}

function requireVisibility(value: unknown): string {
  if (typeof value !== "string" || !VISIBILITIES.some((v) => v === value)) {
    invalid("visibility", "must be public, recruiter or print");
  }
  return value as string;
}

const meta = (row: PersonalInfoRow): PersonalInfoMeta => ({
  key: row.key,
  label: row.label,
  sortOrder: row.sortOrder,
  visibility: row.visibility,
  updatedAt: row.updatedAt,
});

export class PersonalInfoService {
  constructor(
    private readonly repo: PersonalInfoRepo,
    private readonly keyB64: string,
  ) {}

  async list(): Promise<PersonalInfoMeta[]> {
    return (await this.repo.list()).map(meta);
  }

  async create(input: PersonalInfoInput): Promise<PersonalInfoMeta> {
    if (!KEY_PATTERN.test(input.key ?? "")) invalid("key", "must match ^[A-Z][A-Z0-9_]{0,31}$");
    if (await this.repo.find(input.key)) invalid("key", "already exists");
    const label = requireText("label", input.label);
    const value = requireText("value", input.value);
    const visibility = requireVisibility(input.visibility);
    const row = await this.repo.insert({
      key: input.key,
      label,
      visibility,
      sortOrder: input.sortOrder ?? 0,
      valueEncrypted: await encrypt(value, this.keyB64),
    });
    return meta(row);
  }

  async update(key: string, input: PersonalInfoUpdate): Promise<PersonalInfoMeta> {
    const patch: PersonalInfoPatch = {};
    if (input.label !== undefined) patch.label = requireText("label", input.label);
    if (input.visibility !== undefined) patch.visibility = requireVisibility(input.visibility);
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.value !== undefined) {
      patch.valueEncrypted = await encrypt(requireText("value", input.value), this.keyB64);
    }
    const row = await this.repo.update(key, patch);
    if (!row) throw new NotFoundError(`Personal info ${key} not found`);
    return meta(row);
  }

  async delete(key: string): Promise<void> {
    if (!(await this.repo.delete(key))) throw new NotFoundError(`Personal info ${key} not found`);
  }

  async reveal(key: string): Promise<string> {
    const row = await this.repo.find(key);
    if (!row) throw new NotFoundError(`Personal info ${key} not found`);
    return decrypt(row.valueEncrypted, this.keyB64);
  }

  async contactFor(channel: Channel): Promise<ContactItem[]> {
    const visible = CHANNEL_VISIBILITIES[channel];
    const rows = (await this.repo.list()).filter((r) => visible.includes(r.visibility));
    return Promise.all(
      rows.map(async (r) => ({
        key: r.key,
        label: r.label,
        value: await decrypt(r.valueEncrypted, this.keyB64),
      })),
    );
  }

  /** Every decrypted value, for the PII Guard only. */
  allValues(): Promise<ContactItem[]> {
    return this.contactFor("print");
  }
}
