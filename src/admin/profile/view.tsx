import type { FC } from "hono/jsx";
import { ErrorFragment } from "../error-fragment.js";
import { Layout } from "../layout.js";

export const FIELDS = [
  { name: "fullName", label: "Full name", long: false, required: false },
  { name: "headline", label: "Headline", long: false, required: false },
  { name: "masterCv", label: "Master CV", long: true, required: false },
  { name: "publicSystemPrompt", label: "Public system prompt", long: true, required: true },
  { name: "recruiterSystemPrompt", label: "Recruiter system prompt", long: true, required: true },
  { name: "tailorSystemPrompt", label: "Tailor system prompt", long: true, required: true },
] as const;

export type FieldName = (typeof FIELDS)[number]["name"];
export type Values = Record<FieldName, string>;

export const ProfilePage = ({
  basePath,
  values,
  error,
  saved,
}: {
  basePath: string;
  values: Values;
  error?: string;
  saved?: boolean;
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
