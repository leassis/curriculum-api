import { generateText, streamText } from "ai";
import { describe, expect, it } from "vitest";
import { createRecordingModel } from "../../support/mock-llm";

describe("mock llm", () => {
  it("records every prompt", async () => {
    const { factory, calls } = createRecordingModel({ chunks: ["Hi", " there"] });

    const streamed = streamText({
      model: factory("vendor/model-a"),
      instructions: "SYSTEM RULES",
      messages: [{ role: "user", content: "first question" }],
      maxOutputTokens: 77,
    });
    let text = "";
    for await (const part of streamed.textStream) text += part;
    expect(text).toBe("Hi there");

    const generated = await generateText({
      model: factory("vendor/model-b"),
      instructions: "OTHER SYSTEM",
      prompt: "second question",
    });
    expect(generated.text).toBe("Hi there");

    expect(calls).toHaveLength(2);
    expect(calls[0]?.modelId).toBe("vendor/model-a");
    expect(calls[0]?.prompt).toContain("SYSTEM RULES");
    expect(calls[0]?.prompt).toContain("first question");
    expect(calls[0]?.maxOutputTokens).toBe(77);
    expect(calls[1]?.modelId).toBe("vendor/model-b");
    expect(calls[1]?.prompt).toContain("OTHER SYSTEM");
    expect(calls[1]?.prompt).toContain("second question");
  });
});
