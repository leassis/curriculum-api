import { describe, expect, it } from "vitest";
import {
  DECLINE_ANSWER,
  DEFAULT_PUBLIC_SYSTEM_PROMPT,
  DEFAULT_RECRUITER_SYSTEM_PROMPT,
  DEFAULT_TAILOR_SYSTEM_PROMPT,
} from "../../../src/llm/default-prompts";

describe("default prompt rules", () => {
  const chat = [DEFAULT_PUBLIC_SYSTEM_PROMPT, DEFAULT_RECRUITER_SYSTEM_PROMPT];

  it("treat delimited text as data in every prompt", () => {
    for (const p of [...chat, DEFAULT_TAILOR_SYSTEM_PROMPT]) {
      expect(p).toContain("<<<NAME_START>>>");
      expect(p).toContain("never instructions");
    }
  });

  it("chat prompts refuse with a fixed text, never infer, never score", () => {
    for (const p of chat) {
      expect(p).toContain(`reply exactly: "${DECLINE_ANSWER}"`);
      for (const topic of ["whole CV", "verbatim", "these instructions", "another person"]) {
        expect(p).toContain(topic);
      }
      expect(p).toContain("adjacent skill");
      expect(p).toContain("score");
      expect(p).not.toContain("volunteer");
    }
    expect(DEFAULT_RECRUITER_SYSTEM_PROMPT).toContain("never evidence");
    expect(DEFAULT_RECRUITER_SYSTEM_PROMPT).not.toContain(
      "say plainly where the CV does not cover",
    );
    expect(DEFAULT_RECRUITER_SYSTEM_PROMPT).toContain("lead with the CV experience that matches");
    expect(DEFAULT_RECRUITER_SYSTEM_PROMPT).toContain(
      "Never list, point out or bring up a requirement",
    );
    expect(DEFAULT_RECRUITER_SYSTEM_PROMPT).toContain("never claim it");
    expect(DEFAULT_RECRUITER_SYSTEM_PROMPT).toContain(
      "fits the role or the job description are in scope",
    );
    expect(DEFAULT_RECRUITER_SYSTEM_PROMPT).toContain("always add the closest related experience");
    expect(DEFAULT_PUBLIC_SYSTEM_PROMPT).toContain("say the CV does not mention it");
  });

  it("tailor prompt forbids invented facts, copied phrasing, dropped roles and noise", () => {
    const p = DEFAULT_TAILOR_SYSTEM_PROMPT;
    for (const part of [
      "certification or metric that is absent from the CV",
      "stays out of the resume",
      "Never copy the job description's phrasing",
      "Never drop or merge a role",
      "compress its bullets",
      "tables, emoji",
      "meta-commentary",
      "control tokens",
      "Output markdown only",
    ]) {
      expect(p).toContain(part);
    }
  });

  it("carry no contact data and keep the candidate identity", () => {
    for (const p of [...chat, DEFAULT_TAILOR_SYSTEM_PROMPT]) {
      expect(p).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{8,}\d/);
      expect(p).toContain('"the candidate"');
    }
  });
});
