import { Layout } from "../layout.js";

export const DashboardPage = ({
  basePath,
  counts,
}: {
  basePath: string;
  counts: { activeChats: number; resumes: number; publicQuestionsToday: number };
}) => (
  <Layout title="Dashboard" basePath={basePath}>
    <h1>Dashboard</h1>
    <dl>
      <dt>Active recruiter chats</dt>
      <dd id="active-chats">{counts.activeChats}</dd>
      <dt>Tailored resumes</dt>
      <dd id="resumes">{counts.resumes}</dd>
      <dt>Public questions today</dt>
      <dd id="public-questions">{counts.publicQuestionsToday}</dd>
    </dl>
  </Layout>
);
