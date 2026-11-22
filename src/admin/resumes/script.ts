/** Shows a failed save or generate in the status line instead of dropping the response. */
export const EDITOR_JS = `document.addEventListener("htmx:beforeSwap", (e) => {
  const target = document.getElementById("editor-status");
  if (e.detail.xhr.status >= 400 && target) {
    e.detail.shouldSwap = true;
    e.detail.isError = false;
    e.detail.target = target;
    e.detail.swapOverride = "innerHTML";
  }
});
`;
