export interface PiiField {
  key: string;
  label: string;
  value: string;
}

export interface PiiMatch {
  key: string;
  label: string;
}

const MIN_LENGTH = 3;
const PHONE_MIN_DIGITS = 7;
/** A run of digits and phone punctuation, collapsed to its digits when compared. */
const DIGIT_RUN = /[\d\s+\-().]+/g;

type Matcher = (text: string) => boolean;

const digitsOf = (s: string) => s.replace(/\D/g, "");
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function kindOf(value: string): "phone" | "email" | "text" {
  if (digitsOf(value).length >= PHONE_MIN_DIGITS && /^[\d\s+\-().]+$/.test(value)) return "phone";
  if (value.includes("@")) return "email";
  return "text";
}

function matcherFor(field: PiiField): Matcher | null {
  const value = field.value.trim();
  if (value.length < MIN_LENGTH) return null;
  const kind = kindOf(value);
  if (kind === "phone") {
    const digits = digitsOf(value);
    return (text) => (text.match(DIGIT_RUN) ?? []).some((run) => digitsOf(run).includes(digits));
  }
  const needle = value.toLowerCase();
  return (text) => text.toLowerCase().includes(needle);
}

/** Fields whose value appears in `text`. Reports key and label, never the value. */
export function findPii(text: string, fields: PiiField[]): PiiMatch[] {
  const matches: PiiMatch[] = [];
  for (const field of fields) {
    const matcher = matcherFor(field);
    if (matcher?.(text)) matches.push({ key: field.key, label: field.label });
  }
  return matches;
}

/** Replaces every occurrence of a field value with `[redacted]`. */
export function redactPii(text: string, fields: PiiField[]): string {
  let out = text;
  for (const field of fields) {
    const value = field.value.trim();
    if (value.length < MIN_LENGTH) continue;
    if (kindOf(value) === "phone") {
      const digits = digitsOf(value);
      out = out.replace(DIGIT_RUN, (run) => (digitsOf(run).includes(digits) ? "[redacted]" : run));
    } else {
      out = out.replace(new RegExp(escapeRegExp(value), "gi"), "[redacted]");
    }
  }
  return out;
}
