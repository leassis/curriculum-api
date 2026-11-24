import { ErrorFragment } from "../error-fragment.js";
import { Layout, PageHeader } from "../layout.js";

export interface Row {
  key: string;
  label?: string;
  override: string;
  fallback: string;
}

export interface ModelGroup {
  area: string;
  title: string;
  model: Row;
  temperature: Row;
}

const TextInput = ({ row }: { row: Row }) => (
  <input
    class="input"
    id={row.key}
    type="text"
    name={row.key}
    value={row.override}
    placeholder={row.fallback}
  />
);

export const SettingsForm = ({
  basePath,
  models,
  limits,
  pageSize,
  pageSizes,
  error,
  saved,
}: {
  basePath: string;
  models: ModelGroup[];
  limits: Row[];
  pageSize: Row;
  pageSizes: readonly string[];
  error?: string;
  saved?: boolean;
}) => (
  <form
    id="settings-form"
    class="card-pad"
    method="post"
    action={`${basePath}/admin/settings`}
    hx-post={`${basePath}/admin/settings`}
    hx-target="#settings-form"
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
    <section class="flex flex-col gap-4">
      <h2 class="section-title">AI models</h2>
      <p class="field-help">
        Temperature is 0–2; leave it empty to use the deployment default (shown as placeholder), or
        enter "default" to send none (for reasoning models that reject it).
      </p>
      {models.map((g) => (
        <fieldset class="m-0 flex flex-col gap-2 border-0 p-0" data-area={g.area}>
          <legend class="field-label p-0 pb-2">{g.title}</legend>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_1fr]">
            <div class="field">
              <label class="field-label" for={g.model.key}>
                Model
              </label>
              <TextInput row={g.model} />
            </div>
            <div class="field">
              <label class="field-label" for={g.temperature.key}>
                Temperature
              </label>
              <TextInput row={g.temperature} />
            </div>
          </div>
        </fieldset>
      ))}
    </section>
    <section class="mt-8 flex flex-col gap-4">
      <h2 class="section-title">Limits</h2>
      <div class="form-grid">
        {limits.map((r) => (
          <div class="field">
            <label class="field-label" for={r.key}>
              {r.label ?? r.key}
            </label>
            <p class="field-help mono">{r.key}</p>
            <TextInput row={r} />
          </div>
        ))}
      </div>
    </section>
    <section class="mt-8 flex flex-col gap-4">
      <h2 class="section-title">Print</h2>
      <div class="field max-w-xs">
        <label class="field-label" for={pageSize.key}>
          Page size
        </label>
        <select class="input" id={pageSize.key} name={pageSize.key}>
          <option value="" selected={pageSize.override === ""}>
            Default ({pageSize.fallback})
          </option>
          {pageSizes.map((size) => (
            <option value={size} selected={pageSize.override === size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </section>
    <div class="actions mt-8">
      <button type="submit" class="btn">
        Save
      </button>
    </div>
  </form>
);

export const SettingsPage = ({
  basePath,
  models,
  limits,
  pageSize,
  pageSizes,
  error,
  saved,
}: {
  basePath: string;
  models: ModelGroup[];
  limits: Row[];
  pageSize: Row;
  pageSizes: readonly string[];
  error?: string;
  saved?: boolean;
}) => (
  <Layout title="Settings" basePath={basePath} section="settings">
    <PageHeader
      eyebrow="Settings"
      title="Settings"
      sub="Leave a field empty to remove its override and use the deployment configuration."
    />
    <SettingsForm
      basePath={basePath}
      models={models}
      limits={limits}
      pageSize={pageSize}
      pageSizes={pageSizes}
      error={error}
      saved={saved}
    />
  </Layout>
);
