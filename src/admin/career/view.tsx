import type { Child } from "hono/jsx";

export interface RowView {
  id: string;
  title: string;
  meta: string;
}

export interface CardView {
  kind: string;
  section: string;
  add: string;
  rows: RowView[];
}

export interface FieldView {
  name: string;
  label: string;
}

export interface FormView {
  kind: string;
  /** The Career Item being edited; absent when adding. */
  itemId?: string;
  fields: FieldView[];
  /** Label of the checkbox that marks the item as current; absent when the kind has none. */
  ongoing?: string;
  months: readonly string[];
  values: Record<string, string>;
  error?: string;
}

const HALF = new Set(["startYear", "startMonth", "endYear", "endMonth"]);
const MONTH_FIELDS = new Set(["startMonth", "endMonth"]);

const ICONS = {
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  remove: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
} as const;

const Icon = ({ name }: { name: keyof typeof ICONS }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={ICONS[name]} />
  </svg>
);

const FieldControl = ({ field, form }: { field: FieldView; form: FormView }) => {
  const id = `f-${field.name}`;
  const value = form.values[field.name] ?? "";
  if (field.name === "details") {
    return (
      <textarea class="input" id={id} name={field.name} rows={6}>
        {value}
      </textarea>
    );
  }
  if (MONTH_FIELDS.has(field.name)) {
    return (
      <select class="input" id={id} name={field.name}>
        <option value="">Month</option>
        {form.months.map((month, i) => (
          <option value={String(i + 1)} selected={value === String(i + 1)}>
            {month}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      class="input"
      id={id}
      type="text"
      name={field.name}
      value={value}
      inputmode={field.name.endsWith("Year") ? "numeric" : undefined}
    />
  );
};

export const ItemForm = ({ form, url }: { form: FormView; url: string }) => {
  const save = form.itemId ? { "hx-put": `${url}/${form.itemId}` } : { "hx-post": url };
  return (
    <form class="career-form" {...save}>
      {form.itemId ? null : <input type="hidden" name="kind" value={form.kind} />}
      {form.fields.map((field) => (
        <>
          <div class={HALF.has(field.name) ? "field" : "field career-wide"}>
            <label class="field-label" for={`f-${field.name}`}>
              {field.label}
            </label>
            <FieldControl field={field} form={form} />
          </div>
          {field.name === "endMonth" && form.ongoing ? (
            <label class="check career-wide">
              <input
                type="checkbox"
                name="current"
                value="on"
                checked={form.values.current === "on"}
              />
              {form.ongoing}
            </label>
          ) : null}
        </>
      ))}
      {form.error ? (
        <div class="error career-wide" role="alert">
          {form.error}
        </div>
      ) : null}
      <div class="career-actions career-wide">
        <button type="button" class="career-cancel" hx-get={url}>
          Cancel
        </button>
        <button type="submit" class="btn">
          Save
        </button>
      </div>
    </form>
  );
};

const Row = ({
  row,
  url,
  first,
  last,
}: {
  row: RowView;
  url: string;
  first: boolean;
  last: boolean;
}) => {
  const base = `${url}/${row.id}`;
  return (
    <>
      <div class="career-row-text">
        <span class="career-row-title">{row.title}</span>
        {row.meta ? <span class="career-row-meta">{row.meta}</span> : null}
      </div>
      <div class="career-row-controls">
        <button
          type="button"
          class="career-icon"
          aria-label={`Move ${row.title} up`}
          hx-post={`${base}/move`}
          hx-vals={JSON.stringify({ direction: "up" })}
          disabled={first}
        >
          <Icon name="up" />
        </button>
        <button
          type="button"
          class="career-icon"
          aria-label={`Move ${row.title} down`}
          hx-post={`${base}/move`}
          hx-vals={JSON.stringify({ direction: "down" })}
          disabled={last}
        >
          <Icon name="down" />
        </button>
        <button
          type="button"
          class="career-icon"
          aria-label={`Edit ${row.title}`}
          hx-get={`${base}/edit`}
        >
          <Icon name="edit" />
        </button>
        <button
          type="button"
          class="career-icon career-danger"
          aria-label={`Delete ${row.title}`}
          hx-delete={base}
          hx-confirm="Delete this item?"
        >
          <Icon name="remove" />
        </button>
      </div>
    </>
  );
};

const Card = ({ card, url, form }: { card: CardView; url: string; form?: FormView }) => {
  const adding = form && form.kind === card.kind && !form.itemId;
  return (
    <section class="career-card" aria-labelledby={`career-${card.kind}`}>
      <header class="career-head">
        <h2 id={`career-${card.kind}`} class="career-title">
          {card.section}
          {card.rows.length > 0 ? <span class="badge">{card.rows.length}</span> : null}
        </h2>
        <button type="button" class="career-add" hx-get={`${url}/new?kind=${card.kind}`}>
          <span aria-hidden="true">+</span> {card.add}
        </button>
      </header>
      {card.rows.length === 0 && !adding ? <p class="career-empty">Nothing here yet.</p> : null}
      {card.rows.length > 0 ? (
        <ul class="career-rows">
          {card.rows.map((row, i) => (
            <li class="career-row">
              {form?.itemId === row.id ? (
                <ItemForm form={form} url={url} />
              ) : (
                <Row row={row} url={url} first={i === 0} last={i === card.rows.length - 1} />
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {adding ? <ItemForm form={form} url={url} /> : null}
    </section>
  );
};

/**
 * One card per kind. Every control swaps this whole fragment; `url` is the items base the
 * controls call, so the Profile and a Tailored Resume share the markup.
 */
export const CareerCards = ({
  cards,
  url,
  form,
  children,
}: {
  cards: CardView[];
  url: string;
  form?: FormView;
  children?: Child;
}) => (
  <div id="career-library" class="career-cards" hx-target="#career-library" hx-swap="outerHTML">
    {children}
    {cards.map((card) => (
      <Card card={card} url={url} form={form} />
    ))}
  </div>
);
