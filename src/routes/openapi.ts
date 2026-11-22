import type { OpenAPIHono } from "@hono/zod-openapi";
import type { ResolvedConfig } from "../config.js";
import type { Env } from "../env.js";

/** Serves `/api/openapi.json`, generated from every route registered on the `/api` router. */
export function mountOpenApi(api: OpenAPIHono<Env>, config: ResolvedConfig): void {
  api.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: { title: "curriculum-api", version: "0.0.0" },
    servers: [{ url: `${config.basePath}/api` }],
  });
}
