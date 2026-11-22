import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { clientIp, hashIp } from "../../../src/security/ip";

describe("ip", () => {
  it("reads forwarded then real ip", () => {
    const both = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });
    expect(clientIp(both)).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBeNull();
  });

  it("hashes salt plus ip as sha256 hex", async () => {
    const expected = createHash("sha256").update("pepper203.0.113.7").digest("hex");
    expect(await hashIp("203.0.113.7", "pepper")).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp("203.0.113.8", "pepper")).not.toBe(expected);
  });
});
