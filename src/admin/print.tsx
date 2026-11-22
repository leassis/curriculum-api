import { Hono } from "hono";
import type { Env } from "../env.js";

/** Mounted at `/admin`. Filled by the tailored-resumes track. */
export const printRouter = new Hono<Env>();
