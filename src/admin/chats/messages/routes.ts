import { Hono } from "hono";
import type { Env } from "../../../env.js";
import { MessagesPage } from "./view.js";

/** Mounted at `/admin`. */
export const messagesRouter = new Hono<Env>();

messagesRouter.get("/chats/:id/messages", async (c) =>
  c.html(
    MessagesPage({
      basePath: c.var.config.basePath,
      faviconUrl: c.var.config.faviconUrl,
      transcript: await c.var.services.recruiterChat.transcript(c.req.param("id")),
    }),
  ),
);
