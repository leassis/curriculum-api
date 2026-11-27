import { describe, expect, it } from "vitest";
import { type AutofillInput, decideAutofill } from "../../../src/admin/chats/autofill";

const base: AutofillInput = {
  field: "jobDescriptionShort",
  current: "",
  lastFilled: "",
  source: "- From the resume",
  replace: false,
};
const decide = (patch: Partial<AutofillInput>) => decideAutofill({ ...base, ...patch });

describe("decideAutofill", () => {
  it("covers fill, keep, replace and no source", () => {
    // empty field: fill
    expect(decide({})).toEqual({
      value: "- From the resume",
      lastFilled: "- From the resume",
      notice: null,
    });
    // field still holds the last autofilled value: replace it with the new source
    expect(decide({ current: "- Old resume", lastFilled: "- Old resume" })).toEqual({
      value: "- From the resume",
      lastFilled: "- From the resume",
      notice: null,
    });
    // field holds the Owner's text: keep it, say so, remember the last autofill
    expect(decide({ current: "My own text", lastFilled: "- Old resume" })).toEqual({
      value: "My own text",
      lastFilled: "- Old resume",
      notice: "kept",
    });
    // Replace pressed: the source wins over the Owner's text
    expect(decide({ current: "My own text", lastFilled: "- Old resume", replace: true })).toEqual({
      value: "- From the resume",
      lastFilled: "- From the resume",
      notice: null,
    });
    // resume without a value: keep the field; the Job Description says why
    expect(decide({ current: "My own text", lastFilled: "- Old", source: null })).toEqual({
      value: "My own text",
      lastFilled: "- Old",
      notice: "no-source",
    });
    expect(decide({ source: null, replace: true })).toEqual({
      value: "",
      lastFilled: "",
      notice: "no-source",
    });
    // Company: a resume without one changes nothing and says nothing
    expect(decide({ field: "company", current: "Mine", lastFilled: "Old", source: null })).toEqual({
      value: "Mine",
      lastFilled: "Old",
      notice: null,
    });
  });

  it("treats a whitespace-only field as empty", () => {
    expect(decide({ current: " \n\t ", lastFilled: "- Old resume" })).toEqual({
      value: "- From the resume",
      lastFilled: "- From the resume",
      notice: null,
    });
  });

  it("compares the autofilled value across CRLF line breaks", () => {
    const filled = "- One\n- Two";
    expect(decide({ current: "- One\r\n- Two", lastFilled: filled }).notice).toBeNull();
    expect(decide({ current: "- One\r\n- Two!", lastFilled: filled }).notice).toBe("kept");
  });
});
