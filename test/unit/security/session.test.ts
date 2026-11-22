import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../../src/config";
import {
  setAdminCookie,
  setSessionCookie,
  signSession,
  verifySession,
} from "../../../src/security/session";
import { validConfig } from "../../support/config";

const SECRET = "a".repeat(40);

describe("session", () => {
  it("round trips scope and cid", async () => {
    const token = await signSession({ scope: "recruiter", cid: "chat-1" }, SECRET, 60);
    expect(await verifySession(token, SECRET)).toEqual({ scope: "recruiter", cid: "chat-1" });
    const pub = await signSession({ scope: "public" }, SECRET, 60);
    expect(await verifySession(pub, SECRET)).toEqual({ scope: "public" });
  });

  it("rejects expired, foreign and altered tokens", async () => {
    const expired = await signSession({ scope: "public" }, SECRET, -10);
    expect(await verifySession(expired, SECRET)).toBeNull();

    const good = await signSession({ scope: "public" }, SECRET, 60);
    expect(await verifySession(good, "b".repeat(40))).toBeNull();

    const [header, body, signature] = good.split(".") as [string, string, string];
    const flipped = signature.startsWith("A") ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;
    expect(await verifySession(`${header}.${body}.${flipped}`, SECRET)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ scope: "admin" })).toString("base64url");
    expect(await verifySession(`${header}.${forged}.${signature}`, SECRET)).toBeNull();
    expect(await verifySession("garbage", SECRET)).toBeNull();
  });
});

async function setCookieHeader(handler: (c: import("hono").Context) => void): Promise<string> {
  const app = new Hono();
  app.get("/", (c) => {
    handler(c);
    return c.text("ok");
  });
  const res = await app.request("/");
  return res.headers.get("set-cookie") ?? "";
}

describe("cookies", () => {
  it("session cookie attributes", async () => {
    const secure = resolveConfig(validConfig({ secureCookies: true, basePath: "/x" }));
    const header = await setCookieHeader((c) => setSessionCookie(c, "tok", secure));
    expect(header).toContain("curr_session=tok");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Strict");
    expect(header).toContain("Path=/x/api");
    expect(header).toContain("Max-Age=7200");
    expect(header).toContain("Secure");

    const plain = resolveConfig(validConfig({ secureCookies: false }));
    const insecure = await setCookieHeader((c) => setSessionCookie(c, "tok", plain));
    expect(insecure).toContain("Path=/api");
    expect(insecure).not.toContain("Secure");
  });

  it("admin cookie attributes", async () => {
    const secure = resolveConfig(validConfig({ secureCookies: true, basePath: "/x" }));
    const header = await setCookieHeader((c) => setAdminCookie(c, "tok", secure));
    expect(header).toContain("curr_admin=tok");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Strict");
    expect(header).toContain("Path=/x/admin");
    expect(header).toContain("Max-Age=28800");
    expect(header).toContain("Secure");

    const plain = resolveConfig(validConfig({ secureCookies: false }));
    const insecure = await setCookieHeader((c) => setAdminCookie(c, "tok", plain));
    expect(insecure).not.toContain("Secure");
  });
});
