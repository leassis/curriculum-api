import { ErrorFragment } from "../error-fragment.js";
import { Layout, PageHeader } from "../layout.js";

export interface Row {
  key: string;
  override: string;
  fallback: string;
}

export const SettingsPage = ({
  basePath,
  rows,
  pageSize,
  pageSizes,
  error,
  saved,
}: {
  basePath: string;
  rows: Row[];
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
    {error ? <ErrorFragment message={error} /> : null}
    {saved ? (
      <p class="status" role="status">
        Saved
      </p>
    ) : null}
    <form class="card-pad" method="post" action={`${basePath}/admin/settings`}>
      <div class="form-grid">
        {rows.map((r) => (
          <div class="field">
            <label class="field-label mono" for={r.key}>
              {r.key}
            </label>
            <input
              class="input"
              id={r.key}
              type="text"
              name={r.key}
              value={r.override}
              placeholder={r.fallback}
            />
          </div>
        ))}
      </div>
      <div class="field max-w-xs">
        <label class="field-label mono" for={pageSize.key}>
          {pageSize.key}
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
      <div class="actions">
        <button type="submit" class="btn">
          Save
        </button>
      </div>
    </form>
  </Layout>
);
