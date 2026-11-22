import { Layout, PageHeader } from "../layout.js";

export const DashboardPage = ({
  basePath,
  counts,
}: {
  basePath: string;
  counts: { activeChats: number; resumes: number; publicQuestionsToday: number };
}) => (
  <Layout title="Dashboard" basePath={basePath} section="dashboard">
    <PageHeader eyebrow="Overview" title="Dashboard" sub="What is happening on your site." />
    <dl class="stats">
      <div class="stat">
        <dt>Active recruiter chats</dt>
        <dd id="active-chats">{counts.activeChats}</dd>
      </div>
      <div class="stat">
        <dt>Tailored resumes</dt>
        <dd id="resumes">{counts.resumes}</dd>
      </div>
      <div class="stat">
        <dt>Public questions today</dt>
        <dd id="public-questions">{counts.publicQuestionsToday}</dd>
      </div>
    </dl>
  </Layout>
);
