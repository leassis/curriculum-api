import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Env } from "../env.js";
import { SESSION_COOKIE, verifySession } from "../security/session.js";
import { UnauthorizedError } from "../services/errors.js";

/** Requires a valid `curr_session` cookie of the given scope; sets `c.var.session`. */
export function requireSession(scope: "public" | "recruiter") {
  return createMiddleware<Env>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) throw new UnauthorizedError();
    const session = await verifySession(token, c.var.config.sessionSecret);
    if (!session || session.scope !== scope) throw new UnauthorizedError();
    c.set("session", session);
    await next();
  });
}
