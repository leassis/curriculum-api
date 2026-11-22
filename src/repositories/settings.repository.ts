import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { settings } from "../db/schema.js";

export interface SettingsRepo {
  get(key: string): Promise<string | null>;
  all(): Promise<Record<string, string>>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class SettingsRepository implements SettingsRepo {
  constructor(private readonly db: Db) {}

  async get(key: string): Promise<string | null> {
    const [row] = await this.db.select().from(settings).where(eq(settings.key, key));
    return row?.value ?? null;
  }

  async all(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(settings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async set(key: string, value: string): Promise<void> {
    await this.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(settings).where(eq(settings.key, key));
  }
}
