import { Icon } from "../icons.js";
import { Layout, PageHeader } from "../layout.js";

/** The slice of a Recruiter Chat the pages show. */
export interface ChatView {
  id: string;
  token: string;
  recruiterName: string;
  company: string | null;
  maxQuestions: number;
  used: number;
  status: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

export interface ResumeChoice {
  id: string;
  title: string;
}

const stamp = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace("T", " ") : "");

export type FieldNotice = "kept" | "no-source" | "not-found";

/** The notices exactly as the Owner reads them. */
export const NOTICE_TEXT: Record<FieldNotice, string> = {
  kept: "Not filled: the field has your own text.",
  "no-source": "This resume has no short description yet. Regenerate it to get one.",
  "not-found": "Tailored Resume not found",
};

/** The Recruiter Link: the site and the API share one origin, so it is `<origin>/r/<token>`. */
const linkFor = (origin: string, chat: ChatView) => `${origin}/r/${chat.token}`;

export const ChatRow = ({
  basePath,
  origin,
  chat,
}: {
  basePath: string;
  origin: string;
  chat: ChatView;
}) => {
  const url = `${basePath}/admin/chats/${chat.id}`;
  return (
    <tr id={`chat-${chat.id}`}>
      <td class="font-semibold">{chat.recruiterName}</td>
      <td>{chat.company ?? ""}</td>
      <td class="mono">
        {chat.used}/{chat.maxQuestions}
      </td>
      <td>{chat.status}</td>
      <td class="mono muted">{stamp(chat.expiresAt)}</td>
      <td class="mono muted">{stamp(chat.lastUsedAt)}</td>
      <td>
        <div class="actions justify-end">
          <a
            class="icon-btn"
            href={`${url}/messages`}
            aria-label={`Messages for ${chat.recruiterName}`}
            title="Messages"
          >
            <Icon name="messages" />
          </a>
          <button
            type="button"
            class="icon-btn"
            data-copy={linkFor(origin, chat)}
            aria-label={`Copy link for ${chat.recruiterName}`}
            title="Copy link"
          >
            <Icon name="link" />
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label={`Revoke chat for ${chat.recruiterName}`}
            title="Revoke"
            hx-patch={`${url}/revoke`}
            hx-target="closest tr"
            hx-swap="outerHTML"
          >
            <Icon name="revoke" />
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label={`Reset chat for ${chat.recruiterName}`}
            title="Reset"
            hx-patch={`${url}/reset`}
            hx-target="closest tr"
            hx-swap="outerHTML"
          >
            <Icon name="reset" />
          </button>
          <button
            type="button"
            class="icon-btn icon-btn-danger"
            aria-label={`Delete chat for ${chat.recruiterName}`}
            title="Delete"
            hx-delete={url}
            hx-confirm={`Delete chat for ${chat.recruiterName}?`}
            hx-target="closest tr"
            hx-swap="outerHTML"
          >
            <Icon name="remove" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const Created = (p: { basePath: string; origin: string; chat: ChatView }) => (
  <div
    id="created"
    class="flex flex-wrap items-center gap-3 rounded-control bg-primary-soft px-4 py-3 text-sm"
  >
    <span>
      Recruiter Link for {p.chat.recruiterName}: <code>{linkFor(p.origin, p.chat)}</code>
    </span>{" "}
    <button type="button" class="btn-ghost btn-sm" data-copy={linkFor(p.origin, p.chat)}>
      Copy
    </button>
  </div>
);

export const Rows = ({
  basePath,
  origin,
  chats,
}: {
  basePath: string;
  origin: string;
  chats: ChatView[];
}) =>
  chats.length === 0 ? (
    <tr>
      <td colspan={7} class="muted">
        No recruiter chats yet
      </td>
    </tr>
  ) : (
    // biome-ignore lint/complexity/noUselessFragments: c.html needs a single node, not an array
    <>
      {chats.map((chat) => (
        <ChatRow basePath={basePath} origin={origin} chat={chat} />
      ))}
    </>
  );

/** Ask the recruiter assistant like a recruiter would; nothing is counted or stored. */
export const TestPanel = ({ basePath }: { basePath: string }) => (
  <aside class="test-panel" id="test-panel" data-url={`${basePath}/admin/chats/test`}>
    <div class="test-head">
      <h2 class="test-title">Test the assistant</h2>
      <span class="test-tag" title="Not counted, not stored">
        Draft
      </span>
    </div>
    <div id="test-log" class="test-log" aria-live="polite" />
    <p id="test-status" class="status" role="status" />
    <form id="test-ask" class="test-form">
      <input
        class="input"
        id="test-question"
        type="text"
        name="question"
        placeholder="Ask like a recruiter..."
        aria-label="Question"
        autocomplete="off"
        required
      />
      <button type="submit" class="btn" id="test-send">
        Ask
      </button>
    </form>
  </aside>
);

const JobDescriptionField = ({ value, oob }: { value: string; oob?: boolean }) => (
  <textarea
    class="input"
    id="jobDescriptionShort"
    name="jobDescriptionShort"
    rows={6}
    hx-swap-oob={oob ? "true" : undefined}
  >
    {value}
  </textarea>
);

const CompanyField = ({ value, oob }: { value: string; oob?: boolean }) => (
  <input
    class="input"
    id="company"
    type="text"
    name="company"
    value={value}
    hx-swap-oob={oob ? "true" : undefined}
  />
);

const LastFilled = ({ name, value, oob }: { name: string; value: string; oob?: boolean }) => (
  <input type="hidden" id={name} name={name} value={value} hx-swap-oob={oob ? "true" : undefined} />
);

const Notice = ({
  basePath,
  field,
  notice,
}: {
  basePath: string;
  field: "jobDescriptionShort" | "company";
  notice: FieldNotice;
}) => (
  <p class="muted">
    {NOTICE_TEXT[notice]}
    {notice === "kept" ? (
      <>
        {" "}
        <button
          type="button"
          class="btn-ghost btn-sm"
          hx-post={`${basePath}/admin/chats/autofill`}
          hx-include="closest form"
          hx-vals={JSON.stringify({ replace: field })}
          hx-swap="none"
        >
          Replace
        </button>
      </>
    ) : null}
  </p>
);

/**
 * The answer to an autofill request: the two fields, the values the autofill last put in them, and
 * a notice under each, all swapped out of band into the New chat form. The notices go into regions
 * that are already on the page, so a screen reader announces them.
 */
export const AutofillFragment = ({
  basePath,
  jobDescriptionShort,
  company,
  lastJobDescriptionShort,
  lastCompany,
  jobDescriptionNotice,
  companyNotice,
}: {
  basePath: string;
  jobDescriptionShort: string;
  company: string;
  lastJobDescriptionShort: string;
  lastCompany: string;
  jobDescriptionNotice: FieldNotice | null;
  companyNotice: FieldNotice | null;
}) => (
  <>
    <JobDescriptionField value={jobDescriptionShort} oob />
    <CompanyField value={company} oob />
    <LastFilled name="lastJobDescriptionShort" value={lastJobDescriptionShort} oob />
    <LastFilled name="lastCompany" value={lastCompany} oob />
    <div hx-swap-oob="innerHTML:#jd-notice">
      {jobDescriptionNotice ? (
        <Notice basePath={basePath} field="jobDescriptionShort" notice={jobDescriptionNotice} />
      ) : null}
    </div>
    <div hx-swap-oob="innerHTML:#company-notice">
      {companyNotice ? <Notice basePath={basePath} field="company" notice={companyNotice} /> : null}
    </div>
  </>
);

export const ChatsPage = ({
  basePath,
  faviconUrl,
  origin,
  chats,
  resumes,
  defaultMax,
  counts,
}: {
  basePath: string;
  faviconUrl?: string;
  origin: string;
  chats: ChatView[];
  resumes: ResumeChoice[];
  defaultMax: number;
  counts: { activeChats: number; publicQuestionsToday: number };
}) => (
  <Layout title="Chats" basePath={basePath} faviconUrl={faviconUrl} section="chats">
    <PageHeader
      eyebrow="Chat links"
      title="Recruiter chats"
      sub="Each link opens a chat with one resume as context. Revoke or reset it any time."
    />
    <script src={`${basePath}/admin/chats/chats.js`} defer />
    <div class="chats-list">
      <p id="chat-status" class="status" role="status" />
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Recruiter</th>
              <th>Company</th>
              <th>Used</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Last used</th>
              <th />
            </tr>
          </thead>
          <tbody
            id="chat-rows"
            hx-get={`${basePath}/admin/chats/rows`}
            hx-trigger="chats-changed from:body"
            hx-swap="innerHTML"
          >
            <Rows basePath={basePath} origin={origin} chats={chats} />
          </tbody>
        </table>
      </div>
    </div>
    <div class="chats-split">
      <div class="chats-main">
        <form
          class="card-pad"
          hx-post={`${basePath}/admin/chats`}
          hx-target="#created"
          hx-swap="outerHTML"
        >
          <h2 class="section-title">New chat</h2>
          <div id="created" />
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="recruiterName">
                Recruiter name
              </label>
              <input class="input" id="recruiterName" type="text" name="recruiterName" required />
            </div>
            <div class="field">
              <label class="field-label" for="company">
                Company
              </label>
              <CompanyField value="" />
              <div id="company-notice" aria-live="polite" />
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="jobDescriptionShort">
              Job Description (max 2000 characters)
            </label>
            <JobDescriptionField value="" />
            <div id="jd-notice" aria-live="polite" />
            <LastFilled name="lastJobDescriptionShort" value="" />
            <LastFilled name="lastCompany" value="" />
          </div>
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="maxQuestions">
                Max questions
              </label>
              <input
                class="input"
                id="maxQuestions"
                type="number"
                name="maxQuestions"
                min={1}
                max={100}
                value={defaultMax}
              />
            </div>
            <div class="field">
              <label class="field-label" for="expiresAt">
                Expires at
              </label>
              <input class="input" id="expiresAt" type="datetime-local" name="expiresAt" />
            </div>
            <div class="field">
              <label class="field-label" for="tailoredResumeId">
                Resume
              </label>
              <select
                class="input"
                id="tailoredResumeId"
                name="tailoredResumeId"
                hx-post={`${basePath}/admin/chats/autofill`}
                hx-trigger="change"
                hx-swap="none"
              >
                <option value="" selected>
                  Master CV
                </option>
                {resumes.map((r) => (
                  <option value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div class="actions">
            <button type="submit" class="btn">
              Create
            </button>
          </div>
        </form>
      </div>
      <div class="chats-side">
        <TestPanel basePath={basePath} />
        <dl class="stats">
          <div class="stat">
            <dt>Public questions today</dt>
            <dd id="public-questions">{counts.publicQuestionsToday}</dd>
          </div>
          <div class="stat">
            <dt>Active recruiter chats</dt>
            <dd id="active-chats">{counts.activeChats}</dd>
          </div>
        </dl>
      </div>
    </div>
  </Layout>
);
