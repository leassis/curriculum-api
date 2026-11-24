/**
 * Copies a link on click; shows a failed request in the status line instead of dropping it.
 * Compiled by `pnpm build:js` into `src/admin/static/chats-js.generated.ts`.
 */
import { swapErrorsInto } from "../static/htmx-client";

document.addEventListener("click", (e) => {
  const button = (e.target as Element).closest<HTMLElement>("[data-copy]");
  if (button && navigator.clipboard) {
    navigator.clipboard.writeText(button.dataset.copy as string).then(() => {
      button.textContent = "Copied";
    });
  }
});
swapErrorsInto("chat-status");

interface TestMessage {
  role: "user" | "assistant";
  content: string;
}

const panel = document.getElementById("test-panel");
if (panel) {
  const url = panel.dataset.url as string;
  const log = document.getElementById("test-log") as HTMLElement;
  const status = document.getElementById("test-status") as HTMLElement;
  const form = document.getElementById("test-ask") as HTMLFormElement;
  const input = document.getElementById("test-question") as HTMLInputElement;
  const send = document.getElementById("test-send") as HTMLButtonElement;
  const history: TestMessage[] = [];

  const bubble = (role: string, text: string): HTMLElement => {
    const node = document.createElement("div");
    node.className = `test-msg ${role}`;
    node.textContent = text;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  };

  const lock = (on: boolean) => {
    send.disabled = on;
    input.disabled = on;
  };

  const ask = async (text: string) => {
    const mine = bubble("user", text);
    let reply: HTMLElement | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }),
      });
      if (res.redirected) throw new Error("Your admin session ended. Sign in again.");
      if (!res.ok || !res.body) {
        throw new Error(
          res.status === 502
            ? "The model is unavailable. Try again."
            : `Request failed (${res.status}).`,
        );
      }
      const node = bubble("assistant", "");
      reply = node;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        answer += decoder.decode(chunk.value, { stream: true });
        node.textContent = answer;
        log.scrollTop = log.scrollHeight;
      }
      answer += decoder.decode();
      node.textContent = answer;
      history.push({ role: "user", content: text }, { role: "assistant", content: answer });
      input.value = "";
      status.textContent = "";
    } catch (error) {
      mine.remove();
      reply?.remove();
      status.textContent = (error as Error).message;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (text === "" || send.disabled) return;
    lock(true);
    ask(text).finally(() => {
      lock(false);
      input.focus();
    });
  });
}
