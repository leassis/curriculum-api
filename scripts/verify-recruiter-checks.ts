import { DECLINE_ANSWER } from "../src/llm/default-prompts.js";
import { fixture as tailorFixture } from "./verify-tailor-checks.js";

/**
 * Live check of the recruiter prompt: the Career Library and job description of the tailor
 * fixture (TypeScript and PostgreSQL are in the CV, Terraform is not), and three recruiter
 * questions. Keyword checks, so a FAIL is a prompt to read the answer, not proof on its own.
 */
export interface RecruiterFixture {
  library: ReturnType<typeof tailorFixture>["library"];
  jobDescription: string;
  /** Job requirements the CV evidences. */
  matchedSkills: string[];
  /** The job requirement the CV does not evidence. */
  absentSkill: string;
  /** CV facts an answer can point to as related experience. */
  cvFacts: string[];
  questions: { fit: string; fitPt: string; absent: string };
}

export function fixture(): RecruiterFixture {
  const tailor = tailorFixture();
  return {
    library: tailor.library,
    jobDescription: tailor.jobDescription,
    matchedSkills: ["TypeScript", "PostgreSQL"],
    absentSkill: tailor.absentSkill,
    cvFacts: ["TypeScript", "PostgreSQL", "Northwind", "billing", "order", "event-driven"],
    questions: {
      fit: "How does the candidate fit this role?",
      fitPt: "O candidato tem o perfil para esta vaga?",
      absent: `Has the candidate worked with ${tailor.absentSkill}?`,
    },
  };
}

export interface Answers {
  fit: string;
  fitPt: string;
  absent: string;
}

export interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

/** Phrases that point out a gap or state what the candidate lacks, in English and Portuguese. */
const GAP =
  /does not (?:mention|cover|show|state|include|list)|doesn't (?:mention|cover|show)|not (?:mentioned|covered|listed)|no (?:mention|evidence|experience)|lacks?\b|missing|gap|não (?:menciona|cobre|mostra|cita|há|tem experiência)|sem experiência|falta|lacuna/i;
/** Statements that the candidate cannot do something, beyond what the CV says. */
const NEGATIVE_CLAIM =
  /no experience|has not (?:used|worked)|hasn't (?:used|worked)|has never|lacks?\b|does(?: not|n't) know|not familiar|unfamiliar|não sabe|não conhece|nunca (?:usou|trabalhou)/i;
/** The honest answer to a direct question about something the CV does not state. */
const NOT_DETAILED =
  /(?:does not|doesn't|do not|don't) (?:detail|mention|specify|state|include)|not (?:detailed|mentioned|specified|stated)|não (?:detalha|menciona|especifica)/i;
/** A claim that the candidate has the absent skill. */
function claims(answer: string, skill: string): boolean {
  const s = skill.toLowerCase();
  return new RegExp(
    `(?:has|have|with|using|used|uses|knows?|experienced in|experience (?:with|in))\\s+(?:\\w+\\s+){0,3}${s}`,
    "i",
  ).test(withoutNotDetailed(answer));
}

/** The answer minus its sentences that say the CV does not detail something. */
function withoutNotDetailed(answer: string): string {
  return answer
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !NOT_DETAILED.test(sentence))
    .join(" ")
    .toLowerCase();
}

function mentions(answer: string, words: string[]): string[] {
  const text = answer.toLowerCase();
  return words.filter((w) => text.includes(w.toLowerCase()));
}

function quote(text: string, match: RegExpMatchArray | null): string {
  if (!match || match.index === undefined) return "";
  const start = Math.max(0, match.index - 40);
  return `"…${text.slice(start, match.index + match[0].length + 40).replace(/\s+/g, " ")}…"`;
}

export function runChecks(answers: Answers, fix: RecruiterFixture): CheckResult[] {
  const declined = Object.entries(answers)
    .filter(([, a]) => a.includes(DECLINE_ANSWER))
    .map(([k]) => k);
  const absent = fix.absentSkill.toLowerCase();
  const fitMatches = mentions(answers.fit, fix.matchedSkills);
  const fitPtMatches = mentions(answers.fitPt, fix.matchedSkills);
  const fitGap = answers.fit.match(GAP);
  const fitPtGap = answers.fitPt.match(GAP);
  const related = mentions(answers.absent, fix.cvFacts);
  const negative = answers.absent.match(NEGATIVE_CLAIM);
  return [
    {
      name: "no question is declined",
      pass: declined.length === 0,
      detail: declined.length ? `declined: ${declined.join(", ")}` : "",
    },
    {
      name: "fit answer leads with the matching skills",
      pass: fitMatches.length === fix.matchedSkills.length,
      detail: `mentions ${JSON.stringify(fitMatches)}`,
    },
    {
      name: "fit answer does not bring up the absent skill",
      pass: !answers.fit.toLowerCase().includes(absent),
      detail: answers.fit.toLowerCase().includes(absent) ? `"${fix.absentSkill}" is mentioned` : "",
    },
    {
      name: "fit answer points out no gap",
      pass: fitGap === null,
      detail: quote(answers.fit, fitGap),
    },
    {
      name: "Portuguese fit answer matches and points out no gap",
      pass:
        fitPtMatches.length === fix.matchedSkills.length &&
        fitPtGap === null &&
        !answers.fitPt.toLowerCase().includes(absent),
      detail: `mentions ${JSON.stringify(fitPtMatches)}${fitPtGap ? `, gap ${quote(answers.fitPt, fitPtGap)}` : ""}`,
    },
    {
      name: "absent-skill answer never claims it",
      pass: !claims(answers.absent, fix.absentSkill),
      detail: claims(answers.absent, fix.absentSkill) ? `claims ${fix.absentSkill}` : "",
    },
    {
      name: "absent-skill answer says the CV does not detail it, without a negative claim",
      pass: NOT_DETAILED.test(answers.absent) && negative === null,
      detail: negative
        ? quote(answers.absent, negative)
        : NOT_DETAILED.test(answers.absent)
          ? ""
          : "no 'the CV does not detail it'",
    },
    {
      name: "absent-skill answer points to related CV experience",
      pass: related.length > 0,
      detail: `mentions ${JSON.stringify(related)}`,
    },
  ];
}

export function formatResults(results: CheckResult[]): string[] {
  return results.map(
    (r) => `${r.pass ? "PASS" : "FAIL"} ${r.name}${r.detail ? `: ${r.detail}` : ""}`,
  );
}

export function exitCode(results: CheckResult[]): 0 | 1 {
  return results.every((r) => r.pass) ? 0 : 1;
}
