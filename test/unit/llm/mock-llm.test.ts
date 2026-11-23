import { generateText, Output, streamText } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
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

  it("records the response format and structured flag of a structured call", async () => {
    const { factory, calls } = createRecordingModel({ text: '{"title":"Engineer"}' });
    const schema = z.object({ title: z.string().describe("A short job title") });

    const { output } = await generateText({
      model: factory("vendor/model-c", { structured: true }),
      output: Output.object({ schema, name: "role" }),
      prompt: "invent a role",
    });
    await generateText({ model: factory("vendor/model-d"), prompt: "plain" });

    expect(output).toEqual({ title: "Engineer" });
    const format = calls[0]?.responseFormat;
    expect(format?.type).toBe("json");
    const json = format?.type === "json" ? format : undefined;
    expect(json?.name).toBe("role");
    expect(json?.schema).toMatchObject({
      type: "object",
      properties: { title: { type: "string", description: "A short job title" } },
      required: ["title"],
    });
    expect(calls[0]?.structured).toBe(true);
    expect(calls[1]?.responseFormat?.type ?? "text").toBe("text");
    expect(calls[1]?.structured).toBe(false);
  });
});
