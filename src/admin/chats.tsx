import { Hono } from "hono";
import type { Env } from "../env.js";

/** Mounted at `/admin`. Filled by the recruiter-chat track. */
export const chatsRouter = new Hono<Env>();
