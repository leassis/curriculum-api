import { beforeEach, describe, expect, it } from "vitest";
import { PersonalInfoRepository } from "../../../src/repositories/personal-info.repository";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new PersonalInfoRepository(db);

const row = (key: string, sortOrder: number) => ({
  key,
  label: key.toUpperCase(),
  sortOrder,
  valueEncrypted: `enc-${key}`,
  visibility: "public",
});

describe("PersonalInfoRepository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("covers insert, find, update, delete and list order", async () => {
    await repo.insert(row("phone", 2));
    await repo.insert(row("email", 1));
    await repo.insert(row("city", 1));

    expect((await repo.list()).map((r) => r.key)).toEqual(["city", "email", "phone"]);

    expect(await repo.find("email")).toMatchObject({ label: "EMAIL", valueEncrypted: "enc-email" });
    expect(await repo.find("missing")).toBeNull();

    const before = await repo.find("phone");
    const updated = await repo.update("phone", { label: "Mobile", visibility: "recruiter" });
    expect(updated).toMatchObject({ key: "phone", label: "Mobile", visibility: "recruiter" });
    expect(updated?.valueEncrypted).toBe("enc-phone");
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(before?.updatedAt.getTime() ?? 0);
    expect(await repo.update("missing", { label: "x" })).toBeNull();

    expect(await repo.delete("phone")).toBe(true);
    expect(await repo.delete("phone")).toBe(false);
    expect((await repo.list()).map((r) => r.key)).toEqual(["city", "email"]);
  });
});
