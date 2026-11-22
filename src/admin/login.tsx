import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import { clientIp } from "../security/ip.js";
import {
  ADMIN_SESSION_SECONDS,
  clearAdminCookie,
  setAdminCookie,
  signSession,
} from "../security/session.js";
import { ErrorFragment } from "./error-fragment.js";
import { Layout } from "./layout.js";

const LoginPage: FC<{ basePath: string; error?: string }> = ({ basePath, error }) => (
  <Layout title="Sign in" basePath={basePath}>
    <h1>Sign in</h1>
    {error ? <ErrorFragment message={error} /> : null}
    <form method="post" action={`${basePath}/admin/login`}>
      <label>
        Password <input type="password" name="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Sign in</button>
    </form>
  </Layout>
);

/** Mounted at `/admin`. Login and logout. */
export const loginRouter = new Hono<Env>();

loginRouter.get("/login", (c) => c.html(<LoginPage basePath={c.var.config.basePath} />));

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
      <LoginPage basePath={config.basePath} error="Too many attempts. Try again later." />,
      429,
    );
  }
  return c.html(<LoginPage basePath={config.basePath} error="Invalid password" />, 401);
});

loginRouter.post("/logout", (c) => {
  const config = c.var.config;
  clearAdminCookie(c, config);
  return c.redirect(`${config.basePath}/admin/login`, 303);
});
