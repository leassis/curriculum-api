/**
 * Replaces the browser's `window.confirm` behind `hx-confirm` with a styled `<dialog>`.
 * The `hx-confirm` attributes stay as they are; without JS htmx is not running either.
 * A trigger inside a danger button (`.btn-danger`, `.icon-btn-danger`) gets a red confirm button.
 */

interface ConfirmDetail {
  question: string | null;
  elt: Element;
  issueRequest: (skipConfirmation?: boolean) => void;
}

let dialog: HTMLDialogElement | null = null;

function build(): HTMLDialogElement {
  const el = document.createElement("dialog");
  el.className = "confirm-dialog";
  el.setAttribute("aria-labelledby", "confirm-message");
  el.innerHTML = `<form method="dialog" class="confirm-body">
  <p id="confirm-message" class="confirm-message"></p>
  <div class="confirm-actions">
    <button type="submit" value="cancel" class="btn-ghost" autofocus>Cancel</button>
    <button type="submit" value="ok" class="btn confirm-ok">Confirm</button>
  </div>
</form>`;
  // A click on the backdrop (the dialog box itself, outside the form) cancels.
  el.addEventListener("click", (e) => {
    if (e.target === el) el.close("cancel");
  });
  document.body.append(el);
  return el;
}

/** Shows the question; resolves true only when the Owner picks Confirm. */
export function ask(question: string, danger: boolean): Promise<boolean> {
  dialog ??= build();
  const box = dialog;
  const message = box.querySelector(".confirm-message") as HTMLElement;
  const ok = box.querySelector(".confirm-ok") as HTMLButtonElement;
  message.textContent = question;
  ok.textContent = danger ? "Delete" : "Confirm";
  ok.classList.toggle("confirm-ok-danger", danger);
  box.returnValue = "cancel";
  box.showModal();
  return new Promise((resolve) => {
    box.addEventListener("close", () => resolve(box.returnValue === "ok"), { once: true });
  });
}

export function installConfirm(): void {
  if (typeof HTMLDialogElement === "undefined") return;
  document.addEventListener("htmx:confirm", (e) => {
    const detail = (e as CustomEvent<ConfirmDetail>).detail;
    if (!detail.question) return;
    e.preventDefault();
    const danger = detail.elt.closest(".btn-danger, .icon-btn-danger") !== null;
    void ask(detail.question, danger).then((yes) => {
      if (yes) detail.issueRequest(true);
    });
  });
}
