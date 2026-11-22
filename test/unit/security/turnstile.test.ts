import { describe, expect, it } from "vitest";
import { verifyTurnstile } from "../../../src/security/turnstile";

const reply = (body: unknown, status = 200): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

describe("turnstile", () => {
  it("accepts success and fails closed otherwise", async () => {
    expect(await verifyTurnstile("tok", "1.2.3.4", "sec", reply({ success: true }))).toBe(true);
    expect(await verifyTurnstile("tok", null, "sec", reply({ success: false }))).toBe(false);
    expect(await verifyTurnstile("tok", null, "sec", reply({ success: true }, 500))).toBe(false);
    const failing = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    expect(await verifyTurnstile("tok", null, "sec", failing)).toBe(false);
  });

  it("posts the secret, token and ip to siteverify", async () => {
    let seen: { url: string; body: string } | undefined;
    const spy = (async (url: string, init: RequestInit) => {
      seen = { url, body: String(init.body) };
      return new Response(JSON.stringify({ success: true }));
    }) as unknown as typeof fetch;
    await verifyTurnstile("tok", "1.2.3.4", "sec", spy);
    expect(seen?.url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const params = new URLSearchParams(seen?.body);
    expect(params.get("secret")).toBe("sec");
    expect(params.get("response")).toBe("tok");
    expect(params.get("remoteip")).toBe("1.2.3.4");
  });
});
