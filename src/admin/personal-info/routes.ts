import { Hono } from "hono";
import type { Env } from "../../env.js";
import { ValidationError } from "../../services/errors.js";
import { type PersonalInfoUpdate, VISIBILITIES } from "../../services/personal-info.service.js";
import { UI_JS } from "../static/personal-info-js.generated.js";
import { List, PersonalInfoPage, RevealedValue, Row } from "./view.js";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sortOrderOf(value: unknown): number | undefined {
  const raw = text(value).trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    throw new ValidationError("Invalid sortOrder: must be an integer", {
      sortOrder: "must be an integer",
    });
  }
  return n;
}

/** Mounted at `/admin`. */
export const personalInfoRouter = new Hono<Env>();

personalInfoRouter.get("/personal-info", async (c) =>
  c.html(
    PersonalInfoPage({
      basePath: c.var.config.basePath,
      faviconUrl: c.var.config.faviconUrl,
      fields: await c.var.services.personalInfo.list(),
      visibilities: VISIBILITIES,
    }),
  ),
);

personalInfoRouter.get("/personal-info/ui.js", (c) =>
  c.body(UI_JS, 200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "no-cache",
  }),
);

personalInfoRouter.post("/personal-info", async (c) => {
  const service = c.var.services.personalInfo;
  const body = await c.req.parseBody();
  await service.create({
    key: text(body.key).trim(),
    label: text(body.label),
    value: text(body.value),
    visibility: text(body.visibility),
    sortOrder: sortOrderOf(body.sortOrder),
  });
  return c.html(
    List({
      base: `${c.var.config.basePath}/admin/personal-info`,
      fields: await service.list(),
      visibilities: VISIBILITIES,
    }),
  );
});

personalInfoRouter.put("/personal-info/:key", async (c) => {
  const body = await c.req.parseBody();
  const patch: PersonalInfoUpdate = {
    label: text(body.label),
    visibility: text(body.visibility),
    sortOrder: sortOrderOf(body.sortOrder),
  };
  const value = text(body.value);
  if (value !== "") patch.value = value;
  const field = await c.var.services.personalInfo.update(c.req.param("key"), patch);
  return c.html(
    Row({
      base: `${c.var.config.basePath}/admin/personal-info`,
      field,
      visibilities: VISIBILITIES,
    }),
  );
});

personalInfoRouter.delete("/personal-info/:key", async (c) => {
  await c.var.services.personalInfo.delete(c.req.param("key"));
  return c.html("");
});

personalInfoRouter.get("/personal-info/:key/reveal", async (c) => {
  const value = await c.var.services.personalInfo.reveal(c.req.param("key"));
  c.header("Cache-Control", "no-store");
  return c.html(RevealedValue({ value }));
});
