import type { Context } from "hono";
import { Hono } from "hono";
import type { Env } from "../../env.js";
import { findPii } from "../../llm/pii-guard.js";
import { KINDS, type Kind } from "../../services/career/item.js";
import { LlmUnavailableError, NotFoundError, ValidationError } from "../../services/errors.js";
import { cardsFrom, formFor } from "../career/model.js";
import type { FormView } from "../career/view.js";
import { CAREER_JS } from "../static/career-js.generated.js";
import {
  FIELDS,
  ImportForm,
  LibraryCards,
  MarkdownEditor,
  ProfileForm,
  ProfilePage,
  type Tab,
  type Values,
} from "./view.js";

const EMPTY: Values = {
  fullName: "",
  headline: "",
  summary: "",
  additionalInformation: "",
  lookingForwardNext: "",
  publicSystemPrompt: "",
  recruiterSystemPrompt: "",
  tailorSystemPrompt: "",
};

const PROFILE_TEXTS = [
  {
    name: "additionalInformation",
    label: "Additional information",
    in: "the additional information",
  },
  { name: "lookingForwardNext", label: "Looking forward next", in: "looking forward next" },
] as const;
const MAX_PROFILE_TEXT = 5000;

type Ctx = Context<Env>;
type Fields = Record<string, string>;

async function currentValues(c: Ctx): Promise<Values> {
  try {
    const p = await c.var.services.profile.get();
    return {
      fullName: p.fullName,
      headline: p.headline,
      summary: p.summary,
      additionalInformation: p.additionalInformation,
      lookingForwardNext: p.lookingForwardNext,
      publicSystemPrompt: p.publicSystemPrompt,
      recruiterSystemPrompt: p.recruiterSystemPrompt,
      tailorSystemPrompt: p.tailorSystemPrompt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) return { ...EMPTY };
    throw error;
  }
}

async function currentCards(c: Ctx) {
  return cardsFrom((await c.var.services.career.library()).items);
}

async function cardsFragment(c: Ctx, form?: FormView) {
  return LibraryCards({ basePath: c.var.config.basePath, cards: await currentCards(c), form });
}

function tabOf(value: unknown): Tab {
  return value === "ai" ? "ai" : "career";
}

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

async function findItem(c: Ctx, id: string) {
  const item = (await c.var.services.career.library()).items.find((i) => i.id === id);
  if (!item) throw new NotFoundError("Career item not found");
  return item;
}

/** Runs a change and re-renders the cards; a rejected change answers 400 with the form kept open. */
async function change(
  c: Ctx,
  run: () => Promise<unknown>,
  reopen: (error: string) => Promise<FormView>,
) {
  try {
    await run();
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.html(await cardsFragment(c, await reopen(error.message)), 400);
    }
    throw error;
  }
  return c.html(await cardsFragment(c));
}

/** Mounted at `/admin`. */
export const profileRouter = new Hono<Env>();

profileRouter.get("/profile", async (c) =>
  c.html(
    ProfilePage({
      basePath: c.var.config.basePath,
      faviconUrl: c.var.config.faviconUrl,
      values: await currentValues(c),
      cards: await currentCards(c),
      tab: tabOf(c.req.query("tab")),
      saved: c.req.query("saved") === "1",
    }),
  ),
);

profileRouter.get("/profile/career.js", (c) =>
  c.body(CAREER_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

profileRouter.post("/profile", async (c) => {
  const basePath = c.var.config.basePath;
  const body = await c.req.parseBody();
  // Each tab posts only its own fields; the rest keep their stored values.
  const values = await currentValues(c);
  for (const f of FIELDS) {
    const raw = body[f.name];
    if (typeof raw === "string") values[f.name] = raw;
  }
  const tab = tabOf(body.tab);
  const htmx = c.req.header("HX-Request") === "true";
  const reject = async (message: string, on: Tab = tab) =>
    htmx
      ? c.html(ProfileForm({ basePath, values, tab, error: message }), 400)
      : c.html(
          ProfilePage({
            basePath,
            faviconUrl: c.var.config.faviconUrl,
            values,
            cards: await currentCards(c),
            tab: on,
            error: message,
          }),
          400,
        );

  const missing = FIELDS.find((f) => f.required && values[f.name].trim() === "");
  if (missing) return reject(`${missing.label} is required`, missing.tab);

  for (const { name, label } of PROFILE_TEXTS) {
    values[name] = values[name].trim();
    if ([...values[name]].length > MAX_PROFILE_TEXT)
      return reject(`${label} is limited to ${MAX_PROFILE_TEXT} characters`, "career");
  }

  const found = findPii(
    [values.headline, values.summary, ...PROFILE_TEXTS.map((f) => values[f.name])].join("\n"),
    await c.var.services.personalInfo.allValues(),
  )[0];
  if (found)
    return reject(`Your ${found.label} is in the body — keep contact data in Personal info`);

  const fullName = values.fullName.trim().toLowerCase();
  const named = PROFILE_TEXTS.find(
    (f) => fullName !== "" && values[f.name].toLowerCase().includes(fullName),
  );
  if (named)
    return reject(
      `Your full name is in ${named.in} — the Candidate is never named in prompts`,
      "career",
    );

  try {
    await c.var.services.profile.update(values);
  } catch (error) {
    if (error instanceof ValidationError) return reject(error.message);
    throw error;
  }
  // htmx swaps just the form (with the "Saved" toast marker); a plain POST uses Post/Redirect/Get
  // so a refresh does not resubmit.
  if (htmx) return c.html(ProfileForm({ basePath, values, tab, saved: true }));
  return c.redirect(`${basePath}/admin/profile?tab=${tab}&saved=1`, 303);
});

profileRouter.get("/profile/items", async (c) => c.html(await cardsFragment(c)));

profileRouter.get("/profile/items/new", async (c) =>
  c.html(await cardsFragment(c, formFor(kindOf(c.req.query("kind"))))),
);

profileRouter.get("/profile/items/:id/edit", async (c) => {
  const item = await findItem(c, c.req.param("id"));
  return c.html(await cardsFragment(c, formFor(item.kind, { item })));
});

profileRouter.post("/profile/items", async (c) => {
  const body = await fields(c);
  const kind = kindOf(body.kind);
  return change(
    c,
    () => c.var.services.career.add(kind, body),
    async (error) => formFor(kind, { values: body, error }),
  );
});

profileRouter.put("/profile/items/:id", async (c) => {
  const id = c.req.param("id");
  const body = await fields(c);
  const item = await findItem(c, id);
  return change(
    c,
    () => c.var.services.career.edit(id, body),
    async (error) => formFor(item.kind, { item, values: body, error }),
  );
});

profileRouter.post("/profile/items/:id/move", async (c) => {
  const { direction } = await fields(c);
  if (direction !== "up" && direction !== "down") throw new ValidationError("Unknown direction");
  await c.var.services.career.move(c.req.param("id"), direction);
  return c.html(await cardsFragment(c));
});

profileRouter.delete("/profile/items/:id", async (c) => {
  await c.var.services.career.remove(c.req.param("id"));
  return c.html(await cardsFragment(c));
});

profileRouter.get("/profile/markdown", async (c) =>
  c.html(
    MarkdownEditor({
      basePath: c.var.config.basePath,
      markdown: await c.var.services.career.markdown(),
    }),
  ),
);

profileRouter.put("/profile/markdown", async (c) => {
  const { markdown = "" } = await fields(c);
  try {
    await c.var.services.career.saveMarkdown(markdown);
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.html(
        MarkdownEditor({ basePath: c.var.config.basePath, markdown, error: error.message }),
        400,
      );
    }
    throw error;
  }
  return c.html(await cardsFragment(c));
});

profileRouter.get("/profile/import", (c) =>
  c.html(ImportForm({ basePath: c.var.config.basePath, text: "" })),
);

profileRouter.post("/profile/import", async (c) => {
  const basePath = c.var.config.basePath;
  const { text = "" } = await fields(c);
  try {
    const markdown = await c.var.services.career.importText(text);
    return c.html(MarkdownEditor({ basePath, markdown }));
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.html(ImportForm({ basePath, text, error: error.message }), 400);
    }
    if (error instanceof LlmUnavailableError) {
      return c.html(ImportForm({ basePath, text, error: error.message }), 503);
    }
    throw error;
  }
});
