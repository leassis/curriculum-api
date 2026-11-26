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
  /**
   * Same-origin path of the admin pages' favicon, e.g. "/favicon.svg" (the admin CSP blocks
   * other origins). Unset: no icon link is added.
   */
  faviconUrl?: string;
  /** OpenRouter model IDs; the settings table overrides them. */
  models?: { public?: string; tailor?: string; recruiter?: string; import?: string };
  limits?: Partial<Limits>;
  /** Sampling temperature per area, 0..2; the settings table overrides them. */
  temperatures?: Partial<Temperatures>;
}

export interface Temperatures {
  public: number;
  tailor: number;
  recruiter: number;
  import: number;
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
  faviconUrl?: string;
  models: { public?: string; tailor?: string; recruiter?: string; import?: string };
  limits: Limits;
  temperatures: Temperatures;
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

export const DEFAULT_TEMPERATURES: Temperatures = {
  public: 0.4,
  recruiter: 0.3,
  tailor: 0.1,
  import: 0.1,
};

const required = (name: string) =>
  z.string({ error: `${name} is required` }).min(1, `${name} is required`);
const limit = z.number().int().positive().optional();
const temperature = z.number().min(0).max(2).optional();

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
  faviconUrl: z
    .string()
    .regex(/^\/(?![/\\])\S*$/, "faviconUrl must be a same-origin path starting with /")
    .optional(),
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
  temperatures: z
    .object({
      public: temperature,
      tailor: temperature,
      recruiter: temperature,
      import: temperature,
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
  const temperatures = { ...DEFAULT_TEMPERATURES };
  for (const [area, value] of Object.entries(c.temperatures ?? {})) {
    if (value !== undefined) temperatures[area as keyof Temperatures] = value;
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
    faviconUrl: c.faviconUrl,
    models: { ...c.models },
    limits,
    temperatures,
  };
}
