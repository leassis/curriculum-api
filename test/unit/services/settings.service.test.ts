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

  it("resolves the import model from override then config", async () => {
    const config = resolvedConfig({ models: { import: "cfg/import" } });
    const overridden = new SettingsService(
      new FakeSettingsRepo({ "model.import": "ovr/import" }),
      config,
    );
    expect(await overridden.model("import")).toBe("ovr/import");
    expect(await new SettingsService(new FakeSettingsRepo(), config).model("import")).toBe(
      "cfg/import",
    );

    const error = await new SettingsService(new FakeSettingsRepo(), resolvedConfig())
      .model("import")
      .catch((e) => e);
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.fields).toEqual(["model.import"]);
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

  it("defaults target pages to 2 and reads a stored 3", async () => {
    const unset = new SettingsService(new FakeSettingsRepo(), resolvedConfig());
    expect(await unset.targetPages()).toBe(2);
    const stored = new SettingsService(
      new FakeSettingsRepo({ "print.targetPages": "3" }),
      resolvedConfig(),
    );
    expect(await stored.targetPages()).toBe(3);
  });

  it("rejects target pages outside 1 to 3", async () => {
    const repo = new FakeSettingsRepo();
    const service = new SettingsService(repo, resolvedConfig());
    await service.set("print.targetPages", "3");
    for (const value of ["0", "4", "2.5", "abc"]) {
      await expect(service.set("print.targetPages", value)).rejects.toBeInstanceOf(ValidationError);
    }
    expect(repo.rows["print.targetPages"]).toBe("3");
  });

  it("temperature prefers a valid override, 'default' sends none, invalid falls back", async () => {
    const repo = new FakeSettingsRepo({
      "temperature.public": "0.9",
      "temperature.recruiter": "default",
      "temperature.tailor": "3",
      "temperature.import": "abc",
    });
    const service = new SettingsService(repo, resolvedConfig({ temperatures: { tailor: 0.2 } }));
    expect(await service.temperature("public")).toBe(0.9);
    expect(await service.temperature("recruiter")).toBeUndefined();
    expect(await service.temperature("tailor")).toBe(0.2);
    expect(await service.temperature("import")).toBe(0.1);
    const plain = new SettingsService(new FakeSettingsRepo(), resolvedConfig());
    expect(await plain.temperature("public")).toBe(0.4);
    expect(await plain.temperature("recruiter")).toBe(0.3);
  });

  it("set validates temperature values", async () => {
    const repo = new FakeSettingsRepo();
    const service = new SettingsService(repo, resolvedConfig());
    for (const ok of ["0", "2", "0.7", "1.25", "default"]) {
      await service.set("temperature.public", ok);
      expect(repo.rows["temperature.public"]).toBe(ok);
    }
    for (const bad of ["2.1", "-0.5", "abc", "1e0", ".5", "Default"]) {
      await expect(service.set("temperature.tailor", bad)).rejects.toBeInstanceOf(ValidationError);
    }
    expect(repo.rows["temperature.tailor"]).toBeUndefined();
  });
});
