import { Layout } from "../layout.js";

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
        <input type="text" name="label" value={field.label} aria-label="Label" />
      </td>
      <td>
        <select name="visibility" aria-label="Visibility">
          {visibilities.map((v) => (
            <option value={v} selected={v === field.visibility}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          name="sortOrder"
          value={String(field.sortOrder)}
          aria-label="Sort order"
          size={4}
        />
      </td>
      <td>
        <span id={`value-${field.key}`}>{MASK}</span>{" "}
        <button
          type="button"
          hx-get={`${url}/reveal`}
          hx-target={`#value-${field.key}`}
          hx-swap="innerHTML"
        >
          Reveal
        </button>
        <br />
        <input
          type="text"
          name="value"
          placeholder="New value (empty keeps current)"
          aria-label="New value"
          autocomplete="off"
        />
      </td>
      <td>
        <button
          type="button"
          hx-put={url}
          hx-include="closest tr"
          hx-target="closest tr"
          hx-swap="outerHTML"
        >
          Save
        </button>{" "}
        <button
          type="button"
          hx-delete={url}
          hx-confirm={`Delete ${field.label}?`}
          hx-target="closest tr"
          hx-swap="outerHTML"
        >
          Delete
        </button>
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
      <p>No personal info yet</p>
    ) : (
      <table>
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
    )}
  </div>
);

export const PersonalInfoPage = ({
  basePath,
  fields,
  visibilities,
}: {
  basePath: string;
  fields: PersonalInfoField[];
  visibilities: readonly string[];
}) => {
  const base = `${basePath}/admin/personal-info`;
  return (
    <Layout title="Personal info" basePath={basePath}>
      <h1>Personal info</h1>
      <div id="pi-error" />
      <List base={base} fields={fields} visibilities={visibilities} />
      <h2>Add field</h2>
      <form hx-post={base} hx-target="#pi-list" hx-swap="outerHTML">
        <p>
          <label for="new-key">Key</label>{" "}
          <input id="new-key" type="text" name="key" placeholder="EMAIL" />
        </p>
        <p>
          <label for="new-label">Label</label> <input id="new-label" type="text" name="label" />
        </p>
        <p>
          <label for="new-value">Value</label>{" "}
          <input id="new-value" type="text" name="value" autocomplete="off" />
        </p>
        <p>
          <label for="new-visibility">Visibility</label>{" "}
          <select id="new-visibility" name="visibility">
            {visibilities.map((v) => (
              <option value={v}>{v}</option>
            ))}
          </select>
        </p>
        <p>
          <label for="new-sort">Sort order</label>{" "}
          <input id="new-sort" type="number" name="sortOrder" value="0" />
        </p>
        <button type="submit">Add</button>
      </form>
      <script src={`${base}/ui.js`} />
    </Layout>
  );
};

export const RevealedValue = ({ value }: { value: string }) => <span>{value}</span>;
