import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import { findPii } from "../llm/pii-guard.js";
import { NotFoundError, ValidationError } from "../services/errors.js";
import { ErrorFragment } from "./error-fragment.js";
import { Layout } from "./layout.js";

const FIELDS = [
  { name: "fullName", label: "Full name", long: false, required: false },
  { name: "headline", label: "Headline", long: false, required: false },
  { name: "masterCv", label: "Master CV", long: true, required: false },
  { name: "publicSystemPrompt", label: "Public system prompt", long: true, required: true },
  { name: "recruiterSystemPrompt", label: "Recruiter system prompt", long: true, required: true },
  { name: "tailorSystemPrompt", label: "Tailor system prompt", long: true, required: true },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];
type Values = Record<FieldName, string>;

const EMPTY: Values = {
  fullName: "",
  headline: "",
  masterCv: "",
  publicSystemPrompt: "",
  recruiterSystemPrompt: "",
  tailorSystemPrompt: "",
};

const ProfilePage: FC<{ basePath: string; values: Values; error?: string; saved?: boolean }> = ({
  basePath,
  values,
  error,
  saved,
}) => (
  <Layout title="Profile" basePath={basePath}>
    <h1>Profile</h1>
    {error ? <ErrorFragment message={error} /> : null}
    {saved ? <p role="status">Saved</p> : null}
    <form method="post" action={`${basePath}/admin/profile`}>
      {FIELDS.map((f) => (
        <p>
          <label for={f.name}>{f.label}</label>
          <br />
          {f.long ? (
            <textarea id={f.name} name={f.name} rows={f.name === "masterCv" ? 24 : 8} cols={80}>
              {values[f.name]}
            </textarea>
          ) : (
            <input id={f.name} type="text" name={f.name} value={values[f.name]} size={60} />
          )}
        </p>
      ))}
      <button type="submit">Save</button>
    </form>
  </Layout>
);

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
  c.html(<ProfilePage basePath={c.var.config.basePath} values={await currentValues(c)} />),
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
    c.html(<ProfilePage basePath={basePath} values={values} error={message} />, 400);

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
  return c.html(<ProfilePage basePath={basePath} values={values} saved />);
});
