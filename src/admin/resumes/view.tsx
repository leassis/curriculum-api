import { raw } from "hono/html";
import { renderMarkdown } from "../../lib/markdown.js";
import { Layout } from "../layout.js";

/** The slice of a tailored resume the pages show. */
export interface ResumeView {
  id: string;
  title: string;
  company: string | null;
  model: string | null;
  updatedAt: Date;
  jobDescription: string;
  content: string;
  headerFields: string[] | null;
}

export interface HeaderOption {
  key: string;
  label: string;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

const ResumeRow = ({ basePath, resume }: { basePath: string; resume: ResumeView }) => {
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

export const ResumesPage = ({ basePath, resumes }: { basePath: string; resumes: ResumeView[] }) => (
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

export const Editor = ({
  basePath,
  resume,
  options,
}: {
  basePath: string;
  resume: ResumeView;
  options: HeaderOption[];
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

export const EditorPage = (p: {
  basePath: string;
  resume: ResumeView;
  options: HeaderOption[];
}) => (
  <Layout title={p.resume.title} basePath={p.basePath}>
    <h1>Resume</h1>
    <script src={`${p.basePath}/admin/resumes/editor.js`} />
    <Editor {...p} />
  </Layout>
);
