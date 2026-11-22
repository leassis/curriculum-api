import { createMiddleware } from "hono/factory";
import type { Env } from "../env.js";

/** Lets a request through only for a known, unrevoked, unexpired chat: 404 or 410 otherwise. */
export const requireActiveRecruiterChat = createMiddleware<Env>(async (c, next) => {
  await c.var.services.recruiterChat.requireActive(c.req.param("token") ?? "");
  await next();
});
