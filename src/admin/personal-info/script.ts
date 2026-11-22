/** HTMX does not swap 4xx responses; this lets error fragments land in `#pi-error`. */
export const UI_JS = `document.body.addEventListener("htmx:beforeSwap", function (e) {
  var box = document.getElementById("pi-error");
  if (!box) return;
  var status = e.detail.xhr.status;
  if (status >= 400 && status < 500 && status !== 401) {
    e.detail.shouldSwap = true;
    e.detail.isError = false;
    e.detail.target = box;
    e.detail.swapOverride = "innerHTML";
  } else if (status >= 200 && status < 300) {
    box.innerHTML = "";
  }
});
`;
