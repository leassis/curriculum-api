import { Hono } from "hono";
import { raw } from "hono/html";
import type { Env } from "../../env.js";
import { renderMarkdown } from "../../lib/markdown.js";
import { LlmUnavailableError } from "../../services/errors.js";
import type { Resume } from "../../services/resume.service.js";
import { ErrorFragment } from "../error-fragment.js";
import { EDITOR_JS } from "./script.js";
import { Editor, EditorPage, ResumesPage } from "./view.js";

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Mounted at `/admin`. */
export const resumesRouter = new Hono<Env>();

resumesRouter.get("/resumes", async (c) =>
  c.html(
    ResumesPage({ basePath: c.var.config.basePath, resumes: await c.var.services.resumes.list() }),
  ),
);

resumesRouter.post("/resumes", async (c) => {
  const body = await c.req.parseBody();
  const resume = await c.var.services.resumes.create({
    title: text(body.title),
    company: text(body.company),
    jobDescription: text(body.jobDescription),
  });
  return c.redirect(`${c.var.config.basePath}/admin/resumes/${resume.id}`, 303);
});

resumesRouter.delete("/resumes/:id", async (c) => {
  await c.var.services.resumes.delete(c.req.param("id"));
  return c.body(null, 200);
});

resumesRouter.get("/resumes/editor.js", (c) =>
  c.body(EDITOR_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

async function editor(c: { var: Env["Variables"] }, resume: Resume) {
  return {
    basePath: c.var.config.basePath,
    resume,
    options: await c.var.services.resumes.headerOptions(),
  };
}

resumesRouter.get("/resumes/:id", async (c) => {
  const resume = await c.var.services.resumes.get(c.req.param("id"));
  return c.html(EditorPage(await editor(c, resume)));
});

resumesRouter.post("/resumes/:id/generate", async (c) => {
  try {
    const resume = await c.var.services.resumes.generate(c.req.param("id"));
    return c.html(Editor(await editor(c, resume)));
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return c.html(ErrorFragment({ message: "Generation failed, try again" }), 502);
    }
    throw error;
  }
});

resumesRouter.post("/resumes/:id/preview", async (c) => {
  await c.var.services.resumes.get(c.req.param("id"));
  const body = await c.req.parseBody();
  return c.html(raw(renderMarkdown(text(body.content))));
});

resumesRouter.put("/resumes/:id", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const fields = body.headerFields;
  const keys = (Array.isArray(fields) ? fields : [fields]).filter(
    (k): k is string => typeof k === "string",
  );
  const content = Array.isArray(body.content) ? text(body.content[0]) : text(body.content);
  await c.var.services.resumes.save(c.req.param("id"), content, keys);
  return c.html("Saved");
});
