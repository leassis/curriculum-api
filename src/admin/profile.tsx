import { Hono } from "hono";
import type { Env } from "../env.js";

/** Mounted at `/admin`. Filled by the admin-core track. */
export const profileRouter = new Hono<Env>();
