import { describe, expect, it, vi } from "vitest";
import { dashboardRouter } from "../../../src/admin/dashboard/routes";
import { Layout } from "../../../src/admin/layout";
import { profileRouter } from "../../../src/admin/profile/routes";
import htmx from "../../../src/admin/static/htmx.generated";
import { signSession } from "../../../src/security/session";
import { NotFoundError } from "../../../src/services/errors";
import { createTestApp } from "../../support/test-app";

const { app, config } = createTestApp({ config: { basePath: "" } });
const adminCookie = async () =>
  `curr_admin=${await signSession({ scope: "admin" }, config.sessionSecret, 60)}`;

const handled = vi.fn();
profileRouter.post("/__csrf", (c) => {
  handled();
  return c.text("ran");
});
dashboardRouter.get("/__domain-error", () => {
  throw new NotFoundError("Resume 42 is missing");
});
dashboardRouter.get("/__unknown-error", () => {
  throw new Error("stack secret: password=hunter2");
});

describe("admin shell", () => {
  it("serves htmx with immutable cache without a session", async () => {
    const res = await app.request("/admin/static/htmx.min.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/javascript/);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    const body = await res.text();
    expect(body).toBe(htmx);
    expect(body).toContain("htmx");
  });

  it("rejects cross origin posts with 403", async () => {
    const cookie = await adminCookie();
    const form = { "content-type": "application/x-www-form-urlencoded", cookie };

    const foreign = await app.request("/admin/__csrf", {
      method: "POST",
      headers: { ...form, origin: "https://evil.test" },
      body: "a=1",
    });
    expect(foreign.status).toBe(403);
    const json = await app.request("/admin/__csrf", {
      method: "POST",
      headers: { cookie, origin: "https://evil.test", "content-type": "application/json" },
      body: "{}",
    });
    expect(json.status).toBe(403);
    expect(handled).not.toHaveBeenCalled();

    const same = await app.request("/admin/__csrf", {
      method: "POST",
      headers: { ...form, origin: "http://localhost" },
      body: "a=1",
    });
    expect(same.status).toBe(200);
    expect(handled).toHaveBeenCalledTimes(1);
  });

  it("renders domain errors as html fragments", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cookie = await adminCookie();

    const res = await app.request("/admin/__domain-error", { headers: { cookie } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toContain("Resume 42 is missing");
    expect(html).not.toMatch(/\n\s+at /);
    expect(html).not.toContain("<html");

    const unknown = await app.request("/admin/__unknown-error", { headers: { cookie } });
    expect(unknown.status).toBe(500);
    const unknownHtml = await unknown.text();
    expect(unknownHtml).toContain("Something went wrong");
    expect(unknownHtml).not.toContain("hunter2");
  });

  it("layout renders navigation and logout", () => {
    const html = String(
      <Layout title="Dashboard" basePath="/x">
        <p>content</p>
      </Layout>,
    );
    for (const [label, path] of [
      ["Dashboard", "/x/admin"],
      ["Profile", "/x/admin/profile"],
      ["Settings", "/x/admin/settings"],
      ["Personal info", "/x/admin/personal-info"],
      ["Resumes", "/x/admin/resumes"],
      ["Chats", "/x/admin/chats"],
    ] as const) {
      expect(html).toContain(`<a href="${path}">${label}</a>`);
    }
    expect(html).toMatch(/<form method="post" action="\/x\/admin\/logout">/);
    expect(html).toContain("Logout");
    expect(html).toContain('src="/x/admin/static/htmx.min.js"');
    expect(html).toContain("<p>content</p>");
  });
});
