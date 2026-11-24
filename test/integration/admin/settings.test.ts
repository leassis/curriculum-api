import { beforeEach, describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { LlmService } from "../../../src/services/llm.service";
import { resolvedConfig } from "../../support/config";
import { resetDb, testDb } from "../../support/db";
import { createRecordingModel } from "../../support/mock-llm";
import { createTestApp } from "../../support/test-app";

const db = testDb();

describe("admin settings with database", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("applies the model override to the next public call", async () => {
    const options = { models: { public: "cfg/public" } };
    const config = resolvedConfig(options);
    const { app, services } = createTestApp({ config: options });
    const { factory, calls } = createRecordingModel({ chunks: ["hi"] });
    const llm = new LlmService(config, services.settings, services.personalInfo, factory);
    const token = await signSession({ scope: "admin" }, config.sessionSecret, 60);
    const save = (model: string) =>
      app.request("/admin/settings", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: `curr_admin=${token}`,
        },
        body: new URLSearchParams({ "model.public": model }).toString(),
      });
    const ask = async () => {
      const { stream, model } = await llm.stream({
        area: "public",
        system: "sys",
        body: "cv body",
        messages: [{ role: "user", content: "hello" }],
        maxOutputTokens: 50,
      });
      const reader = stream.getReader();
      while (!(await reader.read()).done);
      return model;
    };

    expect(await ask()).toBe("cfg/public");
    expect((await save("x/y")).status).toBe(303);
    expect(await ask()).toBe("x/y");
    expect(calls.at(-1)?.modelId).toBe("x/y");
    expect((await save("")).status).toBe(303);
    expect(await ask()).toBe("cfg/public");
  });
});
