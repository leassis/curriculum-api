import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../env.js";
import { ValidationError } from "../../services/errors.js";
import { CHATS_JS } from "../static/chats-js.generated.js";
import { ChatRow, ChatsPage, Created, Rows } from "./view.js";

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Mounted at `/admin`. */
export const chatsRouter = new Hono<Env>();

chatsRouter.get("/chats/chats.js", (c) =>
  c.body(CHATS_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

chatsRouter.get("/chats", async (c) => {
  const { config, services } = c.var;
  return c.html(
    ChatsPage({
      basePath: config.basePath,
      origin: new URL(c.req.url).origin,
      chats: await services.recruiterChat.list(),
      resumes: await services.recruiterChat.resumeOptions(),
      defaultMax: await services.settings.limit("recruiterQuestionsDefault"),
      counts: await services.adminAuth.dashboardCounts(),
    }),
  );
});

const testBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

/** Streams a test answer from the recruiter assistant; nothing is counted or stored. */
chatsRouter.post("/chats/test", async (c) => {
  const parsed = testBody.safeParse(await c.req.json().catch(() => undefined));
  if (!parsed.success) throw new ValidationError("Invalid request body");
  const stream = await c.var.services.recruiterChat.test(parsed.data.messages);
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
});

chatsRouter.get("/chats/rows", async (c) =>
  c.html(
    Rows({
      basePath: c.var.config.basePath,
      origin: new URL(c.req.url).origin,
      chats: await c.var.services.recruiterChat.list(),
    }),
  ),
);

chatsRouter.post("/chats", async (c) => {
  const body = await c.req.parseBody();
  const max = text(body.maxQuestions).trim();
  const chat = await c.var.services.recruiterChat.create({
    recruiterName: text(body.recruiterName),
    company: text(body.company),
    jobDescriptionShort: text(body.jobDescriptionShort),
    maxQuestions: max === "" ? undefined : Number(max),
    expiresAt: text(body.expiresAt),
    tailoredResumeId: text(body.tailoredResumeId),
  });
  c.header("HX-Trigger", "chats-changed");
  return c.html(
    Created({ basePath: c.var.config.basePath, origin: new URL(c.req.url).origin, chat }),
  );
});

chatsRouter.patch("/chats/:id/revoke", async (c) => {
  const chat = await c.var.services.recruiterChat.revoke(c.req.param("id"));
  return c.html(
    ChatRow({ basePath: c.var.config.basePath, origin: new URL(c.req.url).origin, chat }),
  );
});

chatsRouter.patch("/chats/:id/reset", async (c) => {
  const chat = await c.var.services.recruiterChat.reset(c.req.param("id"));
  return c.html(
    ChatRow({ basePath: c.var.config.basePath, origin: new URL(c.req.url).origin, chat }),
  );
});

chatsRouter.delete("/chats/:id", async (c) => {
  await c.var.services.recruiterChat.delete(c.req.param("id"));
  return c.body(null, 200);
});
