import { Hono } from "hono";
import type { ResolvedConfig } from "../config.js";
import type { Services } from "../container.js";
import type { Env } from "../env.js";

/** Placeholder: the admin shell fills this in. Loaded lazily by `src/app.ts`. */
export function adminRouter(config: ResolvedConfig, _services: Services): Hono<Env> {
  return new Hono<Env>().basePath(`${config.basePath}/admin`);
}
