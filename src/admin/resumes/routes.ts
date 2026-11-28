import { type Context, Hono } from "hono";
import type { Env } from "../../env.js";
import { KINDS, type Kind } from "../../services/career/item.js";
import { leftOut } from "../../services/career/ops.js";
import { LlmUnavailableError, NotFoundError, ValidationError } from "../../services/errors.js";
import type { Resume } from "../../services/resume.service.js";
import { estimatePages } from "../../services/tailor/length.js";
import { bandFor } from "../../services/tailor/rubric.js";
import { cardsFrom, formFor } from "../career/model.js";
import type { FormView } from "../career/view.js";
import { ErrorFragment } from "../error-fragment.js";
import { EDITOR_JS } from "../static/resumes-js.generated.js";
import { Editor, EditorPage, ResumeCards, ResumesPage } from "./view.js";

const text = (value: unknown) => (typeof value === "string" ? value : "");
/** `undefined` when the field was not posted, so the stored value is kept. */
const optionalText = (value: unknown) => (typeof value === "string" ? value : undefined);
/** A posted number; an absent field stays undefined, a non-numeric one becomes NaN and is rejected. */
const optionalNumber = (value: unknown) => (typeof value === "string" ? Number(value) : undefined);

const CREATE_ERRORS: Record<string, string> = {
  generate: "Generation failed, try again",
  "empty-library": "Add Career Items to your profile before generating",
  "full-name": "Your full name is in the career library — it is added when printed",
};

const createError = (code: string | undefined): string | undefined =>
  code !== undefined && Object.hasOwn(CREATE_ERRORS, code) ? CREATE_ERRORS[code] : undefined;

const headerKeys = (fields: unknown): string[] =>
  (Array.isArray(fields) ? fields : [fields]).filter((k): k is string => typeof k === "string");

type Ctx = Context<Env>;
type Fields = Record<string, string>;

/** Mounted at `/admin`. */
export const resumesRouter = new Hono<Env>();

resumesRouter.get("/resumes", async (c) =>
  c.html(
    ResumesPage({
      basePath: c.var.config.basePath,
      faviconUrl: c.var.config.faviconUrl,
      resumes: (await c.var.services.resumes.list()).map((resume) => ({
        ...resume,
        score: resume.assessment?.score ?? null,
      })),
      options: await c.var.services.resumes.headerOptions(),
    }),
  ),
);

resumesRouter.post("/resumes", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const first = (value: unknown) => text(Array.isArray(value) ? value[0] : value);
  const { resume, error } = await c.var.services.resumes.createAndGenerate({
    title: first(body.title),
    company: first(body.company),
    jobDescription: first(body.jobDescription),
    customInstructions: first(body.customInstructions),
    jobLink: first(body.jobLink),
    recruiterName: first(body.recruiterName),
    notes: first(body.notes),
    headerKeys: body.headerFieldsPosted === undefined ? undefined : headerKeys(body.headerFields),
  });
  const query = error ? `?error=${error}` : "";
  return c.redirect(`${c.var.config.basePath}/admin/resumes/${resume.id}${query}`, 303);
});

resumesRouter.delete("/resumes/:id", async (c) => {
  await c.var.services.resumes.delete(c.req.param("id"));
  return c.body(null, 200);
});

resumesRouter.get("/resumes/editor.js", (c) =>
  c.body(EDITOR_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

async function fullName(c: Ctx): Promise<string> {
  try {
    return (await c.var.services.profile.get()).fullName;
  } catch (error) {
    if (error instanceof NotFoundError) return "";
    throw error;
  }
}

async function editor(c: Ctx, resume: Resume) {
  const items = resume.document?.items ?? [];
  const library = (await c.var.services.career.library()).items;
  const estimate = resume.document
    ? estimatePages(resume.document, await c.var.services.settings.pageSize())
    : null;
  return {
    basePath: c.var.config.basePath,
    resume,
    fullName: await fullName(c),
    cards: cardsFrom(items, leftOut(library, items)),
    estimate,
    options: await c.var.services.resumes.headerOptions(),
    assessment: resume.assessment && {
      score: resume.assessment.score,
      band: bandFor(resume.assessment.score).label,
      rationale: resume.assessment.rationale,
      missingSkills: resume.assessment.missingSkills,
      omissions: resume.assessment.omissions,
    },
  };
}

interface Reopen {
  form?: FormView;
  headerError?: string;
  leftOutError?: string;
  /** The header values the Owner entered, shown again with the error. */
  header?: { headline: string; summary: string };
}

async function cardsFragment(c: Ctx, resume: Resume, reopen: Reopen = {}) {
  const { options: _options, ...props } = await editor(c, resume);
  const { header, ...extra } = reopen;
  const shown =
    resume.document && header ? { ...resume, document: { ...resume.document, ...header } } : resume;
  return ResumeCards({ ...props, resume: shown, ...extra });
}

resumesRouter.get("/resumes/:id", async (c) => {
  const resume = await c.var.services.resumes.get(c.req.param("id"));
  return c.html(
    EditorPage({
      ...(await editor(c, resume)),
      faviconUrl: c.var.config.faviconUrl,
      error: createError(c.req.query("error")),
    }),
  );
});

resumesRouter.post("/resumes/:id/generate", async (c) => {
  try {
    const body = await c.req.parseBody();
    const resume = await c.var.services.resumes.generate(
      c.req.param("id"),
      optionalText(body.customInstructions),
    );
    return c.html(Editor(await editor(c, resume)));
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return c.html(ErrorFragment({ message: "Generation failed, try again", toast: true }), 503);
    }
    throw error;
  }
});

resumesRouter.put("/resumes/:id", async (c) => {
  const body = await c.req.parseBody({ all: true });
  await c.var.services.resumes.updateOptions(
    c.req.param("id"),
    headerKeys(body.headerFields),
    optionalText(body.customInstructions),
    {
      jobLink: optionalText(body.jobLink),
      recruiterName: optionalText(body.recruiterName),
      notes: optionalText(body.notes),
      jobDescriptionShort: optionalText(body.jobDescriptionShort),
      company: optionalText(body.company),
      targetPages: optionalNumber(body.targetPages),
    },
  );
  return c.html("Saved");
});

function kindOf(value: unknown): Kind {
  const found = KINDS.find((k) => k === value);
  if (!found) throw new ValidationError("Unknown kind");
  return found;
}

async function fields(c: Ctx): Promise<Fields> {
  const body = await c.req.parseBody();
  return Object.fromEntries(
    Object.entries(body).filter(([, v]) => typeof v === "string"),
  ) as Fields;
}

function findItem(resume: Resume, itemId: string) {
  const item = resume.document?.items.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError("Resume item not found");
  return item;
}

/** Runs a change and re-renders the cards; a rejected change answers 400 with the form kept open. */
async function change(c: Ctx, run: () => Promise<Resume>, reopen: (error: string) => Reopen) {
  const id = c.req.param("id") as string;
  try {
    return c.html(await cardsFragment(c, await run()));
  } catch (error) {
    if (error instanceof ValidationError) {
      const resume = await c.var.services.resumes.get(id);
      return c.html(await cardsFragment(c, resume, reopen(error.message)), 400);
    }
    throw error;
  }
}

resumesRouter.get("/resumes/:id/items", async (c) =>
  c.html(await cardsFragment(c, await c.var.services.resumes.get(c.req.param("id")))),
);

resumesRouter.get("/resumes/:id/items/new", async (c) => {
  const resume = await c.var.services.resumes.get(c.req.param("id"));
  return c.html(await cardsFragment(c, resume, { form: formFor(kindOf(c.req.query("kind"))) }));
});

resumesRouter.get("/resumes/:id/items/:itemId/edit", async (c) => {
  const resume = await c.var.services.resumes.get(c.req.param("id"));
  const item = findItem(resume, c.req.param("itemId"));
  return c.html(await cardsFragment(c, resume, { form: formFor(item.kind, { item }) }));
});

resumesRouter.post("/resumes/:id/items", async (c) => {
  const body = await fields(c);
  const kind = kindOf(body.kind);
  return change(
    c,
    () => c.var.services.resumes.addItem(c.req.param("id"), kind, body),
    (error) => ({ form: formFor(kind, { values: body, error }) }),
  );
});

resumesRouter.put("/resumes/:id/items/:itemId", async (c) => {
  const id = c.req.param("id");
  const itemId = c.req.param("itemId");
  const body = await fields(c);
  const item = findItem(await c.var.services.resumes.get(id), itemId);
  return change(
    c,
    () => c.var.services.resumes.editItem(id, itemId, body),
    (error) => ({ form: formFor(item.kind, { item, values: body, error }) }),
  );
});

resumesRouter.post("/resumes/:id/items/:itemId/move", async (c) => {
  const { direction } = await fields(c);
  if (direction !== "up" && direction !== "down") throw new ValidationError("Unknown direction");
  const resume = await c.var.services.resumes.moveItem(
    c.req.param("id"),
    c.req.param("itemId"),
    direction,
  );
  return c.html(await cardsFragment(c, resume));
});

resumesRouter.delete("/resumes/:id/items/:itemId", async (c) => {
  const resume = await c.var.services.resumes.removeItem(c.req.param("id"), c.req.param("itemId"));
  return c.html(await cardsFragment(c, resume));
});

resumesRouter.post("/resumes/:id/left-out/:libraryItemId", (c) =>
  change(
    c,
    () => c.var.services.resumes.addBack(c.req.param("id"), c.req.param("libraryItemId")),
    (leftOutError) => ({ leftOutError }),
  ),
);

resumesRouter.put("/resumes/:id/header", async (c) => {
  const { headline = "", summary = "" } = await fields(c);
  return change(
    c,
    () => c.var.services.resumes.editHeader(c.req.param("id"), { headline, summary }),
    (error) => ({ headerError: error, header: { headline, summary } }),
  );
});
