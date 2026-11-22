import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import { setSessionCookie, signSession } from "../security/session.js";
import { CHAT_PAGE_JS } from "./chat-page-script.js";
import { Layout } from "./layout.js";

const CSS = `
#log { border: 1px solid #ddd; background: #fff; padding: 0.75rem 1rem; min-height: 8rem; }
.msg { white-space: pre-wrap; margin: 0.5rem 0; }
.msg.user { font-weight: 600; }
#question { width: 100%; box-sizing: border-box; }
`;

const ChatPage: FC<{ basePath: string; token: string }> = ({ basePath, token }) => (
  <Layout title="Recruiter chat" basePath={basePath}>
    <style>{CSS}</style>
    <script src={`${basePath}/admin/chat/page.js`} defer />
    <div id="chat-page" data-base={basePath} data-token={token}>
      <h1>
        Recruiter chat <small id="who" />
      </h1>
      <p>
        Internal test page. Questions count against the link quota. Remaining:{" "}
        <strong id="remaining">-</strong>
      </p>
      <p id="status" role="status" />
      <div id="log" aria-live="polite" />
      <form id="ask">
        <p>
          <label for="question">Question</label>
          <textarea id="question" name="question" rows={3} required />
        </p>
        <button type="submit" id="send">
          Send
        </button>
      </form>
    </div>
  </Layout>
);

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
  return c.html(<ChatPage basePath={c.var.config.basePath} token={token} />);
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
