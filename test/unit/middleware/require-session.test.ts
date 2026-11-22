import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Env } from "../../../src/env";
import { requireSession } from "../../../src/middleware/require-session";
import { signSession } from "../../../src/security/session";
import { DomainError } from "../../../src/services/errors";
import { resolvedConfig } from "../../support/config";

const config = resolvedConfig();

function appFor(scope: "public" | "recruiter") {
  const app = new Hono<Env>();
  app.onError((error, c) =>
    error instanceof DomainError
      ? c.json({ error: error.code }, error.status as 401)
      : c.json({ error: "internal_error" }, 500),
  );
  app.use("*", async (c, next) => {
    c.set("config", config);
    await next();
  });
  app.get("/probe", requireSession(scope), (c) => c.json({ session: c.var.session }));
  return app;
}

const withCookie = (token: string) => ({ headers: { cookie: `curr_session=${token}` } });

describe("requireSession", () => {
  it("rejects missing, invalid and wrong scope sessions", async () => {
    const app = appFor("public");

    const missing = await app.request("/probe");
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ error: "unauthorized" });

    expect((await app.request("/probe", withCookie("garbage"))).status).toBe(401);

    const recruiter = await signSession(
      { scope: "recruiter", cid: "c1" },
      config.sessionSecret,
      60,
    );
    expect((await app.request("/probe", withCookie(recruiter))).status).toBe(401);

    const ok = await signSession({ scope: "public" }, config.sessionSecret, 60);
    const res = await app.request("/probe", withCookie(ok));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ session: { scope: "public" } });

    const recruiterApp = appFor("recruiter");
    const res2 = await recruiterApp.request("/probe", withCookie(recruiter));
    expect(await res2.json()).toEqual({ session: { scope: "recruiter", cid: "c1" } });
  });
});
