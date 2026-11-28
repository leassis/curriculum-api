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
  TARGET_PAGES,
  TARGET_PAGES_KEY,
  temperatureKey,
} from "../../services/settings-keys.js";
import { type Row, SettingsForm, SettingsPage } from "./view.js";

const LIMIT_LABELS: Record<(typeof LIMIT_NAMES)[number], string> = {
  publicQuestionsPerIpPerDay: "Public questions per IP per day",
  recruiterQuestionsDefault: "Recruiter questions (default)",
  publicMaxOutputTokens: "Public max output tokens",
  recruiterMaxOutputTokens: "Recruiter max output tokens",
  maxQuestionChars: "Max question characters",
  maxHistoryMessages: "Max history messages",
  sessionTtlMinutes: "Session TTL (minutes)",
};

/** Mounted at `/admin`. */
export const settingsRouter = new Hono<Env>();

async function rowsFor(c: { var: Env["Variables"] }, submitted?: Record<string, string>) {
  const { config, services } = c.var;
  const stored = await services.settings.overrides();
  const pick = (key: string) => submitted?.[key] ?? stored[key] ?? "";
  const models = MODEL_AREAS.map((area) => ({
    area,
    title: `${area[0]?.toUpperCase()}${area.slice(1)}`,
    model: {
      key: modelKey(area),
      override: pick(modelKey(area)),
      fallback: config.models[area] ?? "",
    },
    temperature: {
      key: temperatureKey(area),
      override: pick(temperatureKey(area)),
      fallback: String(config.temperatures[area]),
    },
  }));
  const limits: Row[] = LIMIT_NAMES.map((name) => ({
    key: limitKey(name),
    label: LIMIT_LABELS[name],
    override: pick(limitKey(name)),
    fallback: String(config.limits[name]),
  }));
  return {
    models,
    limits,
    pageSizes: PAGE_SIZES,
    pageSize: { key: PAGE_SIZE_KEY, override: pick(PAGE_SIZE_KEY), fallback: "A4" },
    targetPagesOptions: TARGET_PAGES,
    targetPages: { key: TARGET_PAGES_KEY, override: pick(TARGET_PAGES_KEY), fallback: "2" },
  };
}

settingsRouter.get("/settings", async (c) =>
  c.html(
    SettingsPage({
      basePath: c.var.config.basePath,
      faviconUrl: c.var.config.faviconUrl,
      ...(await rowsFor(c)),
      saved: c.req.query("saved") === "1",
    }),
  ),
);

settingsRouter.post("/settings", async (c) => {
  const basePath = c.var.config.basePath;
  const body = await c.req.parseBody();
  const submitted: Record<string, string> = {};
  for (const key of SETTINGS_KEYS) {
    const raw = body[key];
    if (typeof raw === "string") submitted[key] = raw.trim();
  }
  const htmx = c.req.header("HX-Request") === "true";
  const reject = async (message: string) =>
    htmx
      ? c.html(SettingsForm({ basePath, ...(await rowsFor(c, submitted)), error: message }), 400)
      : c.html(
          SettingsPage({
            basePath,
            faviconUrl: c.var.config.faviconUrl,
            ...(await rowsFor(c, submitted)),
            error: message,
          }),
          400,
        );

  for (const [key, value] of Object.entries(submitted)) {
    if (key.startsWith("limits.") && value !== "" && !/^[1-9]\d*$/.test(value)) {
      return reject(`${key} must be a positive integer`);
    }
    if (
      key.startsWith("temperature.") &&
      value !== "" &&
      value !== "default" &&
      !(/^\d+(\.\d+)?$/.test(value) && Number(value) <= 2)
    ) {
      return reject(`${key} must be a number from 0 to 2 or "default"`);
    }
    if (key === PAGE_SIZE_KEY && value !== "" && !PAGE_SIZES.some((p) => p === value)) {
      return reject(`${key} must be A4 or Letter`);
    }
    if (
      key === TARGET_PAGES_KEY &&
      value !== "" &&
      !TARGET_PAGES.some((p) => String(p) === value)
    ) {
      return reject(`${key} must be 1, 2 or 3`);
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
  // htmx swaps just the form (with the "Saved" toast marker); a plain POST uses Post/Redirect/Get
  // so a refresh does not resubmit.
  if (htmx) return c.html(SettingsForm({ basePath, ...(await rowsFor(c)), saved: true }));
  return c.redirect(`${basePath}/admin/settings?saved=1`, 303);
});
