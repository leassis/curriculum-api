import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySession } from "../../../src/security/session";
import { publicChatSetup } from "../../support/public-chat";
import { createTestApp } from "../../support/test-app";

const post = (path: string, body: unknown, headers: Record<string, string> = {}) => ({
  path,
  init: {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  },
});

async function appWith(verify: boolean) {
  const fetchMock = vi.fn(async () => Response.json({ success: verify }));
  vi.stubGlobal("fetch", fetchMock);
  const setup = await publicChatSetup();
  const { app, config } = createTestApp({
    services: {
      config: setup.config,
      profile: setup.profile,
      settings: setup.settings,
      personalInfo: setup.personalInfo,
      llm: setup.llm,
      publicChat: setup.publicChat,
    },
  });
  return { app, config, setup, fetchMock };
}

afterEach(() => vi.unstubAllGlobals());

describe("public session", () => {
  it("sets a public curr_session cookie when turnstile verifies the token", async () => {
    const { app, config } = await appWith(true);
    const r = post("/api/public/session", { turnstileToken: "tok" });
    const res = await app.request(r.path, r.init);
    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("curr_session=");
    expect(cookie).toContain(`Max-Age=${config.limits.sessionTtlMinutes * 60}`);
    const token = /curr_session=([^;]+)/.exec(cookie)?.[1] ?? "";
    expect(await verifySession(token, config.sessionSecret)).toEqual({ scope: "public" });
  });

  it("answers 403 captcha_failed and sets no cookie when turnstile rejects", async () => {
    const { app } = await appWith(false);
    const r = post("/api/public/session", { turnstileToken: "tok" });
    const res = await app.request(r.path, r.init);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("captcha_failed");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("answers 400 validation_error without a turnstileToken string", async () => {
    const { app, fetchMock } = await appWith(true);
    for (const body of [{}, { turnstileToken: 5 }, "not json"]) {
      const r = post("/api/public/session", body);
      const res = await app.request(r.path, r.init);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("validation_error");
      expect(res.headers.get("set-cookie")).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the client ip as remoteip to turnstile", async () => {
    const { app, fetchMock } = await appWith(true);
    const r = post(
      "/api/public/session",
      { turnstileToken: "tok" },
      { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    );
    await app.request(r.path, r.init);
    const calls = fetchMock.mock.calls as unknown as [string, { body: URLSearchParams }][];
    expect(calls[0]?.[1].body.get("remoteip")).toBe("203.0.113.9");
    expect(calls[0]?.[1].body.get("response")).toBe("tok");
  });
});

describe("public profile", () => {
  it("lists only public contact fields with no-store", async () => {
    const { app, setup } = await appWith(true);
    const info = setup.personalInfo;
    await info.create({ key: "GITHUB", label: "GitHub", value: "gh/ada", visibility: "public" });
    await info.create({ key: "EMAIL", label: "Email", value: "ada@x.io", visibility: "recruiter" });
    await info.create({ key: "ADDRESS", label: "Address", value: "1 Road", visibility: "print" });
    const res = await app.request("/api/public/profile");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      fullName: "Ada Lovelace",
      headline: "Engineer",
      contact: [{ key: "GITHUB", label: "GitHub", value: "gh/ada" }],
    });
  });
});
