import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import { ValidationError } from "../services/errors.js";
import {
  type PersonalInfoMeta,
  type PersonalInfoUpdate,
  VISIBILITIES,
} from "../services/personal-info.service.js";
import { Layout } from "./layout.js";

const MASK = "••••••";

/** HTMX does not swap 4xx responses; this lets error fragments land in `#pi-error`. */
const UI_JS = `document.body.addEventListener("htmx:beforeSwap", function (e) {
  var box = document.getElementById("pi-error");
  if (!box) return;
  var status = e.detail.xhr.status;
  if (status >= 400 && status < 500 && status !== 401) {
    e.detail.shouldSwap = true;
    e.detail.isError = false;
    e.detail.target = box;
    e.detail.swapOverride = "innerHTML";
  } else if (status >= 200 && status < 300) {
    box.innerHTML = "";
  }
});
`;

const Row: FC<{ base: string; field: PersonalInfoMeta }> = ({ base, field }) => {
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
          {VISIBILITIES.map((v) => (
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

const List: FC<{ base: string; fields: PersonalInfoMeta[] }> = ({ base, fields }) => (
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
            <Row base={base} field={f} />
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const Page: FC<{ basePath: string; fields: PersonalInfoMeta[] }> = ({ basePath, fields }) => {
  const base = `${basePath}/admin/personal-info`;
  return (
    <Layout title="Personal info" basePath={basePath}>
      <h1>Personal info</h1>
      <div id="pi-error" />
      <List base={base} fields={fields} />
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
            {VISIBILITIES.map((v) => (
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

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sortOrderOf(value: unknown): number | undefined {
  const raw = text(value).trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    throw new ValidationError("Invalid sortOrder: must be an integer", {
      sortOrder: "must be an integer",
    });
  }
  return n;
}

/** Mounted at `/admin`. */
export const personalInfoRouter = new Hono<Env>();

personalInfoRouter.get("/personal-info", async (c) =>
  c.html(
    <Page basePath={c.var.config.basePath} fields={await c.var.services.personalInfo.list()} />,
  ),
);

personalInfoRouter.get("/personal-info/ui.js", (c) =>
  c.body(UI_JS, 200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "no-cache",
  }),
);

personalInfoRouter.post("/personal-info", async (c) => {
  const service = c.var.services.personalInfo;
  const body = await c.req.parseBody();
  await service.create({
    key: text(body.key).trim(),
    label: text(body.label),
    value: text(body.value),
    visibility: text(body.visibility),
    sortOrder: sortOrderOf(body.sortOrder),
  });
  return c.html(
    <List base={`${c.var.config.basePath}/admin/personal-info`} fields={await service.list()} />,
  );
});

personalInfoRouter.put("/personal-info/:key", async (c) => {
  const body = await c.req.parseBody();
  const patch: PersonalInfoUpdate = {
    label: text(body.label),
    visibility: text(body.visibility),
    sortOrder: sortOrderOf(body.sortOrder),
  };
  const value = text(body.value);
  if (value !== "") patch.value = value;
  const field = await c.var.services.personalInfo.update(c.req.param("key"), patch);
  return c.html(<Row base={`${c.var.config.basePath}/admin/personal-info`} field={field} />);
});

personalInfoRouter.delete("/personal-info/:key", async (c) => {
  await c.var.services.personalInfo.delete(c.req.param("key"));
  return c.html("");
});

personalInfoRouter.get("/personal-info/:key/reveal", async (c) => {
  const value = await c.var.services.personalInfo.reveal(c.req.param("key"));
  c.header("Cache-Control", "no-store");
  return c.html(<span>{value}</span>);
});
