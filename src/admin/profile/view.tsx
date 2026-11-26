import { type CardView, CareerCards, type FormView } from "../career/view.js";
import { ErrorFragment } from "../error-fragment.js";
import { Layout, PageHeader } from "../layout.js";

export const FIELDS = [
  { name: "fullName", label: "Full name", long: false, required: false, tab: "career" },
  { name: "headline", label: "Headline", long: false, required: false, tab: "career" },
  { name: "summary", label: "Summary", long: true, required: false, tab: "career" },
  {
    name: "additionalInformation",
    label: "Additional information",
    long: true,
    required: false,
    tab: "career",
  },
  {
    name: "lookingForwardNext",
    label: "Looking forward next",
    long: true,
    required: false,
    tab: "career",
  },
  {
    name: "publicSystemPrompt",
    label: "Public system prompt",
    long: true,
    required: true,
    tab: "ai",
  },
  {
    name: "recruiterSystemPrompt",
    label: "Recruiter system prompt",
    long: true,
    required: true,
    tab: "ai",
  },
  {
    name: "tailorSystemPrompt",
    label: "Tailor system prompt",
    long: true,
    required: true,
    tab: "ai",
  },
] as const;

export type Tab = "career" | "ai";

const TABS: { id: Tab; label: string }[] = [
  { id: "career", label: "Career content" },
  { id: "ai", label: "AI behaviour" },
];

/** Server-rendered tabs: each is a plain link to `?tab=…`, no client script. */
export const ProfileTabs = ({ basePath, active }: { basePath: string; active: Tab }) => (
  <div class="tabs" role="tablist" aria-label="Profile sections">
    {TABS.map((t) => (
      <a
        class="tab"
        role="tab"
        href={`${basePath}/admin/profile?tab=${t.id}`}
        aria-selected={t.id === active ? "true" : "false"}
        aria-current={t.id === active ? "page" : undefined}
      >
        {t.label}
      </a>
    ))}
  </div>
);

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
      {error ? <ErrorFragment message={error} toast /> : null}
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
      {error ? <ErrorFragment message={error} toast /> : null}
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

/** The profile form card; swapped in place by htmx (`#profile-form`, outerHTML). */
export const ProfileForm = ({
  basePath,
  values,
  tab,
  error,
  saved,
}: {
  basePath: string;
  values: Values;
  tab: Tab;
  error?: string;
  saved?: boolean;
}) => (
  <form
    id="profile-form"
    class="card-pad"
    method="post"
    action={`${basePath}/admin/profile`}
    hx-post={`${basePath}/admin/profile`}
    hx-target="#profile-form"
    hx-swap="outerHTML"
    hx-disabled-elt="find button[type=submit]"
    data-swap-errors
  >
    {error ? <ErrorFragment message={error} toast /> : null}
    {saved ? (
      <p class="status" role="status" data-toast="success">
        Saved
      </p>
    ) : null}
    <input type="hidden" name="tab" value={tab} />
    {FIELDS.filter((f) => f.tab === tab).map((f) => (
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
);

export const ProfilePage = ({
  basePath,
  faviconUrl,
  values,
  cards,
  tab,
  error,
  saved,
}: {
  basePath: string;
  faviconUrl?: string;
  values: Values;
  cards: CardView[];
  tab: Tab;
  error?: string;
  saved?: boolean;
}) => (
  <Layout title="Profile" basePath={basePath} faviconUrl={faviconUrl} section="profile">
    <PageHeader
      eyebrow="Profile"
      title="Profile"
      sub="What the AI knows about you, and how it talks about it. Contact data lives in Personal info."
    />
    <ProfileTabs basePath={basePath} active={tab} />
    <ProfileForm basePath={basePath} values={values} tab={tab} error={error} saved={saved} />
    {tab === "career" ? (
      <>
        <LibraryCards basePath={basePath} cards={cards} />
        <script src={`${basePath}/admin/profile/career.js`} />
      </>
    ) : null}
  </Layout>
);
