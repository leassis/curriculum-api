import { Layout, PageHeader } from "../layout.js";

/** The slice of a Personal Info Field the page shows; the value never reaches a view. */
export interface PersonalInfoField {
  key: string;
  label: string;
  sortOrder: number;
  visibility: string;
}

const MASK = "••••••";

export const Row = ({
  base,
  field,
  visibilities,
}: {
  base: string;
  field: PersonalInfoField;
  visibilities: readonly string[];
}) => {
  const url = `${base}/${field.key}`;
  return (
    <tr id={`row-${field.key}`}>
      <td>
        <code>{field.key}</code>
      </td>
      <td>
        <input class="input" type="text" name="label" value={field.label} aria-label="Label" />
      </td>
      <td>
        <select class="input" name="visibility" aria-label="Visibility">
          {visibilities.map((v) => (
            <option value={v} selected={v === field.visibility}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          class="input w-20"
          type="number"
          name="sortOrder"
          value={String(field.sortOrder)}
          aria-label="Sort order"
        />
      </td>
      <td>
        <div class="mb-1.5 flex items-center gap-2">
          <span id={`value-${field.key}`} class="mono">
            {MASK}
          </span>{" "}
          <button
            type="button"
            class="btn-ghost btn-sm"
            hx-get={`${url}/reveal`}
            hx-target={`#value-${field.key}`}
            hx-swap="innerHTML"
          >
            Reveal
          </button>
        </div>
        <input
          class="input"
          type="text"
          name="value"
          placeholder="New value (empty keeps current)"
          aria-label="New value"
          autocomplete="off"
        />
      </td>
      <td>
        <div class="actions justify-end">
          <button
            type="button"
            class="btn-ghost btn-sm"
            hx-put={url}
            hx-include="closest tr"
            hx-target="closest tr"
            hx-swap="outerHTML"
          >
            Save
          </button>{" "}
          <button
            type="button"
            class="btn-ghost btn-sm btn-danger"
            hx-delete={url}
            hx-confirm={`Delete ${field.label}?`}
            hx-target="closest tr"
            hx-swap="outerHTML"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export const List = ({
  base,
  fields,
  visibilities,
}: {
  base: string;
  fields: PersonalInfoField[];
  visibilities: readonly string[];
}) => (
  <div id="pi-list">
    {fields.length === 0 ? (
      <p class="empty-state">No personal info yet</p>
    ) : (
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Label</th>
              <th>Visibility</th>
              <th>Sort order</th>
              <th>Value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <Row base={base} field={f} visibilities={visibilities} />
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export const PersonalInfoPage = ({
  basePath,
  faviconUrl,
  fields,
  visibilities,
}: {
  basePath: string;
  faviconUrl?: string;
  fields: PersonalInfoField[];
  visibilities: readonly string[];
}) => {
  const base = `${basePath}/admin/personal-info`;
  return (
    <Layout
      title="Personal info"
      basePath={basePath}
      faviconUrl={faviconUrl}
      section="personal-info"
    >
      <PageHeader
        eyebrow="Personal info"
        title="Personal info"
        sub="Contact data for the resume header. Encrypted, and never sent to the AI."
      />
      <div id="pi-error" />
      <List base={base} fields={fields} visibilities={visibilities} />
      <form class="card-pad" hx-post={base} hx-target="#pi-list" hx-swap="outerHTML">
        <h2 class="section-title">Add field</h2>
        <div class="form-grid">
          <div class="field">
            <label class="field-label" for="new-key">
              Key
            </label>
            <input class="input" id="new-key" type="text" name="key" placeholder="EMAIL" />
          </div>
          <div class="field">
            <label class="field-label" for="new-label">
              Label
            </label>
            <input class="input" id="new-label" type="text" name="label" />
          </div>
          <div class="field">
            <label class="field-label" for="new-value">
              Value
            </label>
            <input class="input" id="new-value" type="text" name="value" autocomplete="off" />
          </div>
          <div class="field">
            <label class="field-label" for="new-visibility">
              Visibility
            </label>
            <select class="input" id="new-visibility" name="visibility">
              {visibilities.map((v) => (
                <option value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="new-sort">
              Sort order
            </label>
            <input class="input" id="new-sort" type="number" name="sortOrder" value="0" />
          </div>
        </div>
        <div class="actions">
          <button type="submit" class="btn">
            Add
          </button>
        </div>
      </form>
      <script src={`${base}/ui.js`} />
    </Layout>
  );
};

export const RevealedValue = ({ value }: { value: string }) => <span>{value}</span>;
