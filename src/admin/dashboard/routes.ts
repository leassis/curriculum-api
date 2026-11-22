import { Hono } from "hono";
import type { Env } from "../../env.js";
import { DashboardPage } from "./view.js";

/** Mounted at `/admin`. */
export const dashboardRouter = new Hono<Env>();

dashboardRouter.get("/", async (c) => {
  const counts = await c.var.services.adminAuth.dashboardCounts();
  return c.html(DashboardPage({ basePath: c.var.config.basePath, counts }));
});
