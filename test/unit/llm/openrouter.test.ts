import { describe, expect, it } from "vitest";
import { createProvider } from "../../../src/llm/openrouter";

type WithSettings = { settings: { provider?: unknown; plugins?: unknown } };

describe("openrouter factory", () => {
  it("adds structured settings only for structured calls", () => {
    const factory = createProvider("test-key");

    const structured = factory("vendor/model-a", { structured: true }) as unknown as WithSettings;
    expect(structured.settings.provider).toEqual({ require_parameters: true });
    expect(structured.settings.plugins).toEqual([{ id: "response-healing" }]);

    for (const plain of [factory("vendor/model-a"), factory("vendor/model-a", {})]) {
      const settings = (plain as unknown as WithSettings).settings;
      expect(settings.provider).toBeUndefined();
      expect(settings.plugins).toBeUndefined();
    }
  });

  it("keeps the model id for structured and plain calls", () => {
    const factory = createProvider("test-key");
    expect(factory("vendor/model-a", { structured: true })).toMatchObject({
      modelId: "vendor/model-a",
    });
    expect(factory("vendor/model-a")).toMatchObject({ modelId: "vendor/model-a" });
  });
});
