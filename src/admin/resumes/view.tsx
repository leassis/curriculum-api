import { raw } from "hono/html";
import { renderMarkdown } from "../../lib/markdown.js";
import { Layout, PageHeader } from "../layout.js";

/** The slice of a tailored resume the pages show. */
export interface ResumeView {
  id: string;
  title: string;
  company: string | null;
  model: string | null;
  updatedAt: Date;
  jobDescription: string;
  customInstructions: string;
  headerFields: string[] | null;
  /** The Resume Document; null when not generated yet or when the stored value is invalid. */
  document: DocumentView | null;
  /** The stored document failed its schema. */
  invalid: boolean;
}

/** The Resume Document as the editor form shows it. */
export interface DocumentView {
  sections: {
    title: string;
    kind: string;
    text: string;
    items: { heading: string; text: string; bullets: string[] }[];
  }[];
}

export const NOT_GENERATED = "Not generated yet";
export const INVALID_DOCUMENT = "This resume's stored data is invalid; generate it again";

const OpButton = ({
  url,
  op,
  target,
  label,
}: {
  url: string;
  op: "remove" | "up" | "down";
  target: string;
  label: string;
}) => (
  <button
    type="button"
    class={op === "remove" ? "btn-ghost btn-sm btn-danger" : "btn-ghost btn-sm"}
    hx-post={`${url}/form`}
    hx-vals={JSON.stringify({ op, target })}
    hx-include="#resume-form"
    hx-target="#document-form"
    hx-swap="outerHTML"
  >
    {label}
  </button>
);

/**
 * The editable Resume Document: per section its title (read-only) and text, per item its
 * heading, text and bullets (one per line). Remove / Move post the form and swap this block.
 */
export const DocumentForm = ({ doc, url }: { doc: DocumentView; url: string }) => (
  <div
    id="document-form"
    class="doc-form"
    hx-post={`${url}/preview`}
    hx-trigger="input delay:400ms"
    hx-include="#resume-form"
    hx-target="#preview"
  >
    {doc.sections.map((section, i) => {
      const s = `sections.${i}`;
      return (
        <section class="doc-section">
          <h3 class="section-title">{section.title || "Introduction"}</h3>
          <input type="hidden" name={`${s}.title`} value={section.title} />
          <input type="hidden" name={`${s}.kind`} value={section.kind} />
          <div class="field">
            <label class="field-label" for={`s${i}-text`}>
              Text
            </label>
            <textarea class="input" id={`s${i}-text`} name={`${s}.text`} rows={3}>
              {section.text}
            </textarea>
          </div>
          {section.items.map((item, j) => {
            const f = `${s}.items.${j}`;
            const id = `s${i}-i${j}`;
            const target = `s${i}.i${j}`;
            return (
              <div class="doc-item">
                <div class="field">
                  <label class="field-label" for={`${id}-heading`}>
                    Heading
                  </label>
                  <input
                    class="input"
                    id={`${id}-heading`}
                    type="text"
                    name={`${f}.heading`}
                    value={item.heading}
                  />
                </div>
                <div class="field">
                  <label class="field-label" for={`${id}-text`}>
                    Text
                  </label>
                  <textarea class="input" id={`${id}-text`} name={`${f}.text`} rows={3}>
                    {item.text}
                  </textarea>
                </div>
                <div class="field">
                  <label class="field-label" for={`${id}-bullets`}>
                    Bullets (one per line)
                  </label>
                  <textarea class="input" id={`${id}-bullets`} name={`${f}.bullets`} rows={4}>
                    {item.bullets.join("\n")}
                  </textarea>
                </div>
                <div class="actions">
                  <OpButton url={url} op="up" target={target} label="Move up" />
                  <OpButton url={url} op="down" target={target} label="Move down" />
                  <OpButton url={url} op="remove" target={target} label="Remove" />
                </div>
              </div>
            );
          })}
        </section>
      );
    })}
  </div>
);

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
        <a class="font-semibold" href={url}>
          {resume.title}
        </a>
      </td>
      <td>{resume.company ?? ""}</td>
      <td class="mono muted">{resume.model ?? ""}</td>
      <td class="muted">{day(resume.updatedAt)}</td>
      <td>
        <button
          type="button"
          class="btn-ghost btn-sm btn-danger"
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

export const ResumesPage = ({
  basePath,
  resumes,
  options,
}: {
  basePath: string;
  resumes: ResumeView[];
  options: HeaderOption[];
}) => (
  <Layout title="Resumes" basePath={basePath} section="resumes">
    <PageHeader
      eyebrow="Resumes"
      title="Tailored resumes"
      sub="One resume per job description, generated from your Master CV."
    />
    {resumes.length === 0 ? (
      <p class="empty-state">No tailored resumes yet</p>
    ) : (
      <div class="table-wrap">
        <table class="table">
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
      </div>
    )}
    {/* SPEC_DEVIATION: busy state uses hx-boost + hx-disabled-elt instead of an inline onsubmit.
        Reason: the admin CSP (script-src 'self') blocks inline handlers. */}
    <script src={`${basePath}/admin/resumes/editor.js`} />
    <form
      class="card-pad"
      method="post"
      action={`${basePath}/admin/resumes`}
      hx-boost="true"
      hx-disabled-elt="find button[type=submit]"
      hx-indicator="#create-indicator"
    >
      <h2 class="section-title">New resume</h2>
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="title">
            Title
          </label>
          <input class="input" id="title" type="text" name="title" required />
        </div>
        <div class="field">
          <label class="field-label" for="company">
            Company
          </label>
          <input class="input" id="company" type="text" name="company" />
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="jobDescription">
          Job Description
        </label>
        <textarea class="input" id="jobDescription" name="jobDescription" rows={12} required />
      </div>
      <div class="field">
        <label class="field-label" for="customInstructions">
          Custom instructions
        </label>
        <textarea class="input" id="customInstructions" name="customInstructions" rows={4} />
      </div>
      {options.length > 0 && (
        <fieldset class="checks">
          <legend>Personal header</legend>
          <input type="hidden" name="headerFieldsPosted" value="1" />
          {options.map((o) => (
            <label class="check">
              <input type="checkbox" name="headerFields" value={o.key} checked /> {o.label}{" "}
            </label>
          ))}
        </fieldset>
      )}
      <div class="actions">
        <button type="submit" class="btn">
          Create
        </button>{" "}
        <span id="create-indicator" class="htmx-indicator muted">
          Generating…
        </span>
      </div>
      <p id="editor-status" class="status" role="status" />
    </form>
  </Layout>
);

export const Editor = ({
  basePath,
  resume,
  options,
  preview,
  error,
}: {
  basePath: string;
  resume: ResumeView;
  options: HeaderOption[];
  /** The document rendered to markdown, shown as the initial preview. */
  preview: string;
  error?: string;
}) => {
  const url = `${basePath}/admin/resumes/${resume.id}`;
  const selected = resume.headerFields;
  return (
    <div id="editor">
      <div class="flex flex-col gap-6">
        <p class="page-sub">
          <strong class="text-ink">{resume.title}</strong>
          {resume.company ? ` at ${resume.company}` : ""}
        </p>
        <details class="disclosure">
          <summary>Job Description</summary>
          <pre>{resume.jobDescription}</pre>
        </details>
        <div class="editor-grid">
          <form id="resume-form" class="card-pad">
            {resume.document ? (
              <DocumentForm doc={resume.document} url={url} />
            ) : (
              <p class="empty-state">{resume.invalid ? INVALID_DOCUMENT : NOT_GENERATED}</p>
            )}
            <div class="field">
              <label class="field-label" for="custom-instructions">
                Custom instructions
              </label>
              <textarea class="input" id="custom-instructions" name="customInstructions" rows={4}>
                {resume.customInstructions}
              </textarea>
            </div>
            <fieldset class="checks">
              <legend>Personal header</legend>
              {options.map((o) => (
                <label class="check">
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
            <div class="actions">
              <button
                type="button"
                class="btn"
                hx-post={`${url}/generate`}
                hx-target="#editor"
                hx-swap="outerHTML"
                hx-indicator="#generate-indicator"
                hx-disabled-elt="this"
                hx-include="#custom-instructions"
                hx-confirm={resume.document ? "Replace the current content?" : undefined}
              >
                Generate
              </button>{" "}
              <span id="generate-indicator" class="htmx-indicator muted">
                Generating…
              </span>{" "}
              {resume.document && (
                <button
                  type="button"
                  class="btn-ghost"
                  hx-put={url}
                  hx-include="#resume-form"
                  hx-target="#editor-status"
                  hx-swap="innerHTML"
                >
                  Save
                </button>
              )}{" "}
              <a class="btn-ghost" href={`${url}/print`} target="_blank" rel="noopener">
                Print
              </a>{" "}
              <a class="btn-ghost" href={`${url}/download.md`}>
                Download .md
              </a>
            </div>
            <p id="editor-status" class="status" role="status">
              {error && <span class="text-danger">{error}</span>}
            </p>
          </form>
          <section class="flex flex-col gap-3" aria-labelledby="preview-title">
            <h2 id="preview-title" class="section-title">
              Preview
            </h2>
            <div id="preview" class="paper">
              {raw(renderMarkdown(preview))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export const EditorPage = (p: {
  basePath: string;
  resume: ResumeView;
  options: HeaderOption[];
  preview: string;
  error?: string;
}) => (
  <Layout title={p.resume.title} basePath={p.basePath} section="resumes">
    <a class="back-link" href={`${p.basePath}/admin/resumes`}>
      ← Back to resumes
    </a>
    <PageHeader eyebrow="Resume" title="Resume" />
    <script src={`${p.basePath}/admin/resumes/editor.js`} />
    <Editor {...p} />
  </Layout>
);
