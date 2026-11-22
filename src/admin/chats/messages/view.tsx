import { Layout } from "../../layout.js";

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

const BLOCK = "white-space: pre-wrap; overflow-wrap: anywhere; margin: 0.25rem 0 0;";

/** Messages render as plain text: JSX escapes every character, no markdown, no raw HTML. */
export const MessagesPage = ({
  basePath,
  transcript: { chat, messages },
}: {
  basePath: string;
  transcript: {
    chat: { recruiterName: string };
    messages: { role: string; content: string; createdAt: Date }[];
  };
}) => (
  <Layout title="Chat messages" basePath={basePath}>
    <p>
      <a href={`${basePath}/admin/chats`}>Back to chats</a>
    </p>
    <h1>Messages for {chat.recruiterName}</h1>
    <p id="message-count">{messages.length} messages</p>
    {messages.length === 0 ? (
      <p>No messages yet</p>
    ) : (
      <ol id="messages" style="list-style: none; padding: 0;">
        {messages.map((m) => (
          <li data-role={m.role} style="margin-bottom: 1rem;">
            <strong>{m.role === "user" ? "Recruiter" : "Assistant"}</strong>{" "}
            <time datetime={m.createdAt.toISOString()}>{stamp(m.createdAt)}</time>
            <pre style={BLOCK}>{m.content}</pre>
          </li>
        ))}
      </ol>
    )}
  </Layout>
);
