import { beforeEach, describe, expect, it } from "vitest";
import { AdminLoginAttemptRepository } from "../../../src/repositories/admin-login-attempt.repository";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new AdminLoginAttemptRepository(db);
const window1 = new Date("2026-01-01T10:00:00Z");
const window2 = new Date("2026-01-01T10:15:00Z");

describe("admin login attempt repository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("counts parallel failures atomically", async () => {
    await Promise.all(Array.from({ length: 10 }, () => repo.recordFailure("ip-a", window1)));
    expect(await repo.failures("ip-a", window1)).toBe(10);
  });

  it("isolates ip hashes and windows", async () => {
    expect(await repo.failures("ip-a", window1)).toBe(0);
    expect(await repo.recordFailure("ip-a", window1)).toBe(1);
    expect(await repo.recordFailure("ip-a", window1)).toBe(2);
    await repo.recordFailure("ip-b", window1);
    await repo.recordFailure("ip-a", window2);
    expect(await repo.failures("ip-a", window1)).toBe(2);
    expect(await repo.failures("ip-b", window1)).toBe(1);
    expect(await repo.failures("ip-a", window2)).toBe(1);
  });
});
