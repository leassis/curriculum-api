import { Hono } from "hono";
import type { Env } from "../../env.js";
import { PRINT_JS } from "../static/print-js.generated.js";
import { PrintPage } from "./view.js";

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
  const basePath = c.var.config.basePath;
  const back = { href: `${basePath}/admin/profile`, label: "Back to profile" };
  return c.html(PrintPage({ basePath, data, back, faviconUrl: c.var.config.faviconUrl }));
});

printRouter.get("/resumes/:id/print", async (c) => {
  const id = c.req.param("id");
  const data = await c.var.services.resumes.printData(id);
  c.header("Cache-Control", noindex["Cache-Control"]);
  c.header("X-Robots-Tag", noindex["X-Robots-Tag"]);
  const basePath = c.var.config.basePath;
  const back = { href: `${basePath}/admin/resumes/${id}`, label: "Back to resume" };
  return c.html(PrintPage({ basePath, data, back, faviconUrl: c.var.config.faviconUrl }));
});

printRouter.get("/resumes/:id/download.md", async (c) => {
  const { filename, text } = await c.var.services.resumes.download(c.req.param("id"));
  return c.body(text, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    ...noindex,
  });
});
