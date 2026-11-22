import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { AdminLoginAttemptRepository } from "../../../src/repositories/admin-login-attempt.repository";
import { AdminAuthService } from "../../../src/security/admin-auth";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createTestApp } from "../../support/test-app";

const db = testDb();
const adminPasswordHash = bcrypt.hashSync("pw", 4);

describe("admin login throttle", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("refuses the sixth attempt with the right password", async () => {
    const config = resolvedConfig({ adminPasswordHash });
    const adminAuth = new AdminAuthService(new AdminLoginAttemptRepository(db), config, {
      sleep: async () => {},
    });
    const { app } = createTestApp({ config: { adminPasswordHash }, services: { adminAuth } });
    const post = (password: string) =>
      app.request("/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-forwarded-for": "7.7.7.7",
        },
        body: new URLSearchParams({ password }).toString(),
      });
    for (let i = 0; i < 5; i++) expect((await post("x")).status).toBe(401);
    expect((await post("pw")).status).toBe(429);
  });
});
