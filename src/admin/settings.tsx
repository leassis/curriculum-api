import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import { ValidationError } from "../services/errors.js";
import {
  LIMIT_NAMES,
  limitKey,
  MODEL_AREAS,
  modelKey,
  PAGE_SIZE_KEY,
  PAGE_SIZES,
  SETTINGS_KEYS,
} from "../services/settings-keys.js";
import { ErrorFragment } from "./error-fragment.js";
import { Layout } from "./layout.js";

interface Row {
  key: string;
  override: string;
  fallback: string;
}

const SettingsPage: FC<{
  basePath: string;
  rows: Row[];
  pageSize: Row;
  error?: string;
  saved?: boolean;
}> = ({ basePath, rows, pageSize, error, saved }) => (
  <Layout title="Settings" basePath={basePath}>
    <h1>Settings</h1>
    {error ? <ErrorFragment message={error} /> : null}
    {saved ? <p role="status">Saved</p> : null}
    <form method="post" action={`${basePath}/admin/settings`}>
      {rows.map((r) => (
        <p>
          <label for={r.key}>{r.key}</label>
          <br />
          <input
            id={r.key}
            type="text"
            name={r.key}
            value={r.override}
            placeholder={r.fallback}
            size={50}
          />
        </p>
      ))}
      <p>
        <label for={pageSize.key}>{pageSize.key}</label>
        <br />
        <select id={pageSize.key} name={pageSize.key}>
          <option value="" selected={pageSize.override === ""}>
            Default ({pageSize.fallback})
          </option>
          {PAGE_SIZES.map((size) => (
            <option value={size} selected={pageSize.override === size}>
              {size}
            </option>
          ))}
        </select>
      </p>
      <p>Leave a field empty to remove its override and use the deployment configuration.</p>
      <button type="submit">Save</button>
    </form>
  </Layout>
);

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
  return { rows, pageSize: { key: PAGE_SIZE_KEY, override: pick(PAGE_SIZE_KEY), fallback: "A4" } };
}

settingsRouter.get("/settings", async (c) =>
  c.html(<SettingsPage basePath={c.var.config.basePath} {...(await rowsFor(c))} />),
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
    c.html(
      <SettingsPage basePath={basePath} {...(await rowsFor(c, submitted))} error={message} />,
      400,
    );

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
  return c.html(<SettingsPage basePath={basePath} {...(await rowsFor(c))} saved />);
});
