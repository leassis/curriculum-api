import { describe, expect, it } from "vitest";
import { serverOptions } from "../../../examples/node/server";

describe("node example", () => {
  it("uses port 3001 and insecure cookies", () => {
    const options = serverOptions({
      DATABASE_URL: "postgres://x",
      OPENROUTER_API_KEY: "key",
      MODEL_PUBLIC: "vendor/model",
      MODEL_IMPORT: "vendor/import",
    });
    expect(options.port).toBe(3001);
    expect(options.secureCookies).toBe(false);
    expect(options.databaseUrl).toBe("postgres://x");
    expect(options.openrouterApiKey).toBe("key");
    expect(options.models).toEqual({
      public: "vendor/model",
      tailor: undefined,
      recruiter: undefined,
      import: "vendor/import",
    });
  });
});
