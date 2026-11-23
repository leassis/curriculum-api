/**
 * HTMX does not swap 4xx/5xx responses; the career controls answer a rejected save with the
 * whole `#career-library` fragment (form, entered values, error line), so swap it in.
 * Compiled by `pnpm build:js` into `src/admin/static/career-js.generated.ts`.
 */
import type { BeforeSwapEvent } from "../static/htmx-client";

document.addEventListener("htmx:beforeSwap", (e) => {
  const { detail } = e as BeforeSwapEvent;
  const { status } = detail.xhr;
  if ((status === 400 || status === 503) && detail.target.id === "career-library") {
    detail.shouldSwap = true;
    detail.isError = false;
  }
});
