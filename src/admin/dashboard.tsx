import { Hono } from "hono";
import type { Env } from "../env.js";
import { Layout } from "./layout.js";

/** Mounted at `/admin`. */
export const dashboardRouter = new Hono<Env>();

dashboardRouter.get("/", async (c) => {
  const counts = await c.var.services.adminAuth.dashboardCounts();
  return c.html(
    <Layout title="Dashboard" basePath={c.var.config.basePath}>
      <h1>Dashboard</h1>
      <dl>
        <dt>Active recruiter chats</dt>
        <dd id="active-chats">{counts.activeChats}</dd>
        <dt>Tailored resumes</dt>
        <dd id="resumes">{counts.resumes}</dd>
        <dt>Public questions today</dt>
        <dd id="public-questions">{counts.publicQuestionsToday}</dd>
      </dl>
    </Layout>,
  );
});
