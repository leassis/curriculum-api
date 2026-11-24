import type { LimitName, ResolvedConfig } from "../config.js";
import type { SettingsRepo } from "../repositories/settings.repository.js";
import { ConfigError, ValidationError } from "./errors.js";
import {
  limitKey,
  type ModelArea,
  modelKey,
  PAGE_SIZE_KEY,
  PAGE_SIZES,
  type PageSize,
  SETTINGS_KEYS,
  TEMPERATURE_DEFAULT,
  temperatureKey,
} from "./settings-keys.js";

const TEMPERATURE_PATTERN = /^\d+(\.\d+)?$/;

function parseTemperature(value: string): number | undefined {
  if (!TEMPERATURE_PATTERN.test(value)) return undefined;
  const n = Number(value);
  return n >= 0 && n <= 2 ? n : undefined;
}

/** Reads overrides from the database on every call, so a change applies without a restart. */
export class SettingsService {
  constructor(
    private readonly repo: SettingsRepo,
    private readonly config: ResolvedConfig,
  ) {}

  async model(area: ModelArea): Promise<string> {
    const override = await this.repo.get(modelKey(area));
    if (override) return override;
    const fallback = this.config.models[area];
    if (fallback) return fallback;
    throw new ConfigError([modelKey(area)]);
  }

  async limit(name: LimitName): Promise<number> {
    const override = await this.repo.get(limitKey(name));
    if (override !== null) {
      const value = Number(override);
      if (Number.isInteger(value) && value > 0) return value;
    }
    return this.config.limits[name];
  }

  /**
   * Sampling temperature for an area. An override wins; the override "default" means send none
   * (undefined), for reasoning models that reject the parameter. An invalid override falls back.
   */
  async temperature(area: ModelArea): Promise<number | undefined> {
    const override = await this.repo.get(temperatureKey(area));
    if (override !== null) {
      if (override === TEMPERATURE_DEFAULT) return undefined;
      const value = parseTemperature(override);
      if (value !== undefined) return value;
    }
    return this.config.temperatures[area];
  }

  async pageSize(): Promise<PageSize> {
    const override = await this.repo.get(PAGE_SIZE_KEY);
    return PAGE_SIZES.find((p) => p === override) ?? "A4";
  }

  async set(key: string, value: string): Promise<void> {
    if (!SETTINGS_KEYS.includes(key)) {
      throw new ValidationError(`Unknown setting: ${key}`, { key: "unknown setting" });
    }
    if (value === "") {
      await this.repo.delete(key);
      return;
    }
    if (key.startsWith("limits.") && !/^[1-9]\d*$/.test(value)) {
      throw new ValidationError(`${key} must be a positive integer`, { [key]: "positive integer" });
    }
    if (
      key.startsWith("temperature.") &&
      value !== TEMPERATURE_DEFAULT &&
      parseTemperature(value) === undefined
    ) {
      throw new ValidationError(`${key} must be a number from 0 to 2 or "default"`, {
        [key]: "0 to 2 or default",
      });
    }
    if (key === PAGE_SIZE_KEY && !PAGE_SIZES.some((p) => p === value)) {
      throw new ValidationError(`${key} must be A4 or Letter`, { [key]: "A4 or Letter" });
    }
    await this.repo.set(key, value);
  }

  overrides(): Promise<Record<string, string>> {
    return this.repo.all();
  }
}
