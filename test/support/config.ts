import type { CurriculumApiConfig, ResolvedConfig } from "../../src/config";
import { resolveConfig } from "../../src/config";

/** 32 zero bytes, base64. */
export const TEST_PII_KEY = Buffer.alloc(32, 7).toString("base64");

export function validConfig(overrides: Partial<CurriculumApiConfig> = {}): CurriculumApiConfig {
  return {
    databaseUrl:
      process.env.TEST_DATABASE_URL ??
      "postgres://postgres:postgres@db.localtest.me:5432/curriculum_test",
    openrouterApiKey: "sk-or-test-key",
    sessionSecret: "s".repeat(40),
    turnstileSecret: "turnstile-secret",
    adminPasswordHash: "$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345",
    ipHashSalt: "salt",
    piiEncryptionKey: TEST_PII_KEY,
    secureCookies: false,
    ...overrides,
  };
}

export function resolvedConfig(overrides: Partial<CurriculumApiConfig> = {}): ResolvedConfig {
  return resolveConfig(validConfig(overrides));
}
