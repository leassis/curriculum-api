import { describe, expect, it } from "vitest";
import { assertTestDatabase } from "../support/db";

describe("assertTestDatabase", () => {
  it("allows test databases and refuses the dev one", () => {
    expect(() => assertTestDatabase("curriculum_test_nodepg")).not.toThrow();
    expect(() => assertTestDatabase("curriculum")).toThrow(/refusing/);
  });
});
