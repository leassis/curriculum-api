import { Layout, PageHeader } from "../../layout.js";

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

const BLOCK = "white-space: pre-wrap; overflow-wrap: anywhere; margin: 0.25rem 0 0;";

/** Messages render as plain text: JSX escapes every character, no markdown, no raw HTML. */
export const MessagesPage = ({
  basePath,
  faviconUrl,
  transcript: { chat, messages },
}: {
  basePath: string;
  faviconUrl?: string;
  transcript: {
    chat: { recruiterName: string };
    messages: { role: string; content: string; createdAt: Date }[];
  };
}) => (
  <Layout title="Chat messages" basePath={basePath} faviconUrl={faviconUrl} section="chats">
    <a class="back-link" href={`${basePath}/admin/chats`}>
      ← Back to chats
    </a>
    <PageHeader eyebrow="Transcript" title={`Messages for ${chat.recruiterName}`}>
      <p class="page-sub" id="message-count">
        {messages.length} messages
      </p>
    </PageHeader>
    {messages.length === 0 ? (
      <p class="empty-state">No messages yet</p>
    ) : (
      <ol id="messages" class="transcript">
        {messages.map((m) => (
          <li data-role={m.role}>
            <strong>{m.role === "user" ? "Recruiter" : "Assistant"}</strong>{" "}
            <time datetime={m.createdAt.toISOString()}>{stamp(m.createdAt)}</time>
            <pre style={BLOCK}>{m.content}</pre>
          </li>
        ))}
      </ol>
    )}
  </Layout>
);
