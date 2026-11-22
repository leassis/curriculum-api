import { Hono } from "hono";
import type { Env } from "../../env.js";
import { setSessionCookie, signSession } from "../../security/session.js";
import { CHAT_PAGE_JS } from "../static/chat-page-js.generated.js";
import { ChatPage } from "./view.js";

/** Mounted at `/admin`. An internal chat page for the Owner, behind the admin session. */
export const chatPageRouter = new Hono<Env>();

chatPageRouter.use("/chat/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex");
  await next();
});

chatPageRouter.get("/chat/page.js", (c) =>
  c.body(CHAT_PAGE_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

chatPageRouter.get("/chat/:token", async (c) => {
  const token = c.req.param("token");
  await c.var.services.recruiterChat.byToken(token);
  return c.html(ChatPage({ basePath: c.var.config.basePath, token }));
});

/**
 * Issues the recruiter session for the page. The admin session (checked by `requireAdmin`) stands
 * in for Turnstile; quota, revocation and expiry still apply on `/api/r/:token/chat`.
 */
chatPageRouter.post("/chat/:token/session", async (c) => {
  const { config, services } = c.var;
  const chat = await services.recruiterChat.requireActive(c.req.param("token"));
  const ttl = config.limits.sessionTtlMinutes * 60;
  setSessionCookie(
    c,
    await signSession({ scope: "recruiter", cid: chat.id }, config.sessionSecret, ttl),
    config,
  );
  return c.body(null, 204);
});
