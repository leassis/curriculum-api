import { type CardView, CareerCards, type FormView } from "../career/view.js";
import { ErrorFragment } from "../error-fragment.js";
import { Layout, PageHeader } from "../layout.js";

export const FIELDS = [
  { name: "fullName", label: "Full name", long: false, required: false },
  { name: "headline", label: "Headline", long: false, required: false },
  { name: "summary", label: "Summary", long: true, required: false },
  { name: "publicSystemPrompt", label: "Public system prompt", long: true, required: true },
  { name: "recruiterSystemPrompt", label: "Recruiter system prompt", long: true, required: true },
  { name: "tailorSystemPrompt", label: "Tailor system prompt", long: true, required: true },
] as const;

export type FieldName = (typeof FIELDS)[number]["name"];
export type Values = Record<FieldName, string>;

const Toolbar = ({ base }: { base: string }) => (
  <div class="career-toolbar">
    <h2 class="section-title">Career library</h2>
    <div class="actions">
      <button type="button" class="btn-ghost btn-sm" hx-get={`${base}/markdown`}>
        Edit as markdown
      </button>
      <button type="button" class="btn-ghost btn-sm" hx-get={`${base}/import`}>
        Import from text
      </button>
    </div>
  </div>
);

/** The Career Library cards with the markdown and import buttons; the unit every item control swaps. */
export const LibraryCards = ({
  basePath,
  cards,
  form,
}: {
  basePath: string;
  cards: CardView[];
  form?: FormView;
}) => (
  <CareerCards cards={cards} url={`${basePath}/admin/profile/items`} form={form}>
    <Toolbar base={`${basePath}/admin/profile`} />
  </CareerCards>
);

const Actions = ({ cancel, submit }: { cancel: string; submit: string }) => (
  <div class="career-actions">
    <button type="button" class="career-cancel" hx-get={cancel}>
      Cancel
    </button>
    <button type="submit" class="btn">
      {submit}
    </button>
  </div>
);

export const MarkdownEditor = ({
  basePath,
  markdown,
  error,
}: {
  basePath: string;
  markdown: string;
  error?: string;
}) => (
  <div id="career-library" hx-target="#career-library" hx-swap="outerHTML">
    <form class="card-pad" hx-put={`${basePath}/admin/profile/markdown`}>
      <h2 class="section-title">Edit as markdown</h2>
      <label class="field-label" for="career-markdown">
        Career library as markdown
      </label>
      <textarea class="input mono" id="career-markdown" name="markdown" rows={28}>
        {markdown}
      </textarea>
      {error ? <ErrorFragment message={error} /> : null}
      <Actions cancel={`${basePath}/admin/profile/items`} submit="Save" />
    </form>
  </div>
);

export const ImportForm = ({
  basePath,
  text,
  error,
}: {
  basePath: string;
  text: string;
  error?: string;
}) => (
  <div id="career-library" hx-target="#career-library" hx-swap="outerHTML">
    <form
      class="card-pad"
      hx-post={`${basePath}/admin/profile/import`}
      hx-indicator="#import-indicator"
      hx-disabled-elt="find button[type=submit]"
    >
      <h2 class="section-title">Import from text</h2>
      <label class="field-label" for="career-import">
        Paste your CV in any format
      </label>
      <textarea class="input" id="career-import" name="text" rows={20}>
        {text}
      </textarea>
      {error ? <ErrorFragment message={error} /> : null}
      <div class="career-actions">
        <span id="import-indicator" class="htmx-indicator muted">
          Converting…
        </span>
        <button type="button" class="career-cancel" hx-get={`${basePath}/admin/profile/items`}>
          Cancel
        </button>
        <button type="submit" class="btn">
          Convert
        </button>
      </div>
    </form>
  </div>
);

export const ProfilePage = ({
  basePath,
  values,
  cards,
  error,
  saved,
}: {
  basePath: string;
  values: Values;
  cards: CardView[];
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
            <textarea class="input" id={f.name} name={f.name} rows={f.name === "summary" ? 5 : 8}>
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
    <LibraryCards basePath={basePath} cards={cards} />
    <script src={`${basePath}/admin/profile/career.js`} />
  </Layout>
);
