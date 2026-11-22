import type {
  PersonalInfoInsert,
  PersonalInfoPatch,
  PersonalInfoRepo,
  PersonalInfoRow,
} from "../../../src/repositories/personal-info.repository";

export class FakePersonalInfoRepo implements PersonalInfoRepo {
  rows = new Map<string, PersonalInfoRow>();

  async list(): Promise<PersonalInfoRow[]> {
    return [...this.rows.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key),
    );
  }

  async find(key: string): Promise<PersonalInfoRow | null> {
    return this.rows.get(key) ?? null;
  }

  async insert(row: PersonalInfoInsert): Promise<PersonalInfoRow> {
    const stored: PersonalInfoRow = { sortOrder: 0, ...row, updatedAt: new Date() };
    this.rows.set(row.key, stored);
    return stored;
  }

  async update(key: string, patch: PersonalInfoPatch): Promise<PersonalInfoRow | null> {
    const current = this.rows.get(key);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: new Date() };
    this.rows.set(key, next);
    return next;
  }

  async delete(key: string): Promise<boolean> {
    return this.rows.delete(key);
  }
}
