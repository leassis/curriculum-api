import type { FC, PropsWithChildren } from "hono/jsx";
import { ADMIN_CSS_VERSION } from "./static/admin-css.generated.js";

export type Section = "dashboard" | "profile" | "settings" | "personal-info" | "resumes" | "chats";

export interface LayoutProps {
  title: string;
  /** The package `basePath`, so links stay under it. */
  basePath: string;
  /** Highlights the matching nav link (styled from `body[data-section]`). */
  section?: Section;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title,
  basePath,
  section,
  children,
}) => {
  const admin = `${basePath}/admin`;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href={`${admin}/static/admin.css?v=${ADMIN_CSS_VERSION}`} />
        <script src={`${admin}/static/htmx.min.js`} />
      </head>
      <body data-section={section}>
        <div class="app-shell">
          <aside class="sidebar">
            <div class="brand">
              <div class="logo-tile" aria-hidden="true">
                CV
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="font-display text-base font-semibold">Career Chat</span>
                <span class="text-xs text-muted">Admin</span>
              </div>
            </div>
            <nav aria-label="Admin">
              <a href={admin}>Dashboard</a>
              <a href={`${admin}/profile`}>Profile</a>
              <a href={`${admin}/settings`}>Settings</a>
              <a href={`${admin}/personal-info`}>Personal info</a>
              <a href={`${admin}/resumes`}>Resumes</a>
              <a href={`${admin}/chats`}>Chats</a>
            </nav>
            <div class="sidebar-foot">
              <form method="post" action={`${admin}/logout`}>
                <button type="submit" class="btn-ghost w-full">
                  Logout
                </button>
              </form>
            </div>
          </aside>
          <main class="main">
            <div class="main-inner">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
};

/** Title block at the top of every admin page. */
export const PageHeader: FC<
  PropsWithChildren<{ eyebrow: string; title: string; sub?: string }>
> = ({ eyebrow, title, sub, children }) => (
  <header class="page-header">
    <div class="page-header-text">
      <span class="eyebrow">{eyebrow}</span>
      <h1 class="page-title">{title}</h1>
      {sub ? <p class="page-sub">{sub}</p> : null}
    </div>
    {children ? <div class="actions">{children}</div> : null}
  </header>
);
