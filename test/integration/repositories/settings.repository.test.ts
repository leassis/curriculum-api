import { beforeEach, describe, expect, it } from "vitest";
import { SettingsRepository } from "../../../src/repositories/settings.repository";
import { resetDb, testDb } from "../../support/db";

const db = testDb();
const repo = new SettingsRepository(db);

describe("SettingsRepository", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("round trips get, all, set and delete", async () => {
    expect(await repo.get("model.public")).toBeNull();
    expect(await repo.all()).toEqual({});

    await repo.set("model.public", "a/b");
    await repo.set("limits.maxQuestionChars", "500");
    expect(await repo.get("model.public")).toBe("a/b");
    expect(await repo.all()).toEqual({ "model.public": "a/b", "limits.maxQuestionChars": "500" });

    await repo.set("model.public", "c/d");
    expect(await repo.get("model.public")).toBe("c/d");

    await repo.delete("model.public");
    expect(await repo.get("model.public")).toBeNull();
    expect(await repo.all()).toEqual({ "limits.maxQuestionChars": "500" });
  });
});
