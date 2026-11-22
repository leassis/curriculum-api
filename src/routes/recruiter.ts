import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../env.js";

/** Mounted at `/api/r/:token`. Filled by the recruiter-chat track. */
export const recruiterRouter = new OpenAPIHono<Env>();
