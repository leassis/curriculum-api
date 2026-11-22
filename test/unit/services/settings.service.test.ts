import { describe, expect, it } from "vitest";
import { ConfigError, ValidationError } from "../../../src/services/errors";
import { SettingsService } from "../../../src/services/settings.service";
import { resolvedConfig } from "../../support/config";
import { FakeSettingsRepo } from "../../support/fakes/settings.fake";

describe("SettingsService", () => {
  it("model prefers override then config else ConfigError", async () => {
    const repo = new FakeSettingsRepo({ "model.public": "override/model" });
    const service = new SettingsService(
      repo,
      resolvedConfig({ models: { public: "cfg/public", tailor: "cfg/tailor" } }),
    );
    expect(await service.model("public")).toBe("override/model");
    expect(await service.model("tailor")).toBe("cfg/tailor");

    const error = await service.model("recruiter").catch((e) => e);
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain("model.recruiter");
    expect(error.fields).toEqual(["model.recruiter"]);
  });

  it("limit prefers override then config", async () => {
    const repo = new FakeSettingsRepo({ "limits.maxQuestionChars": "250" });
    const service = new SettingsService(
      repo,
      resolvedConfig({ limits: { maxHistoryMessages: 4 } }),
    );
    expect(await service.limit("maxQuestionChars")).toBe(250);
    expect(await service.limit("maxHistoryMessages")).toBe(4);
    expect(await service.limit("sessionTtlMinutes")).toBe(120);
  });

  it("set validates keys and values and deletes on empty", async () => {
    const repo = new FakeSettingsRepo();
    const service = new SettingsService(repo, resolvedConfig());

    await service.set("model.public", "a/b");
    await service.set("limits.maxQuestionChars", "300");
    await service.set("print.pageSize", "Letter");
    expect(repo.rows).toEqual({
      "model.public": "a/b",
      "limits.maxQuestionChars": "300",
      "print.pageSize": "Letter",
    });
    expect(await service.pageSize()).toBe("Letter");

    await service.set("model.public", "");
    expect(repo.rows["model.public"]).toBeUndefined();

    for (const [key, value] of [
      ["unknown.key", "x"],
      ["limits.nope", "5"],
      ["limits.maxQuestionChars", "0"],
      ["limits.maxQuestionChars", "-3"],
      ["limits.maxQuestionChars", "1.5"],
      ["limits.maxQuestionChars", "abc"],
      ["print.pageSize", "A3"],
    ] as const) {
      await expect(service.set(key, value)).rejects.toBeInstanceOf(ValidationError);
    }
    expect(repo.rows["limits.maxQuestionChars"]).toBe("300");
    expect(await new SettingsService(new FakeSettingsRepo(), resolvedConfig()).pageSize()).toBe(
      "A4",
    );
  });
});
