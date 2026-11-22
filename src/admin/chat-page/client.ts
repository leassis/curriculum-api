/**
 * The recruiter chat page script, served at `/admin/chat/page.js` (CSP `script-src 'self'`).
 * Every piece of text, model answers and names included, is written with `textContent`; the script
 * never builds HTML. Compiled by `pnpm build:js` into `src/admin/static/chat-page-js.generated.ts`.
 */

interface OpeningInfo {
  recruiterName: string;
  company?: string | null;
  remaining?: number | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** An Error whose message is safe to show, from a failed response. */
interface StatusError extends Error {
  status?: number;
}

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

const root = byId("chat-page");
const base = root.dataset.base;
const token = encodeURIComponent(root.dataset.token as string);
const apiUrl = `${base}/api/r/${token}`;
const sessionUrl = `${base}/admin/chat/${token}/session`;
const who = byId("who");
const remaining = byId("remaining");
const status = byId("status");
const log = byId("log");
const form = byId("ask");
const question = byId("question") as HTMLTextAreaElement | HTMLInputElement;
const send = byId("send") as HTMLButtonElement;
const history: ChatMessage[] = [];
let busy = false;
let dead = false;

const MESSAGES: Record<string, string> = {
  chat_revoked: "This link was revoked.",
  chat_expired: "This link has expired.",
  limit_reached: "The question quota for this link is used up.",
  llm_unavailable: "The model is unavailable. The question was not counted. Try again.",
  not_found: "This link does not exist.",
  unauthorized: "The chat session was not accepted.",
};

function setStatus(text: string): void {
  status.textContent = text;
}

function lock(on: boolean): void {
  busy = on;
  send.disabled = on;
  question.disabled = on;
}

function addMessage(role: string, text: string): HTMLElement {
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  node.textContent = text;
  log.appendChild(node);
  return node;
}

function failure(res: Response): Promise<StatusError> {
  const done = (code: string | undefined): StatusError => {
    let text = code ? MESSAGES[code] : undefined;
    if (!text) {
      text = res.status === 400 ? "The request was rejected." : `Request failed (${res.status}).`;
    }
    const error: StatusError = new Error(text);
    error.status = res.status;
    return error;
  };
  return res.json().then(
    (body: { error?: string } | null) => done(body?.error),
    () => done(undefined),
  );
}

function startSession(): Promise<void> {
  return fetch(sessionUrl, { method: "POST", credentials: "same-origin" }).then((res) => {
    if (res.redirected) throw new Error("Your admin session ended. Sign in again.");
    if (res.status === 410) throw new Error("This link is revoked or expired.");
    if (res.status === 404) throw new Error(MESSAGES.not_found);
    if (!res.ok) throw new Error(`Could not start the chat session (${res.status}).`);
  });
}

function postChat(messages: ChatMessage[]): Promise<Response> {
  return fetch(`${apiUrl}/chat`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

function setRemaining(value: string | number | null | undefined): void {
  if (value !== null && value !== undefined) remaining.textContent = String(value);
}

function open(): Promise<void> {
  return fetch(apiUrl, { credentials: "same-origin" })
    .then((res) =>
      res.ok
        ? (res.json() as Promise<OpeningInfo>)
        : failure(res).then((e) => {
            throw e;
          }),
    )
    .then((info) => {
      who.textContent = info.recruiterName + (info.company ? ` (${info.company})` : "");
      setRemaining(info.remaining);
      return startSession();
    })
    .catch((error: Error) => {
      setStatus(error.message);
      dead = true;
      lock(true);
    });
}

function readStream(res: Response, node: HTMLElement): Promise<string> {
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let text = "";
  function pump(): Promise<string> {
    return reader.read().then((chunk) => {
      if (chunk.done) {
        text += decoder.decode();
        node.textContent = text;
        return text;
      }
      text += decoder.decode(chunk.value, { stream: true });
      node.textContent = text;
      return pump();
    });
  }
  return pump();
}

function ask(text: string): Promise<void> {
  const messages: ChatMessage[] = history.concat([{ role: "user", content: text }]);
  let retried = false;
  function attempt(): Promise<Response> {
    return postChat(messages).then((res) => {
      if (res.status === 401 && !retried) {
        retried = true;
        return startSession().then(attempt);
      }
      return res;
    });
  }
  const mine = addMessage("user", text);
  let reply: HTMLElement | null = null;
  return attempt()
    .then((res) => {
      if (!res.ok) {
        return failure(res).then((e) => {
          throw e;
        });
      }
      setRemaining(res.headers.get("X-Remaining"));
      reply = addMessage("assistant", "");
      return readStream(res, reply);
    })
    .then((answer) => {
      history.push({ role: "user", content: text }, { role: "assistant", content: answer });
      question.value = "";
      setStatus("");
    })
    .catch((error: StatusError) => {
      log.removeChild(mine);
      if (reply) log.removeChild(reply);
      setStatus(error.status ? error.message : `The connection was interrupted. ${error.message}`);
      if (error.status === 410) dead = true;
    });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = question.value.trim();
  if (busy || text === "") return;
  setStatus("");
  lock(true);
  ask(text).then(() => {
    lock(dead);
    if (!dead) question.focus();
  });
});

setStatus("Loading...");
open().then(() => {
  if (status.textContent === "Loading...") setStatus("");
});

export {};
