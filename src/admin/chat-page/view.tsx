import { Layout, PageHeader } from "../layout.js";

export const ChatPage = ({
  basePath,
  faviconUrl,
  token,
}: {
  basePath: string;
  faviconUrl?: string;
  token: string;
}) => (
  <Layout title="Recruiter chat" basePath={basePath} faviconUrl={faviconUrl} section="chats">
    <script src={`${basePath}/admin/chat/page.js`} defer />
    <div id="chat-page" class="flex flex-col gap-6" data-base={basePath} data-token={token}>
      <PageHeader
        eyebrow="Test chat"
        title="Recruiter chat"
        sub="Internal test page. Questions count against the link quota."
      >
        <span class="page-sub">
          <span id="who" /> Remaining: <strong id="remaining">-</strong>
        </span>
      </PageHeader>
      <p id="status" class="status" role="status" />
      <div id="log" class="chat-log" aria-live="polite" />
      <form id="ask" class="card-pad">
        <div class="field">
          <label class="field-label" for="question">
            Question
          </label>
          <textarea class="input" id="question" name="question" rows={3} required />
        </div>
        <div class="actions">
          <button type="submit" class="btn" id="send">
            Send
          </button>
        </div>
      </form>
    </div>
  </Layout>
);
