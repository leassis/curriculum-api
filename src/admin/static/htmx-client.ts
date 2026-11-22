/** Browser-side helpers shared by the admin page scripts; bundled into each, never served alone. */

interface BeforeSwapDetail {
  xhr: XMLHttpRequest;
  shouldSwap: boolean;
  isError: boolean;
  target: Element;
  swapOverride: string;
}

export type BeforeSwapEvent = CustomEvent<BeforeSwapDetail>;

/** HTMX does not swap 4xx/5xx responses; this lets error fragments land in the element `id`. */
export function swapErrorsInto(id: string): void {
  document.addEventListener("htmx:beforeSwap", (e) => {
    const { detail } = e as BeforeSwapEvent;
    const target = document.getElementById(id);
    if (detail.xhr.status >= 400 && target) {
      detail.shouldSwap = true;
      detail.isError = false;
      detail.target = target;
      detail.swapOverride = "innerHTML";
    }
  });
}
