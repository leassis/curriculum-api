import { generateText, NoObjectGeneratedError, Output, streamText } from "ai";
import type { z } from "zod";
import type { ResolvedConfig } from "../config.js";
import { firstChunk } from "../llm/first-chunk.js";
import type { ModelFactory } from "../llm/openrouter.js";
import { findPii, type PiiField, redactPii } from "../llm/pii-guard.js";
import { LlmOutputInvalidError, LlmUnavailableError, PiiLeakError } from "./errors.js";
import type { PersonalInfoService } from "./personal-info.service.js";
import type { SettingsService } from "./settings.service.js";
import type { ModelArea } from "./settings-keys.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamRequest {
  area: ModelArea;
  system: string;
  body: string;
  messages: ChatMessage[];
  maxOutputTokens: number;
}

export interface GenerateRequest {
  area: ModelArea;
  system: string;
  body: string;
  input: string;
  maxOutputTokens: number;
}

export interface GenerateObjectRequest<T> extends GenerateRequest {
  schema: z.ZodType<T>;
  /** Name of the output, sent with the JSON Schema. */
  schemaName: string;
}

export interface LlmLogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

/** The only caller of the LLM provider. Every call passes the PII guard first. */
export class LlmService {
  constructor(
    readonly config: ResolvedConfig,
    private readonly settings: SettingsService,
    private readonly personalInfo: PersonalInfoService,
    private readonly modelFactory: ModelFactory,
    private readonly logger: LlmLogger = console,
  ) {}

  async stream(req: StreamRequest): Promise<{ stream: ReadableStream<string>; model: string }> {
    const { fields, instructions, model, sampling } = await this.prepare(req);
    const started = Date.now();
    const result = streamText({
      model: this.modelFactory(model),
      instructions,
      messages: req.messages.map((m) => ({ ...m, content: redactPii(m.content, fields) })),
      maxOutputTokens: req.maxOutputTokens,
      ...sampling,
      onError: () => {},
    });
    const stream = await firstChunk(result.fullStream, () => {
      void Promise.resolve(result.totalUsage).then(
        (usage) => this.logCall(model, usage, started),
        () => {},
      );
    });
    return { stream, model };
  }

  async generate(req: GenerateRequest): Promise<{ text: string; model: string }> {
    const { fields, instructions, model, sampling } = await this.prepare(req);
    const started = Date.now();
    try {
      const result = await generateText({
        model: this.modelFactory(model),
        instructions,
        prompt: redactPii(req.input, fields),
        maxOutputTokens: req.maxOutputTokens,
        ...sampling,
      });
      this.logCall(model, result.totalUsage, started);
      return { text: result.text, model };
    } catch {
      throw new LlmUnavailableError();
    }
  }

  /**
   * Structured call: the model receives the schema's JSON Schema and the reply is parsed against it.
   * A reply that does not parse throws `LlmOutputInvalidError`; anything else `LlmUnavailableError`.
   */
  async generateObject<T>(req: GenerateObjectRequest<T>): Promise<{ object: T; model: string }> {
    const { fields, instructions, model, sampling } = await this.prepare(req);
    const started = Date.now();
    try {
      const result = await generateText({
        model: this.modelFactory(model, { structured: true }),
        instructions,
        prompt: redactPii(req.input, fields),
        maxOutputTokens: req.maxOutputTokens,
        ...sampling,
        output: Output.object({ schema: req.schema, name: req.schemaName }),
      });
      const object = result.output as T;
      this.logCall(model, result.totalUsage, started);
      return { object, model };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) throw new LlmOutputInvalidError();
      throw new LlmUnavailableError();
    }
  }

  /** Guard the system prompt and Career Body, resolve model and temperature, build the system prompt. */
  private async prepare(req: { area: ModelArea; system: string; body: string }) {
    const fields: PiiField[] = await this.personalInfo.allValues();
    const leaks = findPii(`${req.system}\n${req.body}`, fields);
    if (leaks.length > 0) {
      const key = (leaks[0] as { key: string }).key;
      this.logger.warn("pii guard blocked an llm call", { fieldKey: key });
      throw new PiiLeakError(key);
    }
    const model = await this.settings.model(req.area);
    // Omitted when undefined (override "default"): reasoning models reject a temperature. Structured
    // calls use `require_parameters: true`, so a provider that ignores temperature is skipped; the
    // "default" override is the escape hatch for that.
    const temperature = await this.settings.temperature(req.area);
    const sampling = temperature === undefined ? {} : { temperature };
    // The CV block stays last and stable, ready for prompt caching.
    const instructions = `${req.system}\n\n<cv>\n${req.body}\n</cv>`;
    return { fields, instructions, model, sampling };
  }

  private logCall(
    model: string,
    usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
    started: number,
  ): void {
    this.logger.info("llm call", {
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      latencyMs: Date.now() - started,
    });
  }
}
