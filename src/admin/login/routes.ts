import { Hono } from "hono";
import type { Env } from "../../env.js";
import { clientIp } from "../../security/ip.js";
import {
  ADMIN_SESSION_SECONDS,
  clearAdminCookie,
  setAdminCookie,
  signSession,
} from "../../security/session.js";
import { LoginPage } from "./view.js";

/** Mounted at `/admin`. Login and logout. */
export const loginRouter = new Hono<Env>();

loginRouter.get("/login", (c) =>
  c.html(LoginPage({ basePath: c.var.config.basePath, faviconUrl: c.var.config.faviconUrl })),
);

loginRouter.post("/login", async (c) => {
  const config = c.var.config;
  const body = await c.req.parseBody();
  const password = typeof body.password === "string" ? body.password : undefined;
  const result = await c.var.services.adminAuth.login(password, clientIp(c.req.raw.headers));
  if (result === "ok") {
    const token = await signSession(
      { scope: "admin" },
      config.sessionSecret,
      ADMIN_SESSION_SECONDS,
    );
    setAdminCookie(c, token, config);
    return c.redirect(`${config.basePath}/admin`, 303);
  }
  if (result === "throttled") {
    return c.html(
      LoginPage({
        basePath: config.basePath,
        faviconUrl: config.faviconUrl,
        error: "Too many attempts. Try again later.",
      }),
      429,
    );
  }
  return c.html(
    LoginPage({
      basePath: config.basePath,
      faviconUrl: config.faviconUrl,
      error: "Invalid password",
    }),
    401,
  );
});

loginRouter.post("/logout", (c) => {
  const config = c.var.config;
  clearAdminCookie(c, config);
  return c.redirect(`${config.basePath}/admin/login`, 303);
});
