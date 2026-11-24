import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Env } from "../../../src/env";
import { requireAdmin } from "../../../src/middleware/require-admin";
import { signSession } from "../../../src/security/session";
import { resolvedConfig } from "../../support/config";

const config = resolvedConfig({ basePath: "/x" });

function guardedApp() {
  const app = new Hono<Env>();
  app.use("*", async (c, next) => {
    c.set("config", config);
    await next();
  });
  app.use("/x/admin/*", requireAdmin);
  app.get("/x/admin/profile", (c) => c.json({ admin: c.var.admin }));
  app.get("/x/admin/login", (c) => c.text("login page"));
  app.get("/x/admin/static/app.js", (c) => c.text("asset"));
  return app;
}

describe("admin shell", () => {
  it("redirects page requests without a session to login", async () => {
    const app = guardedApp();
    const res = await app.request("/x/admin/profile");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/x/admin/login");

    const wrongScope = await signSession({ scope: "public" }, config.sessionSecret, 60);
    const res2 = await app.request("/x/admin/profile", {
      headers: { cookie: `curr_admin=${wrongScope}` },
    });
    expect(res2.status).toBe(303);

    expect((await app.request("/x/admin/login")).status).toBe(200);
    expect((await app.request("/x/admin/static/app.js")).status).toBe(200);

    const admin = await signSession({ scope: "admin" }, config.sessionSecret, 60);
    const ok = await app.request("/x/admin/profile", {
      headers: { cookie: `curr_admin=${admin}` },
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ admin: { scope: "admin" } });
  });

  it("answers htmx requests without a session with HX-Redirect", async () => {
    const res = await guardedApp().request("/x/admin/profile", {
      headers: { "HX-Request": "true" },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("hx-redirect")).toBe("/x/admin/login");
    expect(res.headers.get("location")).toBeNull();
  });
});
