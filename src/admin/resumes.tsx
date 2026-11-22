import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { Env } from "../env.js";
import type { Resume } from "../services/resume.service.js";
import { Layout } from "./layout.js";

const day = (d: Date) => d.toISOString().slice(0, 10);

const ResumeRow: FC<{ basePath: string; resume: Resume }> = ({ basePath, resume }) => {
  const url = `${basePath}/admin/resumes/${resume.id}`;
  return (
    <tr>
      <td>
        <a href={url}>{resume.title}</a>
      </td>
      <td>{resume.company ?? ""}</td>
      <td>{resume.model ?? ""}</td>
      <td>{day(resume.updatedAt)}</td>
      <td>
        <button
          type="button"
          hx-delete={url}
          hx-confirm={`Delete ${resume.title}?`}
          hx-target="closest tr"
          hx-swap="outerHTML"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

const ListPage: FC<{ basePath: string; resumes: Resume[] }> = ({ basePath, resumes }) => (
  <Layout title="Resumes" basePath={basePath}>
    <h1>Tailored resumes</h1>
    {resumes.length === 0 ? (
      <p>No tailored resumes yet</p>
    ) : (
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Company</th>
            <th>Model</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {resumes.map((resume) => (
            <ResumeRow basePath={basePath} resume={resume} />
          ))}
        </tbody>
      </table>
    )}
    <h2>New resume</h2>
    <form method="post" action={`${basePath}/admin/resumes`}>
      <p>
        <label for="title">Title</label>
        <br />
        <input id="title" type="text" name="title" size={60} required />
      </p>
      <p>
        <label for="company">Company</label>
        <br />
        <input id="company" type="text" name="company" size={60} />
      </p>
      <p>
        <label for="jobDescription">Job Description</label>
        <br />
        <textarea id="jobDescription" name="jobDescription" rows={12} cols={80} required />
      </p>
      <button type="submit">Create</button>
    </form>
  </Layout>
);

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Mounted at `/admin`. */
export const resumesRouter = new Hono<Env>();

resumesRouter.get("/resumes", async (c) =>
  c.html(
    <ListPage basePath={c.var.config.basePath} resumes={await c.var.services.resumes.list()} />,
  ),
);

resumesRouter.post("/resumes", async (c) => {
  const body = await c.req.parseBody();
  const resume = await c.var.services.resumes.create({
    title: text(body.title),
    company: text(body.company),
    jobDescription: text(body.jobDescription),
  });
  return c.redirect(`${c.var.config.basePath}/admin/resumes/${resume.id}`, 303);
});

resumesRouter.delete("/resumes/:id", async (c) => {
  await c.var.services.resumes.delete(c.req.param("id"));
  return c.body(null, 200);
});
