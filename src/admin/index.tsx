import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { ResolvedConfig } from "../config.js";
import type { Services } from "../container.js";
import type { Env } from "../env.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { DomainError, ForbiddenError } from "../services/errors.js";
import { chatPageRouter } from "./chat-page/routes.js";
import { messagesRouter } from "./chats/messages/routes.js";
import { chatsRouter } from "./chats/routes.js";
import { dashboardRouter } from "./dashboard/routes.js";
import { ErrorFragment } from "./error-fragment.js";
import { loginRouter } from "./login/routes.js";
import { personalInfoRouter } from "./personal-info/routes.js";
import { printRouter } from "./print/routes.js";
import { profileRouter } from "./profile/routes.js";
import { resumesRouter } from "./resumes/routes.js";
import { settingsRouter } from "./settings/routes.js";
import adminCss from "./static/admin-css.generated.js";
import { FONTS } from "./static/fonts.generated.js";
import htmx from "./static/htmx.generated.js";

const decodedFonts = new Map<string, Uint8Array<ArrayBuffer>>();

/** Decodes a vendored font once per instance. */
function fontBytes(name: string): Uint8Array<ArrayBuffer> | undefined {
  const base64 = FONTS[name];
  if (base64 === undefined) return undefined;
  let bytes = decodedFonts.get(name);
  if (!bytes) {
    bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    decodedFonts.set(name, bytes);
  }
  return bytes;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Rejects a state-changing request whose Origin differs from the request origin. */
const sameOrigin = createMiddleware<Env>(async (c, next) => {
  if (!SAFE_METHODS.has(c.req.method)) {
    const origin = c.req.header("Origin");
    if (origin !== undefined && origin !== new URL(c.req.url).origin) {
      throw new ForbiddenError("Cross-origin request rejected");
    }
  }
  await next();
});

/** The `/admin` router. Loaded lazily by `src/app.ts`. */
export function adminRouter(config: ResolvedConfig, services: Services): Hono<Env> {
  const admin = new Hono<Env>().basePath(`${config.basePath}/admin`);

  admin.onError((error, c) => {
    if (error instanceof DomainError) {
      const message = error.status >= 500 ? "Something went wrong" : error.message;
      if (error.status >= 500) console.error(error);
      return c.html(<ErrorFragment message={message} />, error.status as 400);
    }
    console.error(error);
    return c.html(<ErrorFragment message="Something went wrong" />, 500);
  });

  admin.use("*", async (c, next) => {
    c.set("config", config);
    c.set("services", services);
    await next();
  });
  admin.use("*", sameOrigin);
  admin.get("/static/htmx.min.js", (c) =>
    c.body(htmx, 200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    }),
  );
  admin.get("/static/admin.css", (c) =>
    c.body(adminCss, 200, {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    }),
  );
  admin.get("/static/fonts/:file", (c) => {
    const bytes = fontBytes(c.req.param("file"));
    if (!bytes) return c.notFound();
    return c.body(bytes, 200, {
      "Content-Type": "font/woff2",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });
  admin.use("*", requireAdmin);

  admin.route("/", loginRouter);
  admin.route("/", dashboardRouter);
  admin.route("/", profileRouter);
  admin.route("/", settingsRouter);
  admin.route("/", personalInfoRouter);
  admin.route("/", chatsRouter);
  admin.route("/", chatPageRouter);
  admin.route("/", messagesRouter);
  admin.route("/", resumesRouter);
  admin.route("/", printRouter);
  return admin;
}
