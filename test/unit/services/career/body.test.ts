import { describe, expect, it } from "vitest";
import { renderCareerBody } from "../../../../src/services/career/body";
import { item, sampleLibrary } from "../../../support/career";
import { SAMPLE_MARKDOWN } from "../../../support/career-markdown";

describe("career body", () => {
  it("renders headline summary and items in section order", () => {
    const body = renderCareerBody(
      { headline: "Backend engineer", summary: "Ten years of platform work." },
      sampleLibrary().items,
    );
    expect(body).toBe(`Backend engineer\n\nTen years of platform work.\n\n${SAMPLE_MARKDOWN}`);
  });

  it("puts sections in kind order whatever the item order", () => {
    const body = renderCareerBody({ headline: "H", summary: "S" }, [
      item("language", { title: "English" }),
      item("experience", { title: "Dev" }),
    ]);
    expect(body.match(/^## .*$/gm)).toEqual(["## Experience", "## Languages"]);
  });

  it("leaves out an empty headline or summary", () => {
    const items = [item("honour", { title: "Award" })];
    expect(renderCareerBody({ headline: "", summary: "" }, items)).toBe("## Honours\n\n### Award");
    expect(renderCareerBody({ headline: "H", summary: "" }, items)).toBe(
      "H\n\n## Honours\n\n### Award",
    );
    expect(renderCareerBody({ headline: "H", summary: "S" }, [])).toBe("H\n\nS");
  });

  it("adds the id after each title when ids are given", () => {
    const first = item("experience", { title: "A", organisation: "O" });
    const second = item("education", { title: "B", organisation: "U" });
    const ids = new Map([
      [first.id, "c1"],
      [second.id, "c2"],
    ]);
    const body = renderCareerBody({ headline: "H", summary: "S" }, [first, second], { ids });
    expect(body).toBe(
      "H\n\nS\n\n## Experience\n\n### A [c1]\n*O · 2020*\n\n## Education\n\n### B [c2]\n*U*",
    );
  });
});
