/** Copies a link on click; shows a failed request in the status line instead of dropping it. */
export const CHATS_JS = `document.addEventListener("click", (e) => {
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
