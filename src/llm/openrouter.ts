import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/** Resolves an OpenRouter model ID to a language model. Tests inject a recording mock instead. */
export type ModelFactory = (modelId: string) => LanguageModel;

export function createProvider(apiKey: string): ModelFactory {
  const provider = createOpenRouter({ apiKey });
  return (modelId) => provider(modelId);
}
