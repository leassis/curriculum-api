import { describe, expect, it } from "vitest";
import { createTestApp } from "../../support/test-app";

describe("admin favicon", () => {
  it("links the configured faviconUrl from admin pages", async () => {
    const { app } = createTestApp({ config: { faviconUrl: "/favicon.svg" } });
    const html = await (await app.request("/admin/login")).text();
    expect(html).toContain('<link rel="icon" href="/favicon.svg"/>');
  });

  it("adds no icon link when faviconUrl is unset", async () => {
    const { app } = createTestApp();
    const html = await (await app.request("/admin/login")).text();
    expect(html).not.toContain('rel="icon"');
  });
});
