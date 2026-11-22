import type { SettingsRepo } from "../../../src/repositories/settings.repository";

export class FakeSettingsRepo implements SettingsRepo {
  constructor(public rows: Record<string, string> = {}) {}

  async get(key: string): Promise<string | null> {
    return this.rows[key] ?? null;
  }

  async all(): Promise<Record<string, string>> {
    return { ...this.rows };
  }

  async set(key: string, value: string): Promise<void> {
    this.rows[key] = value;
  }

  async delete(key: string): Promise<void> {
    delete this.rows[key];
  }
}
