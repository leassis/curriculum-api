import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { AdminAuthService } from "../../../src/security/admin-auth";
import { FakeAdminLoginAttemptRepo } from "../../support/admin-login-attempt.fake";
import { resolvedConfig } from "../../support/config";

const config = resolvedConfig({ adminPasswordHash: bcrypt.hashSync("pw", 4) });

function setup() {
  const repo = new FakeAdminLoginAttemptRepo();
  const sleeps: number[] = [];
  const clock = { now: Date.parse("2026-01-01T10:03:00Z") };
  const auth = new AdminAuthService(repo, config, {
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    now: () => clock.now,
  });
  return { repo, sleeps, clock, auth };
}

describe("admin auth service", () => {
  it("accepts the matching password", async () => {
    const { auth, repo, sleeps } = setup();
    expect(await auth.login("pw", "1.1.1.1")).toBe("ok");
    expect(repo.total()).toBe(0);
    expect(sleeps).toEqual([]);
  });

  it("waits 500 ms before recording a failure", async () => {
    const { auth, repo, sleeps } = setup();
    expect(await auth.login("wrong", "1.1.1.1")).toBe("invalid");
    expect(sleeps).toEqual([500]);
    expect(repo.total()).toBe(1);
    expect(await auth.login(undefined, "1.1.1.1")).toBe("invalid");
    expect(repo.total()).toBe(2);
  });

  it("refuses the sixth attempt even with the right password", async () => {
    const { auth, repo, sleeps } = setup();
    for (let i = 0; i < 5; i++) expect(await auth.login("x", "2.2.2.2")).toBe("invalid");
    sleeps.length = 0;
    expect(await auth.login("pw", "2.2.2.2")).toBe("throttled");
    expect(sleeps).toEqual([]);
    expect(repo.total()).toBe(5);
    expect(await auth.login("pw", "3.3.3.3")).toBe("ok");
  });

  it("starts a new window after 15 minutes", async () => {
    const { auth, clock } = setup();
    for (let i = 0; i < 5; i++) await auth.login("x", "2.2.2.2");
    expect(await auth.login("pw", "2.2.2.2")).toBe("throttled");
    clock.now = Date.parse("2026-01-01T10:15:00Z");
    expect(await auth.login("pw", "2.2.2.2")).toBe("ok");
  });
});
