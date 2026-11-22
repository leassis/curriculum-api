import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import type { Env } from "../env.js";
import { requireSession } from "../middleware/require-session.js";
import { clientIp, hashIp } from "../security/ip.js";
import { setSessionCookie, signSession } from "../security/session.js";
import { verifyTurnstile } from "../security/turnstile.js";
import { CaptchaFailedError, ValidationError } from "../services/errors.js";

/** Mounted at `/api/public`. */
export const publicRouter = new OpenAPIHono<Env>();

const chatBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

const sessionBody = z.object({ turnstileToken: z.string() });

/** Parses a JSON body; anything unreadable or off-schema is a 400 validation_error. */
async function parseJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const raw: unknown = await req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ValidationError("Invalid request body");
  return parsed.data;
}

publicRouter.post("/session", async (c) => {
  const { turnstileToken } = await parseJson(c.req.raw, sessionBody);
  const { config } = c.var;
  const ok = await verifyTurnstile(
    turnstileToken,
    clientIp(c.req.raw.headers),
    config.turnstileSecret,
  );
  if (!ok) throw new CaptchaFailedError();
  const ttl = config.limits.sessionTtlMinutes * 60;
  setSessionCookie(c, await signSession({ scope: "public" }, config.sessionSecret, ttl), config);
  return c.body(null, 204);
});

publicRouter.get("/profile", async (c) => {
  const { profile, personalInfo } = c.var.services;
  const { fullName, headline } = await profile.get();
  const contact = await personalInfo.contactFor("public");
  c.header("Cache-Control", "no-store");
  return c.json({ fullName, headline, contact });
});

publicRouter.post("/chat", requireSession("public"), async (c) => {
  const { config, services } = c.var;
  const { messages } = await parseJson(c.req.raw, chatBody);
  const [maxHistory, maxChars] = await Promise.all([
    services.settings.limit("maxHistoryMessages"),
    services.settings.limit("maxQuestionChars"),
  ]);
  const last = messages.at(-1);
  if (
    messages.length < 1 ||
    messages.length > maxHistory ||
    last?.role !== "user" ||
    last.content === "" ||
    [...last.content].length > maxChars
  ) {
    throw new ValidationError("Invalid request body");
  }
  const ipHash = await hashIp(clientIp(c.req.raw.headers) ?? "unknown", config.ipHashSalt);
  const { stream, remaining } = await services.publicChat.ask(ipHash, messages);
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Remaining": String(remaining),
    },
  });
});
