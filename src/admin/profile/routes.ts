import { Hono } from "hono";
import type { Env } from "../../env.js";
import { findPii } from "../../llm/pii-guard.js";
import { NotFoundError, ValidationError } from "../../services/errors.js";
import { FIELDS, ProfilePage, type Values } from "./view.js";

const EMPTY: Values = {
  fullName: "",
  headline: "",
  masterCv: "",
  publicSystemPrompt: "",
  recruiterSystemPrompt: "",
  tailorSystemPrompt: "",
};

async function currentValues(c: { var: Env["Variables"] }): Promise<Values> {
  try {
    const p = await c.var.services.profile.get();
    return {
      fullName: p.fullName,
      headline: p.headline,
      masterCv: p.masterCv,
      publicSystemPrompt: p.publicSystemPrompt,
      recruiterSystemPrompt: p.recruiterSystemPrompt,
      tailorSystemPrompt: p.tailorSystemPrompt,
    };
  } catch (error) {
    if (error instanceof NotFoundError) return { ...EMPTY };
    throw error;
  }
}

/** Mounted at `/admin`. */
export const profileRouter = new Hono<Env>();

profileRouter.get("/profile", async (c) =>
  c.html(ProfilePage({ basePath: c.var.config.basePath, values: await currentValues(c) })),
);

profileRouter.post("/profile", async (c) => {
  const basePath = c.var.config.basePath;
  const body = await c.req.parseBody();
  const values = { ...EMPTY };
  for (const f of FIELDS) {
    const raw = body[f.name];
    values[f.name] = typeof raw === "string" ? raw : "";
  }
  const reject = (message: string) =>
    c.html(ProfilePage({ basePath, values, error: message }), 400);

  const missing = FIELDS.find((f) => f.required && values[f.name].trim() === "");
  if (missing) return reject(`${missing.label} is required`);

  const found = findPii(values.masterCv, await c.var.services.personalInfo.allValues())[0];
  if (found)
    return reject(`Your ${found.label} is in the body — keep contact data in Personal info`);

  try {
    await c.var.services.profile.update(values);
  } catch (error) {
    if (error instanceof ValidationError) return reject(error.message);
    throw error;
  }
  return c.html(ProfilePage({ basePath, values, saved: true }));
});
