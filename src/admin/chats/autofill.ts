export type AutofillField = "jobDescriptionShort" | "company";
export type AutofillNotice = "kept" | "no-source";

export interface AutofillInput {
  field: AutofillField;
  /** What the form field holds now. */
  current: string;
  /** What the last autofill put in the field; "" when none did. */
  lastFilled: string;
  /** The chosen resume's value; null when it has none. */
  source: string | null;
  /** The Owner pressed "Replace" for this field. */
  replace: boolean;
}

export interface AutofillDecision {
  value: string;
  lastFilled: string;
  notice: AutofillNotice | null;
}

/** Browsers post a textarea's line breaks as CRLF; compare them as LF. */
const lf = (value: string) => value.replace(/\r\n/g, "\n");

/**
 * Decides what the New chat form does with one field when a Tailored Resume is picked: fill it
 * when it is empty or still holds the last autofilled value (or the Owner asked to replace it),
 * otherwise keep the Owner's text and say so. A resume without a value never changes the field;
 * only the Job Description tells the Owner about it.
 */
export function decideAutofill(input: AutofillInput): AutofillDecision {
  const { field, current, lastFilled, source, replace } = input;
  if (source === null) {
    return {
      value: current,
      lastFilled,
      notice: field === "jobDescriptionShort" ? "no-source" : null,
    };
  }
  const own = current.trim() !== "" && lf(current) !== lf(lastFilled);
  if (own && !replace) return { value: current, lastFilled, notice: "kept" };
  return { value: source, lastFilled: source, notice: null };
}
