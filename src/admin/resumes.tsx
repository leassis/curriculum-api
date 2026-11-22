import { Hono } from "hono";
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import { renderMarkdown } from "../lib/markdown.js";
import { LlmUnavailableError } from "../services/errors.js";
import type { PersonalInfoMeta } from "../services/personal-info.service.js";
import type { Resume } from "../services/resume.service.js";
import { ErrorFragment } from "./error-fragment.js";
import { Layout } from "./layout.js";

const day = (d: Date) => d.toISOString().slice(0, 10);

const ResumeRow: FC<{ basePath: string; resume: Resume }> = ({ basePath, resume }) => {
  const url = `${basePath}/admin/resumes/${resume.id}`;
  return (
    <tr>
      <td>
        <a href={url}>{resume.title}</a>
      </td>
      <td>{resume.company ?? ""}</td>
      <td>{resume.model ?? ""}</td>
      <td>{day(resume.updatedAt)}</td>
      <td>
        <button
          type="button"
          hx-delete={url}
          hx-confirm={`Delete ${resume.title}?`}
          hx-target="closest tr"
          hx-swap="outerHTML"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

const ListPage: FC<{ basePath: string; resumes: Resume[] }> = ({ basePath, resumes }) => (
  <Layout title="Resumes" basePath={basePath}>
    <h1>Tailored resumes</h1>
    {resumes.length === 0 ? (
      <p>No tailored resumes yet</p>
    ) : (
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Company</th>
            <th>Model</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {resumes.map((resume) => (
            <ResumeRow basePath={basePath} resume={resume} />
          ))}
        </tbody>
      </table>
    )}
    <h2>New resume</h2>
    <form method="post" action={`${basePath}/admin/resumes`}>
      <p>
        <label for="title">Title</label>
        <br />
        <input id="title" type="text" name="title" size={60} required />
      </p>
      <p>
        <label for="company">Company</label>
        <br />
        <input id="company" type="text" name="company" size={60} />
      </p>
      <p>
        <label for="jobDescription">Job Description</label>
        <br />
        <textarea id="jobDescription" name="jobDescription" rows={12} cols={80} required />
      </p>
      <button type="submit">Create</button>
    </form>
  </Layout>
);

const Editor: FC<{ basePath: string; resume: Resume; options: PersonalInfoMeta[] }> = ({
  basePath,
  resume,
  options,
}) => {
  const url = `${basePath}/admin/resumes/${resume.id}`;
  const selected = resume.headerFields;
  return (
    <div id="editor">
      <p>
        <strong>{resume.title}</strong>
        {resume.company ? ` at ${resume.company}` : ""}
      </p>
      <details>
        <summary>Job Description</summary>
        <pre style="white-space: pre-wrap">{resume.jobDescription}</pre>
      </details>
      <form id="resume-form">
        <p>
          <label for="content">Markdown</label>
          <br />
          <textarea
            id="content"
            name="content"
            rows={28}
            cols={80}
            hx-post={`${url}/preview`}
            hx-trigger="input changed delay:400ms"
            hx-target="#preview"
          >
            {resume.content}
          </textarea>
        </p>
        <fieldset>
          <legend>Personal header</legend>
          {options.map((o) => (
            <label>
              <input
                type="checkbox"
                name="headerFields"
                value={o.key}
                checked={selected === null || selected.includes(o.key)}
              />{" "}
              {o.label}{" "}
            </label>
          ))}
        </fieldset>
        <p>
          <button
            type="button"
            hx-post={`${url}/generate`}
            hx-target="#editor"
            hx-swap="outerHTML"
            hx-indicator="#generate-indicator"
            hx-disabled-elt="this"
            hx-confirm={resume.content.trim() === "" ? undefined : "Replace the current content?"}
          >
            Generate
          </button>{" "}
          <span id="generate-indicator" class="htmx-indicator">
            Generating…
          </span>{" "}
          <button
            type="button"
            hx-put={url}
            hx-include="#resume-form"
            hx-target="#editor-status"
            hx-swap="innerHTML"
          >
            Save
          </button>{" "}
          <a href={`${url}/print`} target="_blank" rel="noopener">
            Print
          </a>{" "}
          <a href={`${url}/download.md`}>Download .md</a>
        </p>
      </form>
      <p id="editor-status" role="status" />
      <h2>Preview</h2>
      <div id="preview">{raw(renderMarkdown(resume.content))}</div>
    </div>
  );
};

const EditorPage: FC<{ basePath: string; resume: Resume; options: PersonalInfoMeta[] }> = (p) => (
  <Layout title={p.resume.title} basePath={p.basePath}>
    <h1>Resume</h1>
    <script src={`${p.basePath}/admin/resumes/editor.js`} />
    <Editor {...p} />
  </Layout>
);

/** Shows a failed save or generate in the status line instead of dropping the response. */
const EDITOR_JS = `document.addEventListener("htmx:beforeSwap", (e) => {
  const target = document.getElementById("editor-status");
  if (e.detail.xhr.status >= 400 && target) {
    e.detail.shouldSwap = true;
    e.detail.isError = false;
    e.detail.target = target;
    e.detail.swapOverride = "innerHTML";
  }
});
`;

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Mounted at `/admin`. */
export const resumesRouter = new Hono<Env>();

resumesRouter.get("/resumes", async (c) =>
  c.html(
    <ListPage basePath={c.var.config.basePath} resumes={await c.var.services.resumes.list()} />,
  ),
);

resumesRouter.post("/resumes", async (c) => {
  const body = await c.req.parseBody();
  const resume = await c.var.services.resumes.create({
    title: text(body.title),
    company: text(body.company),
    jobDescription: text(body.jobDescription),
  });
  return c.redirect(`${c.var.config.basePath}/admin/resumes/${resume.id}`, 303);
});

resumesRouter.delete("/resumes/:id", async (c) => {
  await c.var.services.resumes.delete(c.req.param("id"));
  return c.body(null, 200);
});

resumesRouter.get("/resumes/editor.js", (c) =>
  c.body(EDITOR_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

async function editor(c: { var: Env["Variables"] }, resume: Resume) {
  return {
    basePath: c.var.config.basePath,
    resume,
    options: await c.var.services.resumes.headerOptions(),
  };
}

resumesRouter.get("/resumes/:id", async (c) => {
  const resume = await c.var.services.resumes.get(c.req.param("id"));
  return c.html(<EditorPage {...(await editor(c, resume))} />);
});

resumesRouter.post("/resumes/:id/generate", async (c) => {
  try {
    const resume = await c.var.services.resumes.generate(c.req.param("id"));
    return c.html(<Editor {...(await editor(c, resume))} />);
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return c.html(<ErrorFragment message="Generation failed, try again" />, 502);
    }
    throw error;
  }
});

resumesRouter.post("/resumes/:id/preview", async (c) => {
  await c.var.services.resumes.get(c.req.param("id"));
  const body = await c.req.parseBody();
  return c.html(raw(renderMarkdown(text(body.content))));
});

resumesRouter.put("/resumes/:id", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const fields = body.headerFields;
  const keys = (Array.isArray(fields) ? fields : [fields]).filter(
    (k): k is string => typeof k === "string",
  );
  const content = Array.isArray(body.content) ? text(body.content[0]) : text(body.content);
  await c.var.services.resumes.save(c.req.param("id"), content, keys);
  return c.html("Saved");
});
