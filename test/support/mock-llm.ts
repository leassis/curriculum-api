import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { ModelFactory } from "../../src/llm/openrouter";

export interface RecordedCall {
  modelId: string;
  /** System and message text flattened, so tests can assert `not.toContain(value)`. */
  prompt: string;
  /** Text of the system messages only, to assert what sits in the system block. */
  system: string;
  maxOutputTokens: number | undefined;
}

export interface RecordingModelOptions {
  chunks?: string[];
  /** The provider errors before it emits any text. */
  failBeforeFirstChunk?: boolean;
  /** Text returned by generate(). */
  text?: string;
}

const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};
const finishReason = { unified: "stop", raw: undefined } as const;

type PromptMessage = { role: string; content: unknown };

function systemText(prompt: PromptMessage[]): string {
  return flatten(prompt.filter((m) => m.role === "system"));
}

function flatten(prompt: PromptMessage[]): string {
  return prompt
    .map((m) => {
      if (typeof m.content === "string") return m.content;
      return (m.content as { type: string; text?: string }[])
        .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
        .join("");
    })
    .join("\n");
}

export function createRecordingModel(opts: RecordingModelOptions = {}) {
  const calls: RecordedCall[] = [];
  const chunks = opts.chunks ?? ["Hello", " world"];

  const factory: ModelFactory = (modelId) =>
    new MockLanguageModelV4({
      modelId,
      doGenerate: async (options) => {
        calls.push({
          modelId,
          prompt: flatten(options.prompt as PromptMessage[]),
          system: systemText(options.prompt as PromptMessage[]),
          maxOutputTokens: options.maxOutputTokens,
        });
        return {
          content: [{ type: "text", text: opts.text ?? chunks.join("") }],
          finishReason,
          usage,
          warnings: [],
        };
      },
      doStream: async (options) => {
        calls.push({
          modelId,
          prompt: flatten(options.prompt as PromptMessage[]),
          system: systemText(options.prompt as PromptMessage[]),
          maxOutputTokens: options.maxOutputTokens,
        });
        if (opts.failBeforeFirstChunk) {
          return {
            stream: simulateReadableStream({
              chunks: [
                { type: "stream-start", warnings: [] },
                { type: "error", error: new Error("provider down") },
              ],
            }),
          };
        }
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "t1" },
              ...chunks.map((delta) => ({ type: "text-delta" as const, id: "t1", delta })),
              { type: "text-end", id: "t1" },
              { type: "finish", finishReason, usage },
            ],
          }),
        };
      },
    });

  return { factory, calls };
}
