import { z } from "zod";
import { ConfigError } from "./services/errors.js";

export interface CurriculumApiConfig {
  databaseUrl: string;
  openrouterApiKey: string;
  /** At least 32 bytes, used for JWT signing. */
  sessionSecret: string;
  turnstileSecret: string;
  /** bcrypt hash of the admin password. */
  adminPasswordHash: string;
  /** Salt for hashing IPs (privacy). */
  ipHashSalt: string;
  /** 32 bytes, base64: AES-256-GCM key for personal info values at rest. */
  piiEncryptionKey: string;
  /** Default "": routes at /api/* and /admin/*. */
  basePath?: string;
  /** Default true; false for local http development. */
  secureCookies?: boolean;
  /** OpenRouter model IDs; the settings table overrides them. */
  models?: { public?: string; tailor?: string; recruiter?: string; import?: string };
  limits?: Partial<Limits>;
}

export interface Limits {
  publicQuestionsPerIpPerDay: number;
  recruiterQuestionsDefault: number;
  publicMaxOutputTokens: number;
  recruiterMaxOutputTokens: number;
  maxQuestionChars: number;
  maxHistoryMessages: number;
  sessionTtlMinutes: number;
}

export type LimitName = keyof Limits;

export interface ResolvedConfig {
  databaseUrl: string;
  openrouterApiKey: string;
  sessionSecret: string;
  turnstileSecret: string;
  adminPasswordHash: string;
  ipHashSalt: string;
  piiEncryptionKey: string;
  basePath: string;
  secureCookies: boolean;
  models: { public?: string; tailor?: string; recruiter?: string; import?: string };
  limits: Limits;
}

export const DEFAULT_LIMITS: Limits = {
  publicQuestionsPerIpPerDay: 5,
  recruiterQuestionsDefault: 10,
  publicMaxOutputTokens: 500,
  recruiterMaxOutputTokens: 1200,
  maxQuestionChars: 1000,
  maxHistoryMessages: 10,
  sessionTtlMinutes: 120,
};

const required = (name: string) =>
  z.string({ error: `${name} is required` }).min(1, `${name} is required`);
const limit = z.number().int().positive().optional();

const schema = z.object({
  databaseUrl: required("databaseUrl"),
  openrouterApiKey: required("openrouterApiKey"),
  sessionSecret: required("sessionSecret").refine(
    (v) => new TextEncoder().encode(v).length >= 32,
    "sessionSecret must be at least 32 bytes",
  ),
  turnstileSecret: required("turnstileSecret"),
  adminPasswordHash: required("adminPasswordHash"),
  ipHashSalt: required("ipHashSalt"),
  piiEncryptionKey: required("piiEncryptionKey").refine((v) => {
    try {
      return (
        Buffer.from(v, "base64").length === 32 && Buffer.from(v, "base64").toString("base64") === v
      );
    } catch {
      return false;
    }
  }, "piiEncryptionKey must be base64 of exactly 32 bytes"),
  basePath: z.string().optional(),
  secureCookies: z.boolean().optional(),
  models: z
    .object({
      public: z.string().optional(),
      tailor: z.string().optional(),
      recruiter: z.string().optional(),
      import: z.string().optional(),
    })
    .optional(),
  limits: z
    .object({
      publicQuestionsPerIpPerDay: limit,
      recruiterQuestionsDefault: limit,
      publicMaxOutputTokens: limit,
      recruiterMaxOutputTokens: limit,
      maxQuestionChars: limit,
      maxHistoryMessages: limit,
      sessionTtlMinutes: limit,
    })
    .optional(),
});

/** Validates the config and applies defaults; throws a ConfigError naming every invalid field. */
export function resolveConfig(input: CurriculumApiConfig): ResolvedConfig {
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".") || "config"))];
    throw new ConfigError(fields);
  }
  const c = parsed.data;
  const limits = { ...DEFAULT_LIMITS };
  for (const [name, value] of Object.entries(c.limits ?? {})) {
    if (value !== undefined) limits[name as LimitName] = value;
  }
  return {
    databaseUrl: c.databaseUrl,
    openrouterApiKey: c.openrouterApiKey,
    sessionSecret: c.sessionSecret,
    turnstileSecret: c.turnstileSecret,
    adminPasswordHash: c.adminPasswordHash,
    ipHashSalt: c.ipHashSalt,
    piiEncryptionKey: c.piiEncryptionKey,
    basePath: c.basePath ?? "",
    secureCookies: c.secureCookies ?? true,
    models: { ...c.models },
    limits,
  };
}
