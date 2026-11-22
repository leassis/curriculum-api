import { ErrorFragment } from "../error-fragment.js";
import { Layout, PageHeader } from "../layout.js";

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
  <Layout title="Profile" basePath={basePath} section="profile">
    <PageHeader
      eyebrow="Profile"
      title="Profile"
      sub="Your career history and the prompts the AI follows. Contact data lives in Personal info."
    />
    {error ? <ErrorFragment message={error} /> : null}
    {saved ? (
      <p class="status" role="status">
        Saved
      </p>
    ) : null}
    <form class="card-pad" method="post" action={`${basePath}/admin/profile`}>
      {FIELDS.map((f) => (
        <div class="field">
          <label class="field-label" for={f.name}>
            {f.label}
          </label>
          {f.long ? (
            <textarea
              class={f.name === "masterCv" ? "input mono" : "input"}
              id={f.name}
              name={f.name}
              rows={f.name === "masterCv" ? 24 : 8}
            >
              {values[f.name]}
            </textarea>
          ) : (
            <input class="input" id={f.name} type="text" name={f.name} value={values[f.name]} />
          )}
        </div>
      ))}
      <div class="actions">
        <button type="submit" class="btn">
          Save
        </button>
      </div>
    </form>
  </Layout>
);
