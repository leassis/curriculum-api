import { describe, expect, it } from "vitest";
import * as errors from "../../../src/services/errors";

describe("domain errors", () => {
  it("each class carries its code and status", () => {
    const expected: [errors.DomainError, string, number][] = [
      [new errors.ValidationError(), "validation_error", 400],
      [new errors.UnauthorizedError(), "unauthorized", 401],
      [new errors.ForbiddenError(), "forbidden", 403],
      [new errors.CaptchaFailedError(), "captcha_failed", 403],
      [new errors.NotFoundError(), "not_found", 404],
      [new errors.ChatRevokedError(), "chat_revoked", 410],
      [new errors.ChatExpiredError(), "chat_expired", 410],
      [new errors.LimitReachedError(), "limit_reached", 429],
      [new errors.LlmUnavailableError(), "llm_unavailable", 502],
      [new errors.PiiLeakError("phone"), "internal_error", 500],
      [new errors.ConfigError(["sessionSecret"]), "config_error", 500],
      [new errors.DecryptionError(), "internal_error", 500],
    ];
    for (const [error, code, status] of expected) {
      expect(error).toBeInstanceOf(errors.DomainError);
      expect(error.code).toBe(code);
      expect(error.status).toBe(status);
    }
  });

  it("PiiLeakError names the field key and ConfigError lists every field", () => {
    expect(new errors.PiiLeakError("phone").message).toContain("phone");
    expect(new errors.ConfigError(["a", "b"]).message).toContain("a, b");
  });
});
