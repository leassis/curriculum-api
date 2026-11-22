import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";
import { type CurriculumApiConfig, type ResolvedConfig, resolveConfig } from "./config.js";
import { createContainer, type Services } from "./container.js";
import type { Env } from "./env.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { healthRouter } from "./routes/health.js";
import { mountOpenApi } from "./routes/openapi.js";
import { publicRouter } from "./routes/public.js";
import { recruiterRouter } from "./routes/recruiter.js";
import { DomainError, NotFoundError, ValidationError } from "./services/errors.js";

/** Test seam: lets a test register extra routes on the `/api` router. */
export type ExtendApi = (api: OpenAPIHono<Env>) => void;

/** Validates the config and builds the app. Performs no I/O. */
export function createApp(config: CurriculumApiConfig): Hono {
  const resolved = resolveConfig(config);
  return buildApp(resolved, createContainer(resolved));
}

export function buildApp(config: ResolvedConfig, services: Services, extend?: ExtendApi): Hono {
  const api = new OpenAPIHono<Env>({
    defaultHook: (result) => {
      if (!result.success) {
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues)
          fields[issue.path.join(".") || "body"] = issue.message;
        throw new ValidationError("Invalid request", fields);
      }
    },
  });
  api.onError((error, c) => {
    if (error instanceof DomainError) {
      if (error.status >= 500) {
        console.error(error);
        return c.json({ error: error.code }, error.status as 500);
      }
      return c.json({ error: error.code, message: error.message }, error.status as 400);
    }
    console.error(error);
    return c.json({ error: "internal_error" }, 500);
  });
  api.notFound((c) => c.json({ error: new NotFoundError().code }, 404));

  api.route("/", healthRouter);
  api.route("/public", publicRouter);
  api.route("/r/:token", recruiterRouter);
  extend?.(api);
  mountOpenApi(api, config);

  let admin: Promise<Hono<Env>> | undefined;
  const loadAdmin = () => {
    admin ??= import("./admin/index.js").then((m) => m.adminRouter(config, services));
    return admin;
  };

  const routes = new Hono<Env>();
  routes.use("*", async (c, next) => {
    c.set("config", config);
    c.set("services", services);
    await next();
  });
  routes.route("/api", api);
  routes.all("/admin/*", async (c) => (await loadAdmin()).fetch(c.req.raw));
  routes.all("/admin", async (c) => (await loadAdmin()).fetch(c.req.raw));

  const app = new Hono();
  app.use("*", securityHeaders(config.basePath));
  app.route(config.basePath || "/", routes);
  return app;
}
