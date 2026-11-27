import { describe, expect, it } from "vitest";
import {
  SHORT_JD_MAX_CHARS,
  SHORT_JD_RULES,
  shortJobDescription,
} from "../../../../src/services/tailor/short-description";

const rules = SHORT_JD_RULES.toLowerCase();

describe("short job description rules", () => {
  it("name every kept section", () => {
    for (const kept of [
      /role and seniority/,
      /company and its area/,
      /location, remote policy and time zone/,
      /required qualifications, one atomic requirement per bullet/,
      /nice-to-haves, in a separate section/,
      /main responsibilities, short/,
    ]) {
      expect(rules).toMatch(kept);
    }
  });

  it("name every dropped item", () => {
    for (const dropped of [
      /marketing/,
      /benefits/,
      /equal-opportunity, eeo and diversity statements/,
      /application instructions/,
      /repetition/,
      /contact details/,
      /people's names/,
      /urls/,
    ]) {
      expect(rules).toMatch(dropped);
    }
  });

  it("fix format, language and the 2000 cap", () => {
    expect(SHORT_JD_MAX_CHARS).toBe(2000);
    expect(rules).toContain("plain text");
    expect(SHORT_JD_RULES).toContain('"- " bullets');
    expect(rules).toContain("same language as the job description");
    expect(SHORT_JD_RULES).toContain("never exceed 2000 characters");
  });
});

describe("shortJobDescription", () => {
  it("cuts at the last line or sentence end before 2000", () => {
    const line = `${"a".repeat(1500)}.`;
    const sentenceCut = shortJobDescription(`${line} ${"b".repeat(600)}`);
    expect(sentenceCut).toBe(line);

    const lineBreak = `${"c".repeat(1800)}\n`;
    const lineCut = shortJobDescription(`${lineBreak}${"d".repeat(300)}`);
    expect(lineCut).toBe("c".repeat(1800));

    const both = `${"e".repeat(1000)}. ${"f".repeat(500)}\n${"g".repeat(600)}`;
    expect(shortJobDescription(both)).toBe(`${"e".repeat(1000)}. ${"f".repeat(500)}`);

    const exclaim = `${"h".repeat(1900)}! ${"i".repeat(300)}`;
    expect(shortJobDescription(exclaim)).toBe(`${"h".repeat(1900)}!`);
  });

  it("hard-cuts at 2000 and keeps exactly 2000 whole", () => {
    const hard = shortJobDescription("a".repeat(2100));
    expect(Array.from(hard as string)).toHaveLength(2000);

    const exact = `${"x".repeat(1999)}.`;
    expect(shortJobDescription(exact)).toBe(exact);

    const emoji = "😀".repeat(2100);
    const cut = shortJobDescription(emoji);
    expect(cut).toBe("😀".repeat(2000));

    const lineEndsAtCap = `${"j".repeat(2000)}\n${"k".repeat(50)}`;
    expect(shortJobDescription(lineEndsAtCap)).toBe("j".repeat(2000));
  });

  it("does not end a sentence inside a number and ends it before a closing quote", () => {
    const decimal = `A one. ${"b".repeat(1000)}3.5${"c".repeat(1200)}`;
    expect(shortJobDescription(decimal)).toBe("A one.");
    const quoted = `${"a".repeat(1500)}." ${"b".repeat(600)}`;
    expect(shortJobDescription(quoted)).toBe(`${"a".repeat(1500)}."`);
  });

  it("trims the text and turns a blank into null", () => {
    expect(shortJobDescription("  - One\n- Two \n")).toBe("- One\n- Two");
    expect(shortJobDescription("")).toBeNull();
    expect(shortJobDescription(" \n\t ")).toBeNull();
  });
});
