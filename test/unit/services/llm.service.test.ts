import { describe, expect, it, vi } from "vitest";
import { LlmUnavailableError, PiiLeakError } from "../../../src/services/errors";
import { LlmService } from "../../../src/services/llm.service";
import { PersonalInfoService } from "../../../src/services/personal-info.service";
import { SettingsService } from "../../../src/services/settings.service";
import { resolvedConfig, TEST_PII_KEY } from "../../support/config";
import { FakePersonalInfoRepo } from "../../support/fakes/personal-info.fake";
import { FakeSettingsRepo } from "../../support/fakes/settings.fake";
import { createRecordingModel, type RecordingModelOptions } from "../../support/mock-llm";

const API_KEY = "sk-or-super-secret";
const EMAIL = "ada@example.com";
const PHONE = "+55 11 91234-5678";

async function setup(mock: RecordingModelOptions = {}) {
  const config = resolvedConfig({
    openrouterApiKey: API_KEY,
    models: { public: "vendor/public-model", recruiter: "vendor/recruiter-model" },
  });
  const settings = new SettingsService(new FakeSettingsRepo(), config);
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), TEST_PII_KEY);
  await personalInfo.create({ key: "EMAIL", label: "Email", value: EMAIL, visibility: "public" });
  await personalInfo.create({ key: "PHONE", label: "Phone", value: PHONE, visibility: "print" });
  const { factory, calls } = createRecordingModel(mock);
  const logs: { level: string; message: string; data: unknown }[] = [];
  const logger = {
    info: (message: string, data?: unknown) => logs.push({ level: "info", message, data }),
    warn: (message: string, data?: unknown) => logs.push({ level: "warn", message, data }),
  };
  const llm = new LlmService(config, settings, personalInfo, factory, logger);
  return { llm, calls, logs };
}

async function read(stream: ReadableStream<string>): Promise<string> {
  let out = "";
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out += value;
  }
}

const baseReq = {
  area: "public" as const,
  system: "You answer questions about the candidate.",
  body: "Senior engineer with ten years of experience.",
  messages: [{ role: "user" as const, content: "What do you do?" }],
  maxOutputTokens: 321,
};

describe("LlmService", () => {
  it("refuses a body with pii without calling the provider", async () => {
    const { llm, calls, logs } = await setup();
    const leakyBody = `Contact: ${EMAIL.toUpperCase()}`;

    await expect(llm.stream({ ...baseReq, body: leakyBody })).rejects.toBeInstanceOf(PiiLeakError);
    await expect(llm.stream({ ...baseReq, system: `Call ${PHONE}` })).rejects.toBeInstanceOf(
      PiiLeakError,
    );
    await expect(
      llm.generate({ ...baseReq, body: leakyBody, input: "tailor" }),
    ).rejects.toBeInstanceOf(PiiLeakError);

    expect(calls).toHaveLength(0);
    const warns = logs.filter((l) => l.level === "warn");
    expect(warns.length).toBeGreaterThan(0);
    expect(warns[0]?.data).toEqual({ fieldKey: "EMAIL" });
    const logged = JSON.stringify(logs);
    expect(logged).not.toContain("example.com");
    expect(logged).not.toContain("91234");
  });

  it("redacts pii in user messages", async () => {
    const { llm, calls } = await setup();
    const { stream } = await llm.stream({
      ...baseReq,
      messages: [{ role: "user", content: `is ${EMAIL} yours?` }],
    });
    await read(stream);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.prompt).toContain("is [redacted] yours?");
    expect(calls[0]?.prompt).not.toContain("example.com");

    await llm.generate({ ...baseReq, input: `call me at ${PHONE}` });
    expect(calls[1]?.prompt).toContain("call me at [redacted]");
    expect(calls[1]?.prompt).not.toContain("91234");
  });

  it("uses the settings model and max output tokens", async () => {
    const { llm, calls } = await setup();
    const result = await llm.stream({ ...baseReq, area: "recruiter" });
    await read(result.stream);
    expect(result.model).toBe("vendor/recruiter-model");
    expect(calls[0]?.modelId).toBe("vendor/recruiter-model");
    expect(calls[0]?.maxOutputTokens).toBe(321);
    expect(calls[0]?.prompt).toContain("<cv>\nSenior engineer");

    const generated = await llm.generate({ ...baseReq, input: "x", maxOutputTokens: 55 });
    expect(generated.model).toBe("vendor/public-model");
    expect(calls[1]?.maxOutputTokens).toBe(55);
  });

  it("throws LlmUnavailableError before the first chunk", async () => {
    const { llm } = await setup({ failBeforeFirstChunk: true });
    await expect(llm.stream(baseReq)).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it("streams the chunks in order after the first one", async () => {
    const { llm } = await setup({ chunks: ["a", "b", "c"] });
    const { stream } = await llm.stream(baseReq);
    expect(await read(stream)).toBe("abc");
  });

  it("logs model usage and latency and never secrets", async () => {
    const { llm, logs } = await setup();
    const { stream } = await llm.stream({
      ...baseReq,
      messages: [{ role: "user", content: `my mail is ${EMAIL}` }],
    });
    await read(stream);
    await vi.waitFor(() => expect(logs.some((l) => l.message === "llm call")).toBe(true));

    const call = logs.find((l) => l.message === "llm call")?.data as Record<string, unknown>;
    expect(call.model).toBe("vendor/public-model");
    expect(call.inputTokens).toBe(3);
    expect(call.outputTokens).toBe(5);
    expect(typeof call.latencyMs).toBe("number");

    const logged = JSON.stringify(logs);
    for (const secret of [
      API_KEY,
      "What do you do",
      "Senior engineer",
      EMAIL,
      "example.com",
      "91234",
    ]) {
      expect(logged).not.toContain(secret);
    }
  });
});
