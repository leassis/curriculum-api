import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export interface ModelOptions {
  /** Require providers to honour response_format and heal malformed JSON (non-streaming calls). */
  structured?: boolean;
}

/** Resolves an OpenRouter model ID to a language model. Tests inject a recording mock instead. */
export type ModelFactory = (modelId: string, opts?: ModelOptions) => LanguageModel;

export function createProvider(apiKey: string): ModelFactory {
  const provider = createOpenRouter({ apiKey });
  return (modelId, opts) =>
    opts?.structured
      ? provider(modelId, {
          provider: { require_parameters: true },
          plugins: [{ id: "response-healing" }],
        })
      : provider(modelId);
}
