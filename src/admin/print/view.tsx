import { raw } from "hono/html";
import { printCss } from "./style.js";

/** Everything the Print View shows, already resolved and sanitized. */
export interface PrintView {
  fullName: string;
  header: { label: string; value: string }[];
  bodyHtml: string;
  empty: boolean;
  warnings: string[];
  pageSize: string;
}

export const PrintPage = ({
  basePath,
  data,
  back,
  faviconUrl,
}: {
  basePath: string;
  faviconUrl?: string;
  data: PrintView;
  back: { href: string; label: string };
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>{data.fullName || "Resume"}</title>
      {faviconUrl ? <link rel="icon" href={faviconUrl} /> : null}
      <style>{raw(printCss(data.pageSize === "Letter" ? "Letter" : "A4"))}</style>
      <script src={`${basePath}/admin/print/print.js`} defer />
    </head>
    <body>
      {data.warnings.length > 0 ? (
        <div class="screen-only banner" role="alert">
          Warning: your {data.warnings.join(", ")} appears in the body. Keep contact data in
          Personal info.
        </div>
      ) : null}
      <p class="screen-only">
        <button id="print-button" type="button">
          Print / Save as PDF
        </button>
      </p>
      <p class="screen-only">
        <a id="print-back" href={back.href}>
          {back.label}
        </a>
        {" · "}
        Tip: in the print dialog turn off Headers and footers so the browser adds no URL or date.
      </p>
      <header>
        <h1>{data.fullName}</h1>
        <ul class="contact">
          {data.header.map((item) => (
            <li>
              {item.label}: {item.value}
            </li>
          ))}
        </ul>
      </header>
      <main>{data.empty ? <p>This resume is empty</p> : raw(data.bodyHtml)}</main>
    </body>
  </html>
);
