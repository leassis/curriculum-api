import type { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { chatsRouter } from "../../../src/admin/chats";
import { dashboardRouter } from "../../../src/admin/dashboard/routes";
import { loginRouter } from "../../../src/admin/login/routes";
import { personalInfoRouter } from "../../../src/admin/personal-info";
import { printRouter } from "../../../src/admin/print";
import { profileRouter } from "../../../src/admin/profile/routes";
import { resumesRouter } from "../../../src/admin/resumes";
import { settingsRouter } from "../../../src/admin/settings/routes";
import { publicRouter } from "../../../src/routes/public";
import { recruiterRouter } from "../../../src/routes/recruiter";
import { signSession } from "../../../src/security/session";
import { createTestApp } from "../../support/test-app";

const adminRouters: [string, Hono<never>][] = [
  ["login", loginRouter],
  ["dashboard", dashboardRouter],
  ["profile", profileRouter],
  ["settings", settingsRouter],
  ["personal-info", personalInfoRouter],
  ["chats", chatsRouter],
  ["resumes", resumesRouter],
  ["print", printRouter],
] as never;

describe("app", () => {
  it("mounts every track router", async () => {
    // Each stub router is mounted: a route a track would add answers through the app.
    publicRouter.get("/__ping", (c) => c.text("public"));
    recruiterRouter.get("/__ping", (c) => c.text(`recruiter ${c.req.param("token")}`));
    for (const [name, router] of adminRouters) router.get(`/__${name}`, (c) => c.text(name));

    const { app, config } = createTestApp();
    const pub = await app.request("/api/public/__ping");
    expect([pub.status, await pub.text()]).toEqual([200, "public"]);
    const rec = await app.request("/api/r/tok123/__ping");
    expect([rec.status, await rec.text()]).toEqual([200, "recruiter tok123"]);

    const cookie = `curr_admin=${await signSession({ scope: "admin" }, config.sessionSecret, 60)}`;
    for (const [name] of adminRouters) {
      const res = await app.request(`/admin/__${name}`, { headers: { cookie } });
      expect([name, res.status, await res.text()]).toEqual([name, 200, name]);
    }
  });
});
