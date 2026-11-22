import { Hono } from "hono";
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import type { PrintData } from "../services/resume.service.js";

const CSS = (pageSize: string) => `
@page { size: ${pageSize}; margin: 16mm 18mm; }
body { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.4; color: #000; background: #fff; margin: 0 auto; max-width: 48rem; padding: 1rem; }
h1 { font-size: 20pt; margin: 0 0 0.25rem; }
h2 { font-size: 13pt; margin: 1rem 0 0.25rem; border-bottom: 1px solid #000; }
h3 { font-size: 11.5pt; margin: 0.75rem 0 0.2rem; }
ul.contact { list-style: none; margin: 0 0 0.75rem; padding: 0; display: flex; flex-wrap: wrap; gap: 0 1.25rem; }
a { color: inherit; }
.screen-only { font-family: system-ui, sans-serif; }
.banner { padding: 0.75rem 1rem; border: 1px solid #c0392b; background: #fdecea; color: #7b241c; margin-bottom: 1rem; }
@media print {
  .screen-only { display: none !important; }
  body { max-width: none; padding: 0; }
}
`;

const PRINT_JS = `document.getElementById("print-button")?.addEventListener("click", () => window.print());
`;

const PrintPage: FC<{ basePath: string; data: PrintData }> = ({ basePath, data }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>{data.fullName || "Resume"}</title>
      <style>{raw(CSS(data.pageSize === "Letter" ? "Letter" : "A4"))}</style>
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

const noindex = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** Mounted at `/admin`. Defines `/profile/print` and the resume print and download routes. */
export const printRouter = new Hono<Env>();

printRouter.get("/print/print.js", (c) =>
  c.body(PRINT_JS, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

printRouter.get("/profile/print", async (c) => {
  const data = await c.var.services.resumes.profilePrintData();
  c.header("Cache-Control", noindex["Cache-Control"]);
  c.header("X-Robots-Tag", noindex["X-Robots-Tag"]);
  return c.html(<PrintPage basePath={c.var.config.basePath} data={data} />);
});

printRouter.get("/resumes/:id/print", async (c) => {
  const data = await c.var.services.resumes.printData(c.req.param("id"));
  c.header("Cache-Control", noindex["Cache-Control"]);
  c.header("X-Robots-Tag", noindex["X-Robots-Tag"]);
  return c.html(<PrintPage basePath={c.var.config.basePath} data={data} />);
});

printRouter.get("/resumes/:id/download.md", async (c) => {
  const { filename, text } = await c.var.services.resumes.download(c.req.param("id"));
  return c.body(text, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    ...noindex,
  });
});
