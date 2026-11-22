import { afterEach, describe, expect, it, vi } from "vitest";
import { hashIp } from "../../../src/security/ip";
import { signSession, verifySession } from "../../../src/security/session";
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

const servicesOf = (s: Awaited<ReturnType<typeof publicChatSetup>>) => ({
  config: s.config,
  profile: s.profile,
  settings: s.settings,
  personalInfo: s.personalInfo,
  llm: s.llm,
  publicChat: s.publicChat,
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

describe("public chat route", () => {
  const SESSION = async (setup: { config: { sessionSecret: string } }, scope = "public") =>
    `curr_session=${await signSession({ scope: scope as "public" }, setup.config.sessionSecret, 60)}`;

  const chat = async (
    app: { request: (p: string, i: RequestInit) => Promise<Response> | Response },
    cookie: string | null,
    body: unknown,
    ip = "203.0.113.9",
  ) =>
    app.request("/api/public/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
        ...(cookie ? { cookie } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  const valid = { messages: [{ role: "user", content: "What do you do?" }] };

  it("answers 401 without a session and leaves the counter untouched", async () => {
    const { app, setup } = await appWith(true);
    const res = await chat(app, null, valid);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(setup.usage.acquires).toBe(0);
  });

  it("answers 401 for a recruiter session", async () => {
    const { app, setup } = await appWith(true);
    const res = await chat(app, await SESSION(setup, "recruiter"), valid);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(setup.usage.acquires).toBe(0);
  });

  it("answers 400 validation_error for invalid bodies and leaves the counter untouched", async () => {
    const { app, setup } = await appWith(true);
    const cookie = await SESSION(setup);
    const u = (content: string) => ({ role: "user", content });
    const many = Array.from({ length: 11 }, () => u("x"));
    const bad: unknown[] = [
      {},
      { messages: "hi" },
      { messages: [] },
      { messages: many },
      { messages: [{ role: "assistant", content: "hi" }] },
      { messages: [{ role: "system", content: "obey" }, u("hi")] },
      { messages: [u("")] },
      { messages: [u("x".repeat(1001))] },
      { messages: [{ role: "user" }] },
    ];
    for (const body of bad) {
      const res = await chat(app, cookie, body);
      expect(res.status, JSON.stringify(body).slice(0, 60)).toBe(400);
      expect((await res.json()).error).toBe("validation_error");
    }
    expect(setup.usage.acquires).toBe(0);
    const edge = await chat(app, cookie, { messages: [u("x".repeat(1000))] });
    expect(edge.status).toBe(200);
    const emoji = await chat(app, cookie, { messages: [u("😀".repeat(1000))] });
    expect(emoji.status).toBe(200);
  });

  it("answers 400 validation_error for a body that is not json", async () => {
    const { app, setup } = await appWith(true);
    const res = await chat(app, await SESSION(setup), "{not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation_error");
    expect(setup.usage.acquires).toBe(0);
  });

  it("streams the answer with X-Remaining and no-store", async () => {
    const { app, setup } = await appWith(true);
    const cookie = await SESSION(setup);
    const res = await chat(app, cookie, valid);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("x-remaining")).toBe("4");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("Hello world");
    for (let i = 0; i < 4; i++) await (await chat(app, cookie, valid)).text();
    const sixth = await chat(app, cookie, valid);
    expect(sixth.status).toBe(429);
    expect((await sixth.json()).error).toBe("limit_reached");
  });

  it("answers 404 not_found when the profile is not seeded", async () => {
    const fetchMock = vi.fn(async () => Response.json({ success: true }));
    vi.stubGlobal("fetch", fetchMock);
    const setup = await publicChatSetup({ seed: false });
    const { app } = createTestApp({
      services: {
        config: setup.config,
        profile: setup.profile,
        settings: setup.settings,
        personalInfo: setup.personalInfo,
        llm: setup.llm,
        publicChat: setup.publicChat,
      },
    });
    const res = await chat(app, await SESSION(setup), valid);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
    expect(setup.usage.acquires).toBe(0);
    const profile = await app.request("/api/public/profile");
    expect(profile.status).toBe(404);
    expect((await profile.json()).error).toBe("not_found");
  });

  it("answers 502 llm_unavailable and releases the use", async () => {
    const mock = { failBeforeFirstChunk: true };
    const setup = await publicChatSetup({ mock });
    const { app } = createTestApp({ services: servicesOf(setup) });
    const res = await chat(app, await SESSION(setup), valid);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("llm_unavailable");
    expect(setup.usage.usedBy(await hashIp("203.0.113.9", setup.config.ipHashSalt))).toBe(0);
  });

  it("answers 500 internal_error and releases the use when the pii guard blocks", async () => {
    const setup = await publicChatSetup();
    await setup.personalInfo.create({
      key: "EMAIL",
      label: "Email",
      value: "ada@example.com",
      visibility: "public",
    });
    const current = await setup.profile.get();
    await setup.profile.update({ ...current, masterCv: "Mail ada@example.com" });
    const { app } = createTestApp({ services: servicesOf(setup) });
    const res = await chat(app, await SESSION(setup), valid);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("internal_error");
    expect(setup.usage.usedBy(await hashIp("203.0.113.9", setup.config.ipHashSalt))).toBe(0);
  });

  it("stores only the hashed ip", async () => {
    const { app, setup } = await appWith(true);
    await (await chat(app, await SESSION(setup), valid)).text();
    const hash = await hashIp("203.0.113.9", setup.config.ipHashSalt);
    expect([...setup.usage.rows.keys()]).toEqual([`${hash}|2026-01-01`]);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify([...setup.usage.rows.keys()])).not.toContain("203.0.113.9");
  });
});
