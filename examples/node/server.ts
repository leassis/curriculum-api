import { serve } from "@hono/node-server";
import { createApp } from "../../src/app.js";
import type { CurriculumApiConfig } from "../../src/config.js";

export const PORT = 3001;

/** Builds the app config from environment variables (see `.env.example`). */
export function serverOptions(
  env: Record<string, string | undefined>,
): CurriculumApiConfig & { port: number } {
  const models = {
    public: env.MODEL_PUBLIC || undefined,
    tailor: env.MODEL_TAILOR || undefined,
    recruiter: env.MODEL_RECRUITER || undefined,
    import: env.MODEL_IMPORT || undefined,
  };
  const temperature = (value: string | undefined) => (value ? Number(value) : undefined);
  const temperatures = {
    public: temperature(env.TEMPERATURE_PUBLIC),
    tailor: temperature(env.TEMPERATURE_TAILOR),
    recruiter: temperature(env.TEMPERATURE_RECRUITER),
    import: temperature(env.TEMPERATURE_IMPORT),
  };
  return {
    port: PORT,
    databaseUrl: env.DATABASE_URL ?? "",
    openrouterApiKey: env.OPENROUTER_API_KEY ?? "",
    sessionSecret: env.SESSION_SECRET ?? "",
    turnstileSecret: env.TURNSTILE_SECRET ?? "",
    adminPasswordHash: env.ADMIN_PASSWORD_HASH ?? "",
    ipHashSalt: env.IP_HASH_SALT ?? "",
    piiEncryptionKey: env.PII_ENCRYPTION_KEY ?? "",
    secureCookies: false,
    models,
    temperatures,
  };
}

export function start(env: Record<string, string | undefined> = process.env): void {
  const { port, ...config } = serverOptions(env);
  serve({ fetch: createApp(config).fetch, port }, (info) => {
    console.log(`curriculum-api listening on http://localhost:${info.port}`);
  });
}

if (process.argv[1]?.endsWith("server.ts")) start();
