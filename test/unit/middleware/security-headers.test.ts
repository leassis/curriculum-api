import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { securityHeaders } from "../../../src/middleware/security-headers";

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";

function app(basePath = "") {
  const a = new Hono();
  a.use("*", securityHeaders(basePath));
  a.get("*", (c) => c.text("ok"));
  a.onError((_e, c) => c.text("boom", 500));
  return a;
}

describe("security headers", () => {
  it("sets base headers and admin csp", async () => {
    const a = app();
    for (const path of ["/api/health", "/admin/login", "/anything"]) {
      const res = await a.request(path);
      expect(res.headers.get("x-frame-options")).toBe("DENY");
      expect(res.headers.get("referrer-policy")).toBe("same-origin");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    }
    expect((await a.request("/admin/login")).headers.get("content-security-policy")).toBe(CSP);
    expect((await a.request("/admin")).headers.get("content-security-policy")).toBe(CSP);
    expect((await a.request("/api/health")).headers.get("content-security-policy")).toBeNull();
    expect((await a.request("/administrator")).headers.get("content-security-policy")).toBeNull();

    const based = app("/x");
    expect((await based.request("/x/admin/profile")).headers.get("content-security-policy")).toBe(
      CSP,
    );
    expect(
      (await based.request("/x/api/health")).headers.get("content-security-policy"),
    ).toBeNull();
  });
});
