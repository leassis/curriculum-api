import { Hono } from "hono";
import type { Env } from "../../env.js";
import { ValidationError } from "../../services/errors.js";
import {
  LIMIT_NAMES,
  limitKey,
  MODEL_AREAS,
  modelKey,
  PAGE_SIZE_KEY,
  PAGE_SIZES,
  SETTINGS_KEYS,
} from "../../services/settings-keys.js";
import { type Row, SettingsPage } from "./view.js";

/** Mounted at `/admin`. */
export const settingsRouter = new Hono<Env>();

async function rowsFor(c: { var: Env["Variables"] }, submitted?: Record<string, string>) {
  const { config, services } = c.var;
  const stored = await services.settings.overrides();
  const pick = (key: string) => submitted?.[key] ?? stored[key] ?? "";
  const rows: Row[] = [
    ...MODEL_AREAS.map((area) => ({
      key: modelKey(area),
      override: pick(modelKey(area)),
      fallback: config.models[area] ?? "",
    })),
    ...LIMIT_NAMES.map((name) => ({
      key: limitKey(name),
      override: pick(limitKey(name)),
      fallback: String(config.limits[name]),
    })),
  ];
  return {
    rows,
    pageSizes: PAGE_SIZES,
    pageSize: { key: PAGE_SIZE_KEY, override: pick(PAGE_SIZE_KEY), fallback: "A4" },
  };
}

settingsRouter.get("/settings", async (c) =>
  c.html(SettingsPage({ basePath: c.var.config.basePath, ...(await rowsFor(c)) })),
);

settingsRouter.post("/settings", async (c) => {
  const basePath = c.var.config.basePath;
  const body = await c.req.parseBody();
  const submitted: Record<string, string> = {};
  for (const key of SETTINGS_KEYS) {
    const raw = body[key];
    if (typeof raw === "string") submitted[key] = raw.trim();
  }
  const reject = async (message: string) =>
    c.html(SettingsPage({ basePath, ...(await rowsFor(c, submitted)), error: message }), 400);

  for (const [key, value] of Object.entries(submitted)) {
    if (key.startsWith("limits.") && value !== "" && !/^[1-9]\d*$/.test(value)) {
      return reject(`${key} must be a positive integer`);
    }
    if (key === PAGE_SIZE_KEY && value !== "" && !PAGE_SIZES.some((p) => p === value)) {
      return reject(`${key} must be A4 or Letter`);
    }
  }
  try {
    for (const [key, value] of Object.entries(submitted)) {
      await c.var.services.settings.set(key, value);
    }
  } catch (error) {
    if (error instanceof ValidationError) return reject(error.message);
    throw error;
  }
  return c.html(SettingsPage({ basePath, ...(await rowsFor(c)), saved: true }));
});
