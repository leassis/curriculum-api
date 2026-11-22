import { Layout } from "../layout.js";

const CSS = `
#log { border: 1px solid #ddd; background: #fff; padding: 0.75rem 1rem; min-height: 8rem; }
.msg { white-space: pre-wrap; margin: 0.5rem 0; }
.msg.user { font-weight: 600; }
#question { width: 100%; box-sizing: border-box; }
`;

export const ChatPage = ({ basePath, token }: { basePath: string; token: string }) => (
  <Layout title="Recruiter chat" basePath={basePath}>
    <style>{CSS}</style>
    <script src={`${basePath}/admin/chat/page.js`} defer />
    <div id="chat-page" data-base={basePath} data-token={token}>
      <h1>
        Recruiter chat <small id="who" />
      </h1>
      <p>
        Internal test page. Questions count against the link quota. Remaining:{" "}
        <strong id="remaining">-</strong>
      </p>
      <p id="status" role="status" />
      <div id="log" aria-live="polite" />
      <form id="ask">
        <p>
          <label for="question">Question</label>
          <textarea id="question" name="question" rows={3} required />
        </p>
        <button type="submit" id="send">
          Send
        </button>
      </form>
    </div>
  </Layout>
);
