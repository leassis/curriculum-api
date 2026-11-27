import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../env.js";
import type { ResumeContext } from "../../repositories/recruiter-chat.repository.js";
import { NotFoundError, ValidationError } from "../../services/errors.js";
import { CHATS_JS } from "../static/chats-js.generated.js";
import { decideAutofill } from "./autofill.js";
import { AutofillFragment, ChatRow, ChatsPage, Created, type FieldNotice, Rows } from "./view.js";

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
      faviconUrl: config.faviconUrl,
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

/**
 * Answers a Resume pick in the New chat form with the two fields, the values last autofilled and a
 * notice under each, as out-of-band swaps. "Master CV" (no id) leaves the fields alone; "Replace"
 * sends `replace=<field>` to overwrite the Owner's text in that field.
 */
chatsRouter.post("/chats/autofill", async (c) => {
  const body = await c.req.parseBody();
  const current = {
    jobDescriptionShort: text(body.jobDescriptionShort),
    company: text(body.company),
  };
  const last = {
    jobDescriptionShort: text(body.lastJobDescriptionShort),
    company: text(body.lastCompany),
  };
  const view = (
    fields: typeof current,
    lastFilled: typeof last,
    notices: { jobDescriptionNotice: FieldNotice | null; companyNotice: FieldNotice | null },
  ) =>
    c.html(
      AutofillFragment({
        basePath: c.var.config.basePath,
        jobDescriptionShort: fields.jobDescriptionShort,
        company: fields.company,
        lastJobDescriptionShort: lastFilled.jobDescriptionShort,
        lastCompany: lastFilled.company,
        ...notices,
      }),
    );
  const none = { jobDescriptionNotice: null, companyNotice: null };

  const id = text(body.tailoredResumeId).trim();
  if (id === "") return view(current, last, none);
  let context: ResumeContext;
  try {
    context = await c.var.services.recruiterChat.resumeContext(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return view(current, last, { ...none, jobDescriptionNotice: "not-found" });
    }
    throw error;
  }

  const replace = text(body.replace);
  const jd = decideAutofill({
    field: "jobDescriptionShort",
    current: current.jobDescriptionShort,
    lastFilled: last.jobDescriptionShort,
    source: context.jobDescriptionShort,
    replace: replace === "jobDescriptionShort",
  });
  const company = decideAutofill({
    field: "company",
    current: current.company,
    lastFilled: last.company,
    source: context.company,
    replace: replace === "company",
  });
  return view(
    { jobDescriptionShort: jd.value, company: company.value },
    { jobDescriptionShort: jd.lastFilled, company: company.lastFilled },
    { jobDescriptionNotice: jd.notice, companyNotice: company.notice },
  );
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
