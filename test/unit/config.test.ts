import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../src/config";
import { ConfigError } from "../../src/services/errors";
import { TEST_PII_KEY, validConfig } from "../support/config";

function failure(input: unknown): ConfigError {
  try {
    resolveConfig(input as never);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return error as ConfigError;
  }
  throw new Error("expected resolveConfig to throw");
}

describe("config", () => {
  it("lists every missing required field", () => {
    const error = failure({});
    const required = [
      "databaseUrl",
      "openrouterApiKey",
      "sessionSecret",
      "turnstileSecret",
      "adminPasswordHash",
      "ipHashSalt",
      "piiEncryptionKey",
    ];
    expect(error.fields.sort()).toEqual([...required].sort());
    for (const field of required) expect(error.message).toContain(field);
    expect(failure(validConfig({ databaseUrl: "" })).fields).toEqual(["databaseUrl"]);
  });

  it("rejects a short session secret and a bad pii key", () => {
    expect(failure(validConfig({ sessionSecret: "short" })).fields).toEqual(["sessionSecret"]);
    expect(failure(validConfig({ piiEncryptionKey: "not base64 !!" })).fields).toEqual([
      "piiEncryptionKey",
    ]);
    const sixteenBytes = Buffer.alloc(16, 1).toString("base64");
    expect(failure(validConfig({ piiEncryptionKey: sixteenBytes })).message).toContain(
      "piiEncryptionKey",
    );
    expect(resolveConfig(validConfig({ piiEncryptionKey: TEST_PII_KEY })).piiEncryptionKey).toBe(
      TEST_PII_KEY,
    );
  });

  it("applies documented defaults", () => {
    const { secureCookies: _omit, ...rest } = validConfig();
    const resolved = resolveConfig(rest);
    expect(resolved.basePath).toBe("");
    expect(resolved.secureCookies).toBe(true);
    expect(resolved.limits).toEqual({
      publicQuestionsPerIpPerDay: 5,
      recruiterQuestionsDefault: 10,
      publicMaxOutputTokens: 500,
      recruiterMaxOutputTokens: 1200,
      maxQuestionChars: 1000,
      maxHistoryMessages: 10,
      sessionTtlMinutes: 120,
    });
    const custom = resolveConfig(validConfig({ limits: { maxQuestionChars: 50 } }));
    expect(custom.limits.maxQuestionChars).toBe(50);
    expect(custom.limits.sessionTtlMinutes).toBe(120);
  });
});
