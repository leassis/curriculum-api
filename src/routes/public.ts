import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../env.js";

/** Mounted at `/api/public`. Filled by the public-chat track. */
export const publicRouter = new OpenAPIHono<Env>();
