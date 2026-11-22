import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Env } from "../env.js";

const route = createRoute({
  method: "get",
  path: "/health",
  summary: "Liveness check; never touches the database",
  responses: {
    200: {
      description: "The app is running",
      content: { "application/json": { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
});

export const healthRouter = new OpenAPIHono<Env>();
healthRouter.openapi(route, (c) => c.json({ ok: true as const }, 200));
