/** Longest Short Job Description, in code points. Also the Recruiter Chat's Job Description limit. */
export const SHORT_JD_MAX_CHARS = 2000;

/** Code-owned instruction for the `job_description_short` output field; appended to the tailor system prompt. */
export const SHORT_JD_RULES = `## Short Job Description rules

Return job_description_short: the job description cut down to what a recruiter chat needs.

Keep:
- the role and seniority;
- the company and its area;
- the location, remote policy and time zone;
- the required qualifications, one atomic requirement per bullet;
- the nice-to-haves, in a separate section;
- the main responsibilities, short.

Drop:
- company marketing and mission statements;
- benefits and perks;
- equal-opportunity, EEO and diversity statements;
- application instructions;
- repetition;
- contact details;
- people's names;
- URLs.

Format: plain text in short sections with "- " bullets, no markdown headings. Write it in the same language as the job description. Aim for 1500 to 2000 characters and never exceed ${SHORT_JD_MAX_CHARS} characters.`;

const SENTENCE_END = /[.!?]/;
const CLOSER = /["')\]”’»]/;

/**
 * True when the text up to `end` ends a sentence: a ".", "!" or "?" with optional closing quotes or
 * brackets after it, followed by whitespace or the end of the text. So "3.5" is not a boundary.
 */
function endsSentence(points: string[], end: number): boolean {
  const after = points[end];
  if (after !== undefined && !/\s/.test(after)) return false;
  let i = end - 1;
  while (i >= 0 && CLOSER.test(points[i] as string)) i--;
  return i >= 0 && SENTENCE_END.test(points[i] as string);
}

/**
 * Normalises the model's short: trims it, turns a blank into null and cuts one over the cap at the
 * last line break or sentence end at or before code point 2000, else at 2000. Counts code points.
 */
export function shortJobDescription(raw: string): string | null {
  const text = raw.trim();
  if (text === "") return null;
  const points = Array.from(text);
  if (points.length <= SHORT_JD_MAX_CHARS) return text;

  let cut = SHORT_JD_MAX_CHARS;
  for (let end = SHORT_JD_MAX_CHARS; end > 0; end--) {
    if (points[end] === "\n" || endsSentence(points, end)) {
      cut = end;
      break;
    }
  }
  const result = points.slice(0, cut).join("").trimEnd();
  return result === "" ? null : result;
}
