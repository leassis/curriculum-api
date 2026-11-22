import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { AdminAuthService } from "../../../src/security/admin-auth";
import { signSession, verifySession } from "../../../src/security/session";
import { FakeAdminLoginAttemptRepo } from "../../support/admin-login-attempt.fake";
import { resolvedConfig } from "../../support/config";
import { createTestApp } from "../../support/test-app";

const adminPasswordHash = bcrypt.hashSync("pw", 4);

function setup(basePath = "") {
  const repo = new FakeAdminLoginAttemptRepo();
  const adminAuth = new AdminAuthService(repo, resolvedConfig({ basePath, adminPasswordHash }), {
    sleep: async () => {},
  });
  const fast = createTestApp({ config: { basePath, adminPasswordHash }, services: { adminAuth } });
  const post = (password?: string, path = "/admin/login", headers: Record<string, string> = {}) =>
    fast.app.request(`${basePath}${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
      body: password === undefined ? "" : new URLSearchParams({ password }).toString(),
    });
  return { ...fast, repo, post };
}

describe("admin login", () => {
  it("renders a password form", async () => {
    const { app } = setup();
    const res = await app.request("/admin/login");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.match(/type="password"/g)).toHaveLength(1);
    expect(html).toContain('name="password"');
    expect(html).toContain("Sign in</button>");
  });

  it("sets curr_admin and redirects on the right password", async () => {
    const { post, config } = setup("/x");
    const res = await post("pw");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/x/admin");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("curr_admin=");
    expect(cookie).toContain("Max-Age=28800");
    const token = /curr_admin=([^;]+)/.exec(cookie)?.[1] ?? "";
    expect((await verifySession(token, config.sessionSecret))?.scope).toBe("admin");
  });

  it("answers 401 Invalid password on a wrong password", async () => {
    const { post, repo } = setup();
    const res = await post("nope");
    expect(res.status).toBe(401);
    expect(await res.text()).toContain("Invalid password");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(repo.total()).toBe(1);
  });

  it("treats a missing password field as a failed attempt", async () => {
    const { post, repo } = setup();
    const res = await post(undefined);
    expect(res.status).toBe(401);
    expect(repo.total()).toBe(1);
  });

  it("answers 429 when the ip is throttled", async () => {
    const { post, repo } = setup();
    const ip = { "x-forwarded-for": "9.9.9.9" };
    for (let i = 0; i < 5; i++) expect((await post("bad", "/admin/login", ip)).status).toBe(401);
    const res = await post("pw", "/admin/login", ip);
    expect(res.status).toBe(429);
    expect(await res.text()).toContain("Too many attempts. Try again later.");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(repo.total()).toBe(5);
    expect((await post("pw", "/admin/login", { "x-forwarded-for": "8.8.8.8" })).status).toBe(303);
  });

  it("clears the cookie and redirects on logout", async () => {
    const { app, config } = setup("/x");
    const token = await signSession({ scope: "admin" }, config.sessionSecret, 60);
    const res = await app.request("/x/admin/logout", {
      method: "POST",
      headers: { cookie: `curr_admin=${token}` },
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/x/admin/login");
    expect(res.headers.get("set-cookie")).toMatch(/curr_admin=;|Max-Age=0/);
  });
});
