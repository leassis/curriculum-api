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
