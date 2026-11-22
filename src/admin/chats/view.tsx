import { Layout } from "../layout.js";

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
      <td>{chat.recruiterName}</td>
      <td>{chat.company ?? ""}</td>
      <td>
        {chat.used}/{chat.maxQuestions}
      </td>
      <td>{chat.status}</td>
      <td>{stamp(chat.expiresAt)}</td>
      <td>{stamp(chat.lastUsedAt)}</td>
      <td>
        <a href={`${url}/messages`}>Messages</a>{" "}
        <button type="button" data-copy={linkFor(origin, chat)}>
          Copy link
        </button>{" "}
        <button type="button" hx-patch={`${url}/revoke`} hx-target="closest tr" hx-swap="outerHTML">
          Revoke
        </button>{" "}
        <button type="button" hx-patch={`${url}/reset`} hx-target="closest tr" hx-swap="outerHTML">
          Reset
        </button>{" "}
        <button
          type="button"
          hx-delete={url}
          hx-confirm={`Delete chat for ${chat.recruiterName}?`}
          hx-target="closest tr"
          hx-swap="outerHTML"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

export const Created = (p: { basePath: string; origin: string; chat: ChatView }) => (
  <div id="created">
    <p>
      Recruiter Link for {p.chat.recruiterName}: <code>{linkFor(p.origin, p.chat)}</code>{" "}
      <button type="button" data-copy={linkFor(p.origin, p.chat)}>
        Copy
      </button>
    </p>
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
      <td colspan={7}>No recruiter chats yet</td>
    </tr>
  ) : (
    // biome-ignore lint/complexity/noUselessFragments: c.html needs a single node, not an array
    <>
      {chats.map((chat) => (
        <ChatRow basePath={basePath} origin={origin} chat={chat} />
      ))}
    </>
  );

export const ChatsPage = ({
  basePath,
  origin,
  chats,
  resumes,
  defaultMax,
}: {
  basePath: string;
  origin: string;
  chats: ChatView[];
  resumes: ResumeChoice[];
  defaultMax: number;
}) => (
  <Layout title="Chats" basePath={basePath}>
    <h1>Recruiter chats</h1>
    <script src={`${basePath}/admin/chats/chats.js`} />
    <p id="chat-status" role="status" />
    <table>
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
    <h2>New chat</h2>
    <div id="created" />
    <form hx-post={`${basePath}/admin/chats`} hx-target="#created" hx-swap="outerHTML">
      <p>
        <label for="recruiterName">Recruiter name</label>
        <br />
        <input id="recruiterName" type="text" name="recruiterName" size={40} required />
      </p>
      <p>
        <label for="company">Company</label>
        <br />
        <input id="company" type="text" name="company" size={40} />
      </p>
      <p>
        <label for="jobDescriptionShort">Job Description (max 2000 characters)</label>
        <br />
        <textarea id="jobDescriptionShort" name="jobDescriptionShort" rows={6} cols={60} />
      </p>
      <p>
        <label for="maxQuestions">Max questions</label>
        <br />
        <input
          id="maxQuestions"
          type="number"
          name="maxQuestions"
          min={1}
          max={100}
          value={defaultMax}
        />
      </p>
      <p>
        <label for="expiresAt">Expires at</label>
        <br />
        <input id="expiresAt" type="datetime-local" name="expiresAt" />
      </p>
      <p>
        <label for="tailoredResumeId">Resume</label>
        <br />
        <select id="tailoredResumeId" name="tailoredResumeId">
          <option value="" selected>
            Master CV
          </option>
          {resumes.map((r) => (
            <option value={r.id}>{r.title}</option>
          ))}
        </select>
      </p>
      <button type="submit">Create</button>
    </form>
  </Layout>
);
