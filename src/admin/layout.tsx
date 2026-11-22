import type { FC, PropsWithChildren } from "hono/jsx";

const CSS = `
body { font-family: system-ui, sans-serif; margin: 0; color: #1a1a1a; background: #fafafa; }
header { display: flex; gap: 1rem; align-items: center; padding: 0.75rem 1.5rem; background: #fff; border-bottom: 1px solid #ddd; }
nav { display: flex; gap: 1rem; flex: 1; }
nav a { color: #1a1a1a; text-decoration: none; }
nav a:hover { text-decoration: underline; }
main { max-width: 56rem; margin: 1.5rem auto; padding: 0 1.5rem; }
.error { padding: 0.75rem 1rem; border: 1px solid #c0392b; background: #fdecea; color: #7b241c; }
`;

export interface LayoutProps {
  title: string;
  /** The package `basePath`, so links stay under it. */
  basePath: string;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title, basePath, children }) => {
  const admin = `${basePath}/admin`;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style>{CSS}</style>
        <script src={`${admin}/static/htmx.min.js`} />
      </head>
      <body>
        <header>
          <nav>
            <a href={admin}>Dashboard</a>
            <a href={`${admin}/profile`}>Profile</a>
            <a href={`${admin}/settings`}>Settings</a>
            <a href={`${admin}/personal-info`}>Personal info</a>
            <a href={`${admin}/resumes`}>Resumes</a>
            <a href={`${admin}/chats`}>Chats</a>
          </nav>
          <form method="post" action={`${admin}/logout`}>
            <button type="submit">Logout</button>
          </form>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
};
