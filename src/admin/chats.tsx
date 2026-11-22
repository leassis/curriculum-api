import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import type { RecruiterChat, ResumeOption } from "../services/recruiter-chat.service.js";
import { Layout } from "./layout.js";

const stamp = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace("T", " ") : "");

/** The Recruiter Link: the site and the API share one origin, so it is `<origin>/r/<token>`. */
const linkFor = (origin: string, chat: RecruiterChat) => `${origin}/r/${chat.token}`;

const ChatRow: FC<{ basePath: string; origin: string; chat: RecruiterChat }> = ({
  basePath,
  origin,
  chat,
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

const Created: FC<{ basePath: string; origin: string; chat: RecruiterChat }> = (p) => (
  <div id="created">
    <p>
      Recruiter Link for {p.chat.recruiterName}: <code>{linkFor(p.origin, p.chat)}</code>{" "}
      <button type="button" data-copy={linkFor(p.origin, p.chat)}>
        Copy
      </button>
    </p>
  </div>
);

const Rows: FC<{ basePath: string; origin: string; chats: RecruiterChat[] }> = ({
  basePath,
  origin,
  chats,
}) =>
  chats.length === 0 ? (
    <tr>
      <td colspan={7}>No recruiter chats yet</td>
    </tr>
  ) : (
    <>
      {chats.map((chat) => (
        <ChatRow basePath={basePath} origin={origin} chat={chat} />
      ))}
    </>
  );

const ListPage: FC<{
  basePath: string;
  origin: string;
  chats: RecruiterChat[];
  resumes: ResumeOption[];
  defaultMax: number;
}> = ({ basePath, origin, chats, resumes, defaultMax }) => (
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

/** Copies a link on click; shows a failed request in the status line instead of dropping it. */
const CHATS_JS = `document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-copy]");
  if (button && navigator.clipboard) {
    navigator.clipboard.writeText(button.dataset.copy).then(() => {
      button.textContent = "Copied";
    });
  }
});
document.addEventListener("htmx:beforeSwap", (e) => {
  const target = document.getElementById("chat-status");
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
export const chatsRouter = new Hono<Env>();

chatsRouter.get("/chats/chats.js", (c) =>
  c.body(CHATS_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

chatsRouter.get("/chats", async (c) => {
  const { config, services } = c.var;
  return c.html(
    <ListPage
      basePath={config.basePath}
      origin={new URL(c.req.url).origin}
      chats={await services.recruiterChat.list()}
      resumes={await services.recruiterChat.resumeOptions()}
      defaultMax={await services.settings.limit("recruiterQuestionsDefault")}
    />,
  );
});

chatsRouter.get("/chats/rows", async (c) =>
  c.html(
    <Rows
      basePath={c.var.config.basePath}
      origin={new URL(c.req.url).origin}
      chats={await c.var.services.recruiterChat.list()}
    />,
  ),
);

chatsRouter.post("/chats", async (c) => {
  const body = await c.req.parseBody();
  const max = text(body.maxQuestions).trim();
  const chat = await c.var.services.recruiterChat.create({
    recruiterName: text(body.recruiterName),
    company: text(body.company),
    jobDescriptionShort: text(body.jobDescriptionShort),
    maxQuestions: max === "" ? undefined : Number(max),
    expiresAt: text(body.expiresAt),
    tailoredResumeId: text(body.tailoredResumeId),
  });
  c.header("HX-Trigger", "chats-changed");
  return c.html(
    <Created basePath={c.var.config.basePath} origin={new URL(c.req.url).origin} chat={chat} />,
  );
});

chatsRouter.patch("/chats/:id/revoke", async (c) => {
  const chat = await c.var.services.recruiterChat.revoke(c.req.param("id"));
  return c.html(
    <ChatRow basePath={c.var.config.basePath} origin={new URL(c.req.url).origin} chat={chat} />,
  );
});

chatsRouter.patch("/chats/:id/reset", async (c) => {
  const chat = await c.var.services.recruiterChat.reset(c.req.param("id"));
  return c.html(
    <ChatRow basePath={c.var.config.basePath} origin={new URL(c.req.url).origin} chat={chat} />,
  );
});

chatsRouter.delete("/chats/:id", async (c) => {
  await c.var.services.recruiterChat.delete(c.req.param("id"));
  return c.body(null, 200);
});
