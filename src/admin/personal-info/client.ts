/**
 * HTMX does not swap 4xx responses; this lets error fragments land in `#pi-error`.
 * Compiled by `pnpm build:js` into `src/admin/static/personal-info-js.generated.ts`.
 */
import type { BeforeSwapEvent } from "../static/htmx-client";

document.body.addEventListener("htmx:beforeSwap", (e) => {
  const box = document.getElementById("pi-error");
  if (!box) return;
  const { detail } = e as BeforeSwapEvent;
  const status = detail.xhr.status;
  if (status >= 400 && status < 500 && status !== 401) {
    detail.shouldSwap = true;
    detail.isError = false;
    detail.target = box;
    detail.swapOverride = "innerHTML";
  } else if (status >= 200 && status < 300) {
    box.textContent = "";
  }
});
