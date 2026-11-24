/**
 * Upgrades the server-rendered save/error feedback into floating toasts (Notyf, bundled here).
 * The markup stays in the page (tagged `data-toast="success|error"`) so it still works without
 * JS; once this runs, CSS hides it and the message is shown as a toast instead.
 * Compiled by `pnpm build:js` into `src/admin/static/toast-js.generated.ts`.
 */
import { Notyf } from "notyf";

type Kind = "success" | "error";

/** htmx targets whose swapped-in text is feedback (a plain "Saved", or an error fragment). */
const STATUS_IDS = new Set(["editor-status", "chat-status", "pi-error"]);

const notyf = new Notyf({
  duration: 3500,
  dismissible: true,
  position: { x: "right", y: "bottom" },
  types: [
    { type: "success", background: "var(--color-success)", duration: 3500 },
    { type: "error", background: "var(--color-danger)", duration: 6000 },
  ],
});

function show(kind: Kind, message: string): void {
  const text = message.trim();
  if (text) notyf[kind](text);
}

/** Toasts the text of a status target (error when it holds an error element). */
function flush(target: Element, failed = false): void {
  show(
    failed || target.querySelector(".error, .text-danger") ? "error" : "success",
    target.textContent ?? "",
  );
  target.textContent = "";
}

/** Toasts every not-yet-shown `[data-toast]` element under `root`. */
function scan(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-toast]:not([data-toasted])")) {
    el.dataset.toasted = "true";
    show(el.dataset.toast === "error" ? "error" : "success", el.textContent ?? "");
  }
}

document.documentElement.classList.add("toast-ready");
scan(document);

/** A save redirects to `?saved=1`; drop it once shown so a refresh does not toast again. */
try {
  const url = new URL(window.location.href);
  if (url.searchParams.has("saved")) {
    url.searchParams.delete("saved");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
} catch {
  // ignore: worst case the toast repeats on refresh
}

for (const id of STATUS_IDS) {
  const target = document.getElementById(id);
  if (target?.textContent?.trim()) flush(target);
}

/**
 * htmx skips 4xx responses; forms marked `data-swap-errors` answer a rejected save with the
 * re-rendered form (and its error line), so swap it in.
 */
document.addEventListener("htmx:beforeSwap", (e) => {
  const detail = (
    e as CustomEvent<{
      target: Element;
      xhr: XMLHttpRequest;
      shouldSwap: boolean;
      isError: boolean;
    }>
  ).detail;
  if (detail.xhr.status === 400 && detail.target.hasAttribute("data-swap-errors")) {
    detail.shouldSwap = true;
    detail.isError = false;
  }
});

document.addEventListener("htmx:afterSwap", (e) => {
  const detail = (e as CustomEvent<{ target: Element; xhr: XMLHttpRequest }>).detail;
  const target = detail.target;
  if (!STATUS_IDS.has(target.id)) {
    // A replaced target is detached, so scan the whole document for the swapped-in markers.
    scan(document);
    return;
  }
  if (target.querySelector("[data-toast]")) {
    scan(target);
    target.textContent = "";
  } else {
    // The text lives on as a toast; keep the (hidden) target empty for the next swap.
    flush(target, detail.xhr.status >= 400);
  }
});
