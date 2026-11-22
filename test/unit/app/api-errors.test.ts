import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CaptchaFailedError,
  ChatExpiredError,
  ChatRevokedError,
  ConfigError,
  ForbiddenError,
  LimitReachedError,
  LlmUnavailableError,
  NotFoundError,
  PiiLeakError,
  UnauthorizedError,
  ValidationError,
} from "../../../src/services/errors";
import { createTestApp } from "../../support/test-app";

afterEach(() => vi.restoreAllMocks());

const cases: [string, Error, number, string][] = [
  ["validation", new ValidationError("bad input"), 400, "validation_error"],
  ["unauthorized", new UnauthorizedError(), 401, "unauthorized"],
  ["forbidden", new ForbiddenError(), 403, "forbidden"],
  ["captcha", new CaptchaFailedError(), 403, "captcha_failed"],
  ["not-found", new NotFoundError(), 404, "not_found"],
  ["revoked", new ChatRevokedError(), 410, "chat_revoked"],
  ["expired", new ChatExpiredError(), 410, "chat_expired"],
  ["limit", new LimitReachedError(), 429, "limit_reached"],
  ["llm", new LlmUnavailableError(), 502, "llm_unavailable"],
  ["pii", new PiiLeakError("PHONE"), 500, "internal_error"],
  ["config", new ConfigError(["model.public"]), 500, "config_error"],
];

function appThrowing() {
  return createTestApp({
    extend: (api) => {
      for (const [name, error] of cases) {
        api.get(`/boom/${name}`, () => {
          throw error;
        });
      }
      api.get("/boom/unknown", () => {
        throw new Error("secret detail: password=hunter2");
      });
    },
  }).app;
}

describe("api errors", () => {
  it("maps each domain error to its status and code", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const app = appThrowing();
    for (const [name, error, status, code] of cases) {
      const res = await app.request(`/api/boom/${name}`);
      expect(res.status, name).toBe(status);
      const body = (await res.json()) as { error: string; message?: string };
      expect(body.error, name).toBe(code);
      if (status < 500) expect(body.message, name).toBe(error.message);
    }
  });

  it("hides unknown errors as internal_error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await appThrowing().request("/api/boom/unknown");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal_error" });
    expect(log).toHaveBeenCalled();
  });
});
