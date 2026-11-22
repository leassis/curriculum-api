import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_SYSTEM_PROMPT,
  DEFAULT_RECRUITER_SYSTEM_PROMPT,
  DEFAULT_TAILOR_SYSTEM_PROMPT,
} from "../../src/llm/default-prompts";
import { publicChatSetup, readAll } from "../support/public-chat";

const PII = [
  ["EMAIL", "Email", "ada.private@example.com"],
  ["PHONE", "Phone", "+55 11 91234-5678"],
  ["CITY", "City", "São Paulo"],
  ["LINKEDIN", "LinkedIn", "linkedin.com/in/ada-private"],
  ["STREET", "Street", "Rua Augusta 123"],
] as const;

describe("default prompts with the PII guard on", () => {
  async function setup() {
    const s = await publicChatSetup({ config: { models: { public: "v/p", tailor: "v/t" } } });
    for (const [key, label, value] of PII) {
      await s.personalInfo.create({ key, label, value, visibility: "print", sortOrder: 0 });
    }
    return s;
  }

  it("never trip the guard and carry no Personal Info value", async () => {
    const { llm, calls } = await setup();
    const msg = [{ role: "user" as const, content: "hi" }];
    const base = { body: "Ten years building backends.", maxOutputTokens: 50 };
    const chat = await llm.stream({
      ...base,
      area: "public",
      system: DEFAULT_PUBLIC_SYSTEM_PROMPT,
      messages: msg,
    });
    await readAll(chat.stream);
    const rec = await llm.stream({
      ...base,
      area: "public",
      system: `${DEFAULT_RECRUITER_SYSTEM_PROMPT}\n\nJob Description:\nSenior engineer`,
      messages: msg,
    });
    await readAll(rec.stream);
    await llm.generate({
      ...base,
      area: "tailor",
      system: DEFAULT_TAILOR_SYSTEM_PROMPT,
      input: "Today's date: 2026-11-22\n\nJD",
    });
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      for (const [, , value] of PII) {
        expect(call.prompt.toLowerCase()).not.toContain(value.toLowerCase());
      }
      expect(call.prompt).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    }
  });
});
