import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Env } from "../env.js";
import { ADMIN_COOKIE, verifySession } from "../security/session.js";

/**
 * Guards `/admin/*`. Without a valid `curr_admin` session a page request is redirected (303) and
 * an HTMX request gets 401 with `HX-Redirect`. The login page and static files are exempt.
 */
export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const { basePath, sessionSecret } = c.var.config;
  const adminPrefix = `${basePath}/admin`;
  const path = c.req.path;
  if (path === `${adminPrefix}/login` || path.startsWith(`${adminPrefix}/static/`)) {
    return next();
  }

  const token = getCookie(c, ADMIN_COOKIE);
  const session = token ? await verifySession(token, sessionSecret) : null;
  if (session?.scope === "admin") {
    c.set("admin", session);
    return next();
  }

  const login = `${adminPrefix}/login`;
  if (c.req.header("HX-Request") === "true") {
    c.header("HX-Redirect", login);
    return c.body(null, 401);
  }
  return c.redirect(login, 303);
});
