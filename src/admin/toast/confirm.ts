/**
 * Replaces the browser's `window.confirm` behind `hx-confirm` with the `ConfirmDialog` that the
 * admin layout renders once per page (`#confirm-dialog`). The `hx-confirm` attributes stay as
 * they are. Every `hx-delete` trigger, a trigger inside a danger button (`.btn-danger`,
 * `.icon-btn-danger`) and one marked `data-confirm-danger` get a red button; `data-confirm-ok` names that button (default "Delete"
 * for danger, "Confirm" otherwise). A page without the dialog falls back to `window.confirm`.
 */

interface ConfirmDetail {
  question: string | null;
  elt: Element;
  issueRequest: (skipConfirmation?: boolean) => void;
}

function findDialog(): HTMLDialogElement | null {
  const el = document.getElementById("confirm-dialog");
  return el instanceof HTMLDialogElement ? el : null;
}

/** Shows the question; resolves true only when the Owner picks the confirm button. */
export function ask(question: string, danger: boolean, label?: string): Promise<boolean> {
  const box = findDialog();
  if (!box) return Promise.resolve(window.confirm(question));
  const message = box.querySelector("#confirm-message") as HTMLElement;
  const ok = box.querySelector(".confirm-ok") as HTMLButtonElement;
  const form = box.querySelector("form") as HTMLFormElement;
  message.textContent = question;
  ok.textContent = label || (danger ? "Delete" : "Confirm");
  ok.classList.toggle("confirm-ok-danger", danger);
  // Settled from the events that close the dialog, not from its `close` event: that one is queued
  // and can arrive late, after the next question has already been asked.
  const done = new AbortController();
  const answer = new Promise<boolean>((resolve) => {
    const settle = (yes: boolean) => {
      done.abort();
      resolve(yes);
    };
    const { signal } = done;
    form.addEventListener(
      "submit",
      (e) => settle((e as SubmitEvent).submitter?.getAttribute("value") === "ok"),
      { signal },
    );
    // Escape.
    box.addEventListener("cancel", () => settle(false), { signal });
    // A click on the backdrop (the dialog box itself, outside its form).
    box.addEventListener(
      "click",
      (e) => {
        if (e.target !== box) return;
        box.close("cancel");
        settle(false);
      },
      { signal },
    );
  });
  box.showModal();
  return answer;
}

export function installConfirm(): void {
  document.addEventListener("htmx:confirm", (e) => {
    const detail = (e as CustomEvent<ConfirmDetail>).detail;
    if (!detail.question) return;
    e.preventDefault();
    const danger =
      detail.elt.matches("[hx-delete]") ||
      detail.elt.closest(".btn-danger, .icon-btn-danger, [data-confirm-danger]") !== null;
    const label = detail.elt.closest<HTMLElement>("[data-confirm-ok]")?.dataset.confirmOk;
    void ask(detail.question, danger, label).then((yes) => {
      if (yes) detail.issueRequest(true);
    });
  });
}
