/**
 * Curriculum admin — server-rendered TSX components (Hono JSX / @kitajs/html style).
 * They use `class` (not `className`) and return HTML strings, so htmx can swap them in.
 * Using React instead? Rename `class` → `className` and `for` → `htmlFor`.
 */

type Children = { children?: unknown };

// ---------- Layout ----------

const navItems = [
  { href: "/admin/resumes", label: "Resumes", icon: "file" },
  { href: "/admin/resumes/new", label: "New resume", icon: "plus" },
  { href: "/admin/links", label: "Chat links", icon: "link" },
  { href: "/admin/data", label: "Career data", icon: "db" },
  { href: "/admin/settings", label: "Settings", icon: "gear" },
] as const;

export function AdminLayout({ title, current, children }: Children & { title: string; current: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} · Curriculum admin</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <link rel="stylesheet" href="/admin/app.css" />
        <script
          src="https://unpkg.com/htmx.org@2.0.11"
          integrity="sha384-2OatzQy1H+Zd/IIrjr1TcuDGqLXeHhbooAyJY1KdQMKnr4LZ22k31GBLdYKHmVjg"
          crossorigin="anonymous"
          defer
        ></script>
      </head>
      <body class="m-0">
        <div class="app-shell">
          <aside class="sidebar">
            <div class="flex items-center gap-3 px-1.5">
              <div class="logo-tile">CV</div>
              <div class="flex flex-col gap-0.5">
                <span class="font-display text-base font-semibold">Curriculum</span>
                <span class="text-xs text-muted">Admin</span>
              </div>
            </div>
            <nav aria-label="Admin" class="flex flex-col gap-1">
              {navItems.map((item) => (
                <a href={item.href} class="nav-item" aria-current={item.href === current ? "page" : undefined}>
                  <Icon name={item.icon} />
                  {item.label}
                </a>
              ))}
            </nav>
            <div class="mt-auto flex flex-col gap-3.5 border-t border-line px-1.5 pt-4">
              <a href="/" class="flex items-center gap-2.5 text-sm no-underline">
                <Icon name="ext" size={16} />
                View public site
              </a>
            </div>
          </aside>
          <main class="main">
            <div class="main-inner">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

export function PageHeader({ eyebrow, title, sub, children }: Children & { eyebrow: string; title: string; sub: string }) {
  return (
    <header class="flex flex-wrap items-end justify-between gap-5">
      <div class="flex min-w-0 flex-col gap-2.5">
        <span class="eyebrow">{eyebrow}</span>
        <h1 class="page-title">{title}</h1>
        <p class="page-sub">{sub}</p>
      </div>
      <div class="flex flex-wrap gap-3">{children}</div>
    </header>
  );
}

// ---------- Small pieces ----------

export function ScoreBar({ value }: { value: number }) {
  const level = value >= 80 ? "high" : value >= 65 ? "mid" : "low";
  return (
    <div class="score">
      <div class="score-track">
        <div class="score-fill" data-level={level} style={`width: ${value}%`}></div>
      </div>
      <span class="score-value">{value}%</span>
    </div>
  );
}

type LinkStatus = "active" | "expired" | "revoked";
const statusClass: Record<LinkStatus, string> = {
  active: "badge badge-success",
  expired: "badge badge-neutral",
  revoked: "badge badge-danger",
};
export function StatusBadge({ status }: { status: LinkStatus }) {
  return <span class={statusClass[status]}>{status[0].toUpperCase() + status.slice(1)}</span>;
}

export function Field({ label, name, help, ...rest }: { label: string; name: string; help?: string; [k: string]: unknown }) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input class="input" name={name} {...rest} />
      {help && <span class="field-help">{help}</span>}
    </label>
  );
}

// ---------- Resumes list ----------

export type Resume = { id: string; role: string; company: string; score: number; createdAt: string; links: number };
const resumeCols = "grid-cols-[minmax(220px,2fr)_minmax(140px,1fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)]";

export function ResumeList({ resumes }: { resumes: Resume[] }) {
  return (
    <section class="table-scroll" aria-label="Resume list">
      <div class="min-w-[640px]" id="resume-rows">
        <div class={`list-head ${resumeCols}`}>
          <span>Role</span><span>JD match</span><span>Created</span><span>Chat links</span>
        </div>
        {resumes.map((r) => <ResumeRow resume={r} />)}
      </div>
    </section>
  );
}

export function ResumeRow({ resume: r }: { resume: Resume }) {
  return (
    <a href={`/admin/resumes/${r.id}`} class={`list-row ${resumeCols}`}>
      <div class="flex min-w-0 flex-col gap-1">
        <span class="font-semibold">{r.role}</span>
        <span class="text-sm text-muted">{r.company}</span>
      </div>
      <ScoreBar value={r.score} />
      <span class="text-sm text-muted">{r.createdAt}</span>
      <span class={`flex items-center gap-2 text-sm ${r.links ? "text-primary-hover" : "text-muted"}`}>
        <Icon name="link" size={16} />
        {r.links} {r.links === 1 ? "link" : "links"}
      </span>
    </a>
  );
}

/** Search box: htmx re-renders only the rows as you type. */
export function ResumeSearch() {
  return (
    <label class="search flex-[1_1_280px]">
      <Icon name="search" size={16} />
      <span class="sr-only">Search resumes</span>
      <input
        type="search"
        name="q"
        placeholder="Search by role or company"
        hx-get="/admin/resumes/rows"
        hx-trigger="input changed delay:250ms"
        hx-target="#resume-rows"
        hx-swap="outerHTML"
      />
    </label>
  );
}

// ---------- New resume (generate with loading state) ----------

export function NewResumeForm() {
  return (
    <form class="card-pad flex-[1_1_380px]" hx-post="/admin/resumes" hx-target="#result" hx-indicator="#generating">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Field label="Job title" name="title" placeholder="e.g. Senior Software Engineer" />
        <Field label="Company" name="company" placeholder="Company name" />
      </div>
      <label class="field">
        <span class="field-label">Job description</span>
        <textarea class="input" name="jd" rows={10} placeholder="Paste the full job description here…"></textarea>
      </label>
      <fieldset class="flex flex-col gap-2.5 border-0 p-0">
        <legend class="field-label mb-2.5">Emphasise</legend>
        <div class="flex flex-wrap gap-2">
          {["Distributed systems", "APIs", "Java", "Go", "TypeScript", "Security"].map((t) => (
            // aria-pressed is toggled with a 1-line script or hx-on; the value travels in a hidden input
            <button type="button" class="chip" aria-pressed="false" hx-on--click="this.setAttribute('aria-pressed', this.getAttribute('aria-pressed') !== 'true')">
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" class="btn"><Icon name="spark" size={16} />Generate resume</button>
        <span id="generating" class="htmx-indicator text-sm text-muted">Generating resume…</span>
      </div>
    </form>
  );
}

// ---------- Chat links ----------

export type ChatLink = { id: string; recruiter: string; resume: string; url: string; used: number; limit: number; status: LinkStatus; expires: string };
const linkCols = "grid-cols-[minmax(180px,1.3fr)_minmax(220px,1.6fr)_110px_120px_110px_104px]";

export function ChatLinkRow({ link: l }: { link: ChatLink }) {
  return (
    <div class={`list-row ${linkCols}`} id={`link-${l.id}`}>
      <div class="flex min-w-0 flex-col gap-1">
        <span class="font-semibold">{l.recruiter}</span>
        <span class="text-[13px] text-muted">{l.resume}</span>
      </div>
      <span class="truncate font-mono text-[13px] text-primary-hover">{l.url}</span>
      <span class="font-mono text-[13px]">{l.used}/{l.limit}</span>
      <div><StatusBadge status={l.status} /></div>
      <span class="text-sm text-muted">{l.expires}</span>
      <div class="flex justify-end gap-1.5">
        <button type="button" class="btn-icon" aria-label="Copy link" hx-on--click={`navigator.clipboard.writeText('${l.url}')`}>
          <Icon name="copy" size={16} />
        </button>
        {l.status === "active" && (
          <button
            type="button"
            class="btn-icon btn-icon-danger"
            aria-label="Revoke link"
            hx-post={`/admin/links/${l.id}/revoke`}
            hx-target={`#link-${l.id}`}
            hx-swap="outerHTML"
            hx-confirm="Revoke this link? The recruiter will lose access."
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Icons (inline stroke SVG, 24px grid) ----------

const paths: Record<string, string> = {
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  db: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="flex-none"
      dangerouslySetInnerHTML={{ __html: paths[name] ?? "" }}
    />
  );
}
