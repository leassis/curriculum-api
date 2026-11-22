import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../src/app";
import type { Services } from "../../../src/container";
import { validConfig } from "../../support/config";
import { createTestApp } from "../../support/test-app";

afterEach(() => vi.unstubAllGlobals());

describe("app", () => {
  it("serves health with an unreachable database", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const app = createApp(
      validConfig({ databaseUrl: "postgres://u:p@unreachable.invalid:5432/db" }),
    );
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("health answers ok without a query", async () => {
    const explode = new Proxy(
      {},
      {
        get() {
          throw new Error("a service was touched");
        },
      },
    ) as unknown as Services["profile"];
    const { app } = createTestApp({
      services: { profile: explode, settings: explode as never, personalInfo: explode as never },
    });
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("serves routes under basePath", async () => {
    const { app } = createTestApp({ config: { basePath: "/x" } });
    const res = await app.request("/x/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect((await app.request("/api/health")).status).toBe(404);
    expect((await app.request("/x/api/openapi.json")).status).toBe(200);
  });

  it("database failure answers internal_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = createTestApp({
      config: { databaseUrl: "postgres://u:p@unreachable.invalid:5432/db" },
      extend: (api) => {
        api.get("/needs-db", async (c) => {
          const profile = await c.var.services.profile.get();
          return c.json({ name: profile.fullName });
        });
      },
    });
    const res = await app.request("/api/needs-db");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal_error" });
    expect((await app.request("/api/health")).status).toBe(200);
    errorLog.mockRestore();
  });
});
