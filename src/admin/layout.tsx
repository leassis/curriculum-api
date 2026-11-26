import type { FC, PropsWithChildren } from "hono/jsx";
import { ADMIN_CSS_VERSION } from "./static/admin-css.generated.js";
import { TOAST_JS } from "./static/toast-js.generated.js";

/** Cache-buster for the immutable-cached /static/toast.js (host-agnostic FNV-1a, no node:crypto). */
const TOAST_JS_VERSION = (() => {
  let h = 0x811c9dc5;
  for (let i = 0; i < TOAST_JS.length; i++) h = Math.imul(h ^ TOAST_JS.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
})();

export type Section = "profile" | "settings" | "personal-info" | "resumes" | "chats";

export interface LayoutProps {
  title: string;
  /** The package `basePath`, so links stay under it. */
  basePath: string;
  /** Highlights the matching nav link (styled from `body[data-section]`). */
  section?: Section;
  /** Renders only the content (no sidebar or logout); for pages shown before sign-in. */
  bare?: boolean;
  /** The package `faviconUrl`; no icon link when unset. */
  faviconUrl?: string;
}

/** Lucide-style outline icons (24 viewBox, stroked), one per nav Section. */
const NAV_ICON_PATHS: Record<Section, string[]> = {
  profile: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
  settings: [
    "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  ],
  "personal-info": [
    "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
    "M16 10h2",
    "M16 14h2",
    "M6.17 15a3 3 0 0 1 5.66 0",
    "M9 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  ],
  resumes: [
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z",
    "M14 2v4a2 2 0 0 0 2 2h4",
    "M10 9H8",
    "M16 13H8",
    "M16 17H8",
  ],
  chats: ["M7.9 20A9 9 0 1 0 4 16.1L2 22z"],
};

const NavIcon: FC<{ name: Section }> = ({ name }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {NAV_ICON_PATHS[name].map((d) => (
      <path d={d} />
    ))}
  </svg>
);

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title,
  basePath,
  section,
  bare,
  faviconUrl,
  children,
}) => {
  const admin = `${basePath}/admin`;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {faviconUrl ? <link rel="icon" href={faviconUrl} /> : null}
        <link rel="stylesheet" href={`${admin}/static/admin.css?v=${ADMIN_CSS_VERSION}`} />
        <script src={`${admin}/static/htmx.min.js`} />
        <script src={`${admin}/static/toast.js?v=${TOAST_JS_VERSION}`} defer />
      </head>
      <body data-section={section}>
        <div class="app-shell">
          {bare ? null : (
            <aside class="sidebar">
              <div class="brand">
                <div class="logo-tile" aria-hidden="true">
                  CV
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="font-display text-base font-semibold">Curriculum</span>
                  <span class="text-xs text-muted">Admin</span>
                </div>
              </div>
              <nav aria-label="Admin">
                <a href={`${admin}/profile`}>
                  <NavIcon name="profile" />
                  Profile
                </a>
                <a href={`${admin}/settings`}>
                  <NavIcon name="settings" />
                  Settings
                </a>
                <a href={`${admin}/personal-info`}>
                  <NavIcon name="personal-info" />
                  Personal info
                </a>
                <a href={`${admin}/resumes`}>
                  <NavIcon name="resumes" />
                  Resumes
                </a>
                <a href={`${admin}/chats`}>
                  <NavIcon name="chats" />
                  Chats
                </a>
              </nav>
              <div class="sidebar-foot">
                <form method="post" action={`${admin}/logout`}>
                  <button type="submit" class="btn-ghost w-full">
                    Logout
                  </button>
                </form>
              </div>
            </aside>
          )}
          <main class="main">
            <div class={bare ? "main-inner justify-center" : "main-inner"}>{children}</div>
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
