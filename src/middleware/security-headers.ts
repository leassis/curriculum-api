import { createMiddleware } from "hono/factory";

export const ADMIN_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";

/** Base headers on every response; a strict CSP on `<basePath>/admin/*`. */
export function securityHeaders(basePath = "") {
  const adminPrefix = `${basePath}/admin`;
  return createMiddleware(async (c, next) => {
    await next();
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "same-origin");
    c.header("X-Content-Type-Options", "nosniff");
    const path = c.req.path;
    if (path === adminPrefix || path.startsWith(`${adminPrefix}/`)) {
      c.header("Content-Security-Policy", ADMIN_CSP);
    }
  });
}
