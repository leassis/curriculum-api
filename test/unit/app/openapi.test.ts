import { describe, expect, it } from "vitest";
import { createTestApp } from "../../support/test-app";

describe("openapi", () => {
  it("lists api routes and no admin route", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
      servers: { url: string }[];
    };
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths)).toContain("/health");
    expect(Object.keys(doc.paths).some((p) => p.includes("admin"))).toBe(false);
    expect(doc.servers[0]?.url).toBe("/api");
  });
});
