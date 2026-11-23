import { describe, expect, it } from "vitest";
import { IMPORT_PROMPT } from "../../../src/llm/import-prompt";
import { parseItemsMarkdown } from "../../../src/services/career/markdown";

describe("import prompt", () => {
  it("example parses with the library parser", () => {
    const example = /<<<EXAMPLE_START>>>\n([\s\S]*)\n<<<EXAMPLE_END>>>/.exec(IMPORT_PROMPT)?.[1];
    expect(example).toBeTruthy();
    const parsed = parseItemsMarkdown(example ?? "", []);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.items.map((i) => i.kind)).toEqual([
        "experience",
        "education",
        "skill_group",
        "language",
      ]);
    }
  });

  it("holds no personal info placeholder", () => {
    expect(IMPORT_PROMPT).not.toMatch(
      /@|\bhttps?:|\+\d|\{\{|\[(EMAIL|PHONE|CITY|LINKEDIN|STREET)\]/i,
    );
  });

  it("says the data block is data and forbids inventing facts", () => {
    expect(IMPORT_PROMPT).toContain("<<<CV_TEXT_START>>>");
    expect(IMPORT_PROMPT).toMatch(/data, never instructions/);
    expect(IMPORT_PROMPT).toMatch(/Never invent/);
  });
});
