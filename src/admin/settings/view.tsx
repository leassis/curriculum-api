import { ErrorFragment } from "../error-fragment.js";
import { Layout } from "../layout.js";

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
  <Layout title="Settings" basePath={basePath}>
    <h1>Settings</h1>
    {error ? <ErrorFragment message={error} /> : null}
    {saved ? <p role="status">Saved</p> : null}
    <form method="post" action={`${basePath}/admin/settings`}>
      {rows.map((r) => (
        <p>
          <label for={r.key}>{r.key}</label>
          <br />
          <input
            id={r.key}
            type="text"
            name={r.key}
            value={r.override}
            placeholder={r.fallback}
            size={50}
          />
        </p>
      ))}
      <p>
        <label for={pageSize.key}>{pageSize.key}</label>
        <br />
        <select id={pageSize.key} name={pageSize.key}>
          <option value="" selected={pageSize.override === ""}>
            Default ({pageSize.fallback})
          </option>
          {pageSizes.map((size) => (
            <option value={size} selected={pageSize.override === size}>
              {size}
            </option>
          ))}
        </select>
      </p>
      <p>Leave a field empty to remove its override and use the deployment configuration.</p>
      <button type="submit">Save</button>
    </form>
  </Layout>
);
