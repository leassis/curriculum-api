// Manual, PAID smoke: one structured call against MODEL_TAILOR via OpenRouter.
// Run: pnpm tsx --env-file=.env --env-file=.env.local scripts/smoke-structured.ts
import { generateText, Output } from "ai";
import { z } from "zod";
import { createProvider } from "../src/llm/openrouter.js";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY is required");
  process.exit(2);
}
const modelId = process.env.MODEL_TAILOR;
if (!modelId) {
  console.error("MODEL_TAILOR is required");
  process.exit(2);
}

const schema = z.object({
  title: z.string().describe("A short job title"),
  skills: z.array(z.string()).describe("Three skills"),
});

try {
  const model = createProvider(apiKey)(modelId, { structured: true });
  const { output } = await generateText({
    model,
    output: Output.object({ schema }),
    prompt: "Invent a plausible job title and three skills for a backend engineer.",
  });
  console.log(JSON.stringify(output, null, 2));
} catch (err) {
  const e = err as Error;
  console.error(`${e.constructor.name}: ${e.message}`);
  process.exit(1);
}
