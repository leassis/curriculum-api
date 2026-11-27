import { type CardView, CareerCards, type FormView } from "../career/view.js";
import { Icon } from "../icons.js";
import { Layout, PageHeader } from "../layout.js";

/** The slice of a tailored resume the pages show. */
export interface ResumeView {
  id: string;
  title: string;
  company: string | null;
  model: string | null;
  updatedAt: Date;
  jobDescription: string;
  /** The Short Job Description; null until the first successful generation. */
  jobDescriptionShort: string | null;
  customInstructions: string;
  jobLink: string;
  recruiterName: string;
  notes: string;
  headerFields: string[] | null;
  /** The header of the Resume Document; null when not generated yet or when the stored value is invalid. */
  document: { headline: string; summary: string } | null;
  /** The stored document failed its schema. */
  invalid: boolean;
  /** The last assessment's score (0-100); null or absent when not assessed yet. */
  score?: number | null;
}

/** The last generation's assessment, with the band label already resolved by the route. */
export interface AssessmentView {
  score: number;
  band: string;
  rationale: string;
  missingSkills: string[];
  omissions: { what: string; reason: string }[];
}

export const NOT_GENERATED = "Not generated yet";
export const INVALID_DOCUMENT = "This resume's stored data is invalid; generate it again";

export interface HeaderOption {
  key: string;
  label: string;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** A rounded track filled to the score, then the score as a percentage; a muted dash when not assessed. */
export const ScoreBar = ({ score }: { score: number | null | undefined }) => {
  if (score === null || score === undefined) {
    return (
      <span class="muted">
        <span aria-hidden="true">—</span>
        <span class="sr-only">Not assessed</span>
      </span>
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <span class="score">
      <span class="score-track" aria-hidden="true">
        <span class="score-fill" style={`width: ${pct}%`} />
      </span>
      <span class="score-value">
        {pct}%<span class="sr-only"> match score</span>
      </span>
    </span>
  );
};

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
      <td>{resume.recruiterName}</td>
      <td class="muted">{day(resume.updatedAt)}</td>
      <td>
        <ScoreBar score={resume.score} />
      </td>
      <td>
        <button
          type="button"
          class="career-icon career-danger"
          aria-label={`Delete ${resume.title}`}
          title="Delete"
          hx-delete={url}
          hx-confirm={`Delete ${resume.title}?`}
          hx-target="closest tr"
          hx-swap="outerHTML"
        >
          <Icon name="remove" />
        </button>
      </td>
    </tr>
  );
};

export const ResumesPage = ({
  basePath,
  faviconUrl,
  resumes,
  options,
}: {
  basePath: string;
  faviconUrl?: string;
  resumes: ResumeView[];
  options: HeaderOption[];
}) => (
  <Layout title="Resumes" basePath={basePath} faviconUrl={faviconUrl} section="resumes">
    <PageHeader
      eyebrow="Resumes"
      title="Tailored resumes"
      sub="One resume per job description, generated from your career library."
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
              <th>Recruiter</th>
              <th>Updated</th>
              <th>Score</th>
              <th>
                <span class="sr-only">Actions</span>
              </th>
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
        <div class="field">
          <label class="field-label" for="jobLink">
            Job link
          </label>
          <input class="input" id="jobLink" type="url" name="jobLink" />
        </div>
        <div class="field">
          <label class="field-label" for="recruiterName">
            Recruiter name
          </label>
          <input class="input" id="recruiterName" type="text" name="recruiterName" />
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="notes">
          Notes
        </label>
        <textarea class="input" id="notes" name="notes" rows={4} />
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

const HeaderCard = ({
  url,
  fullName,
  headline,
  summary,
  error,
}: {
  url: string;
  fullName: string;
  headline: string;
  summary: string;
  error?: string;
}) => (
  <details class="career-card career-header" open={error !== undefined}>
    <summary class="career-header-summary">
      <span class="career-row-text">
        <span class="career-title">Header</span>
        <span class="career-row-meta">{[fullName, headline].filter(Boolean).join(" · ")}</span>
      </span>
    </summary>
    <form class="career-form" hx-put={`${url}/header`}>
      <div class="field career-wide">
        <label class="field-label" for="header-headline">
          Headline
        </label>
        <input class="input" id="header-headline" type="text" name="headline" value={headline} />
      </div>
      <div class="field career-wide">
        <label class="field-label" for="header-summary">
          Summary
        </label>
        <textarea class="input" id="header-summary" name="summary" rows={6}>
          {summary}
        </textarea>
      </div>
      {error ? (
        <div class="error career-wide" role="alert" data-toast="error">
          {error}
        </div>
      ) : null}
      <div class="career-actions career-wide">
        <button type="submit" class="btn">
          Save
        </button>
      </div>
    </form>
  </details>
);

/** The Header card and the item cards of a generated resume; the unit every control swaps. */
export const ResumeCards = ({
  basePath,
  resume,
  fullName,
  cards,
  form,
  headerError,
  leftOutError,
}: {
  basePath: string;
  resume: ResumeView;
  fullName: string;
  /** One card per kind, empty ones included. */
  cards: CardView[];
  form?: FormView;
  headerError?: string;
  leftOutError?: string;
}) => {
  const url = `${basePath}/admin/resumes/${resume.id}`;
  if (!resume.document) {
    return (
      <div id="career-library">
        <p class="empty-state">{resume.invalid ? INVALID_DOCUMENT : NOT_GENERATED}</p>
      </div>
    );
  }
  return (
    <CareerCards cards={cards} url={`${url}/items`} leftOutUrl={`${url}/left-out`} form={form}>
      {leftOutError ? (
        <div class="error" role="alert" data-toast="error">
          {leftOutError}
        </div>
      ) : null}
      <HeaderCard
        url={url}
        fullName={fullName}
        headline={resume.document.headline}
        summary={resume.document.summary}
        error={headerError}
      />
    </CareerCards>
  );
};

export const AssessmentPanels = ({ assessment }: { assessment: AssessmentView | null }) => {
  if (!assessment) {
    return (
      <article class="card-pad" id="assessment">
        <h2 class="section-title">Not assessed yet</h2>
        <p class="muted">Generate to see the assessment.</p>
      </article>
    );
  }
  return (
    <div class="assessment-grid" id="assessment">
      <article class="card-pad">
        <h2 class="section-title">Why this score</h2>
        <p>
          <strong>
            {assessment.score} · {assessment.band}
          </strong>
        </p>
        <p>{assessment.rationale}</p>
      </article>
      <article class="card-pad">
        <h2 class="section-title">Missing skills</h2>
        {assessment.missingSkills.length === 0 ? (
          <>
            <p>
              <strong>No significant gaps</strong>
            </p>
            <p class="muted">Your career library covers the role's stated requirements.</p>
          </>
        ) : (
          <p class="flex flex-wrap gap-2">
            {assessment.missingSkills.map((skill) => (
              <span class="badge badge-warning">{skill}</span>
            ))}
          </p>
        )}
      </article>
      <article class="card-pad">
        <h2 class="section-title">What was left out</h2>
        {assessment.omissions.length === 0 ? (
          <>
            <p>
              <strong>Nothing was left out</strong>
            </p>
            <p class="muted">Your whole career library made it into this resume.</p>
          </>
        ) : (
          <ul class="flex flex-col gap-3">
            {assessment.omissions.map((omission) => (
              <li>
                <strong>{omission.what}</strong>
                <span class="muted"> {omission.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
};

export const Editor = ({
  basePath,
  resume,
  options,
  fullName,
  cards,
  assessment,
  error,
}: {
  basePath: string;
  resume: ResumeView;
  options: HeaderOption[];
  fullName: string;
  cards: CardView[];
  assessment: AssessmentView | null;
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
        <form id="resume-form" class="card-pad">
          <div class="field">
            <label class="field-label" for="resume-company">
              Company
            </label>
            <input
              class="input"
              id="resume-company"
              type="text"
              name="company"
              value={resume.company ?? ""}
            />
          </div>
          <div class="field">
            <label class="field-label" for="job-description-short">
              Short Job Description (max 2000 characters)
            </label>
            <textarea class="input" id="job-description-short" name="jobDescriptionShort" rows={10}>
              {resume.jobDescriptionShort ?? ""}
            </textarea>
          </div>
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="job-link">
                Job link
              </label>
              <input class="input" id="job-link" type="url" name="jobLink" value={resume.jobLink} />
              {resume.jobLink ? (
                <a href={resume.jobLink} target="_blank" rel="noopener noreferrer">
                  Open job link
                </a>
              ) : null}
            </div>
            <div class="field">
              <label class="field-label" for="recruiter-name">
                Recruiter name
              </label>
              <input
                class="input"
                id="recruiter-name"
                type="text"
                name="recruiterName"
                value={resume.recruiterName}
              />
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="notes">
              Notes
            </label>
            <textarea class="input" id="notes" name="notes" rows={4}>
              {resume.notes}
            </textarea>
          </div>
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
            <button
              type="button"
              class="btn-ghost"
              hx-put={url}
              hx-include="#resume-form"
              hx-target="#editor-status"
              hx-swap="innerHTML"
            >
              Save options
            </button>{" "}
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
        <AssessmentPanels assessment={assessment} />
        <ResumeCards basePath={basePath} resume={resume} fullName={fullName} cards={cards} />
      </div>
    </div>
  );
};

export const EditorPage = (p: {
  basePath: string;
  faviconUrl?: string;
  resume: ResumeView;
  options: HeaderOption[];
  fullName: string;
  cards: CardView[];
  assessment: AssessmentView | null;
  error?: string;
}) => (
  <Layout title={p.resume.title} basePath={p.basePath} faviconUrl={p.faviconUrl} section="resumes">
    <a class="back-link" href={`${p.basePath}/admin/resumes`}>
      ← Back to resumes
    </a>
    <PageHeader eyebrow="Resume" title="Resume" />
    <script src={`${p.basePath}/admin/resumes/editor.js`} />
    <Editor {...p} />
  </Layout>
);
