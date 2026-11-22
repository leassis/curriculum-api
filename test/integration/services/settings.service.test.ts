import { beforeEach, describe, expect, it } from "vitest";
import { SettingsRepository } from "../../../src/repositories/settings.repository";
import { SettingsService } from "../../../src/services/settings.service";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";

const db = testDb();

describe("SettingsService", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("override change applies on next call", async () => {
    const service = new SettingsService(
      new SettingsRepository(db),
      resolvedConfig({ models: { public: "cfg/public" } }),
    );
    expect(await service.model("public")).toBe("cfg/public");

    await service.set("model.public", "db/one");
    expect(await service.model("public")).toBe("db/one");

    await service.set("model.public", "db/two");
    expect(await service.model("public")).toBe("db/two");

    await service.set("model.public", "");
    expect(await service.model("public")).toBe("cfg/public");

    await service.set("limits.maxQuestionChars", "42");
    expect(await service.limit("maxQuestionChars")).toBe(42);
  });
});
