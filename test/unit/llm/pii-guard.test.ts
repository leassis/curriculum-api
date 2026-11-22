import { describe, expect, it } from "vitest";
import { findPii, redactPii } from "../../../src/llm/pii-guard";

const fields = [
  { key: "PHONE", label: "Phone", value: "+55 (11) 91234-5678" },
  { key: "EMAIL", label: "Email", value: "  Ada@Example.COM " },
  { key: "CITY", label: "City", value: "Belo Horizonte" },
];

describe("pii guard", () => {
  it("matches case-insensitive text, phone digits and email", () => {
    expect(findPii("I live in BELO horizonte", fields).map((m) => m.key)).toEqual(["CITY"]);
    expect(findPii("mail ADA@example.com please", fields).map((m) => m.key)).toEqual(["EMAIL"]);
    expect(findPii("call +55 11 91234 5678 today", fields).map((m) => m.key)).toEqual(["PHONE"]);
    expect(findPii("call 5511912345678", fields).map((m) => m.key)).toEqual(["PHONE"]);
    expect(findPii("call 55.11.91234.5678", fields).map((m) => m.key)).toEqual(["PHONE"]);
    expect(findPii("nothing personal here, order 12345 shipped", fields)).toEqual([]);
    expect(findPii("call 91234", fields)).toEqual([]);
  });

  it("reports key and label only", () => {
    const [match] = findPii("ada@example.com", fields);
    expect(match).toEqual({ key: "EMAIL", label: "Email" });
    expect(JSON.stringify(match)).not.toContain("example.com");
  });

  it("ignores values shorter than 3 characters", () => {
    const short = [
      { key: "A", label: "Initial", value: "ab" },
      { key: "B", label: "Blank", value: "  " },
    ];
    expect(findPii("ab cab  xyz", short)).toEqual([]);
    expect(redactPii("ab cab", short)).toBe("ab cab");
  });

  it("redacts every occurrence", () => {
    expect(
      redactPii("is a@b.com yours? A@B.COM again", [{ key: "E", label: "E", value: "a@b.com" }]),
    ).toBe("is [redacted] yours? [redacted] again");
    expect(redactPii("tel: +55 11 91234-5678.", fields)).toContain("[redacted]");
    expect(redactPii("tel: +55 11 91234-5678.", fields)).not.toContain("91234");
    expect(redactPii("I live in belo horizonte", fields)).toBe("I live in [redacted]");
  });
});
