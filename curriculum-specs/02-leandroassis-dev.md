# Spec — `leandroassis.dev` (personal site)

Static Svelte 5 SPA with an 80s/90s **pixel-art arcade** look, plus a single Vercel function that mounts `@<scope>/curriculum-api`. One Vercel project, one domain.

---

## 1. Tech stack

- Vite + Svelte 5 (runes) + TypeScript
- Router: minimal (two routes) — `svelte5-router` or a tiny hand-written router on `location.pathname`
- `@marsidev/react-turnstile` is React-only → use `svelte-turnstile` or load the Turnstile script directly
- API: `@<scope>/curriculum-api` (pinned version), `hono` (`hono/vercel` adapter)
- Local dev: `@hono/node-server`, `tsx`, `concurrently`
- Pixel font: "Press Start 2P" (OFL) self-hosted, headings and UI chrome only; body text in a readable font

## 2. Repository layout

```
leandroassis.dev/
├── index.html                 # contains SEO content + JSON-LD (see §5)
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── og-image.png
│   └── fonts/
├── src/
│   ├── main.ts
│   ├── App.svelte             # router
│   ├── pages/
│   │   ├── Home.svelte        # pixel-art home + public chat
│   │   ├── RecruiterChat.svelte   # /r/:token
│   │   └── NotFound.svelte
│   ├── components/
│   │   ├── ChatWindow.svelte  # shared chat UI (streaming)
│   │   ├── Turnstile.svelte
│   │   ├── LivesCounter.svelte    # remaining questions as "lives"
│   │   └── ...pixel-art components
│   └── lib/
│       ├── api.ts             # typed client (generated from OpenAPI or hand-written)
│       └── stream.ts          # fetch + ReadableStream reader
├── api/
│   └── [[...route]].ts        # mounts createApp() for Vercel
├── dev-server.ts              # mounts createApp() on Node for local dev
├── vite.config.ts             # proxy /api and /admin → localhost:3001
├── vercel.json
├── .env.example
└── package.json
```

## 3. Mounting the API

```ts
// api/[[...route]].ts
import { handle } from "hono/vercel";
import { createApp } from "@<scope>/curriculum-api";

const app = createApp({
  databaseUrl: process.env.DATABASE_URL!,
  openrouterApiKey: process.env.OPENROUTER_API_KEY!,
  sessionSecret: process.env.SESSION_SECRET!,
  turnstileSecret: process.env.TURNSTILE_SECRET!,
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH!,
  ipHashSalt: process.env.IP_HASH_SALT!,
  models: {
    public: process.env.MODEL_PUBLIC,
    tailor: process.env.MODEL_TAILOR,
    recruiter: process.env.MODEL_RECRUITER,
  },
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
```

`vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*",   "destination": "/api/[[...route]]" },
    { "source": "/admin/:path*", "destination": "/api/[[...route]]" },
    { "source": "/admin",        "destination": "/api/[[...route]]" },
    { "source": "/((?!api/|admin).*)", "destination": "/index.html" }
  ]
}
```
(Verify the exact rewrite behaviour for the catch-all function during implementation; the goal: `/api/*` and `/admin*` → function, everything else → SPA.)

Vercel project settings: Fluid compute **on**, Node runtime, function region close to the Neon region (EU).

## 4. Pages

### 4.1 Home `/`

- Pixel-art arcade screen: "INSERT COIN"-style intro, Leandro's name and headline, short pitch, links (LinkedIn, GitHub, email).
- Sections styled as game screens (e.g. "PLAYER PROFILE", "HIGH SCORES" = experience highlights, "SKILL TREE" = stack). Content for these sections is static in the site repo (not from the API) so it is in the HTML for SEO.
- **Public chat** panel ("ASK THE PLAYER"):
  1. Before first question: show Turnstile; on success call `POST /api/public/session`.
  2. Send `{ messages }` to `POST /api/public/chat`; render the streamed text as it arrives (typewriter feel). The model never knows contact data — show a contact block from `contact` in `GET /api/public/profile`.
  3. Show remaining questions from `X-Remaining` as lives/hearts.
  4. On `429`: "GAME OVER — come back tomorrow" screen with contact links.
- Respect `prefers-reduced-motion` (disable heavy animations).
- Mobile-friendly; pixel art scaled with `image-rendering: pixelated`.

### 4.2 Recruiter chat `/r/:token`

- On load: `GET /api/r/:token` → greeting "WELCOME, <NAME> FROM <COMPANY>", remaining questions, and a contact block from `contact` (includes recruiter-visibility fields like email/phone).
  - `404` → "INVALID CARTRIDGE"; `410` → "THIS LINK HAS EXPIRED" with contact info.
- Turnstile → `POST /api/r/:token/session` → chat (same `ChatWindow` component) → `POST /api/r/:token/chat`.
- Lives counter = remaining questions; `429` → "NO CREDITS LEFT" + contact.
- `<meta name="robots" content="noindex, nofollow">` set dynamically for this route; also disallow `/r/` in `robots.txt`.

### 4.3 Admin

Not part of the SPA — served by the API package at `/admin` (server-rendered HTML + HTMX).

## 5. SEO (goal: appear when someone googles "Leandro Assis")

No SSR. Instead, `index.html` ships real content:
- `<title>Leandro Assis — Backend Developer</title>`
- `<meta name="description" content="…">`
- Visible-to-crawler content: `<h1>Leandro Assis</h1>` + short intro inside the root element (Svelte mounts over/around it), or pre-render the home at build time (e.g. a Vite prerender plugin) — choose one and verify with "View source".
- JSON-LD:
  ```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Leandro Assis",
    "jobTitle": "Backend Developer",
    "url": "https://leandroassis.dev",
    "address": { "@type": "PostalAddress", "addressCountry": "NL" },
    "sameAs": ["https://www.linkedin.com/in/<handle>", "https://github.com/<user>"]
  }
  </script>
  ```
- Open Graph + Twitter card tags with `og-image.png`.
- `sitemap.xml` with `/` only; `robots.txt` allows `/`, disallows `/r/` and `/admin`.
- After deploy: register in Google Search Console, submit sitemap; link the site from LinkedIn and GitHub profile/README.

## 6. Local development

```ts
// dev-server.ts
import { serve } from "@hono/node-server";
import { createApp } from "@<scope>/curriculum-api";
const app = createApp({ /* same as api/[[...route]].ts */, secureCookies: false });
serve({ fetch: app.fetch, port: 3001 });
```

```ts
// vite.config.ts (excerpt)
server: { proxy: { "/api": "http://localhost:3001", "/admin": "http://localhost:3001" } }
```

```json
// package.json scripts
{
  "dev": "concurrently \"vite\" \"tsx watch --env-file=.env.local dev-server.ts\"",
  "build": "vite build",
  "db:migrate": "curriculum-api migrate",
  "db:seed": "curriculum-api seed"
}
```

- `.env.local` (git-ignored) — pull from Vercel with `vercel env pull .env.local` or fill manually.
- Use a **Neon dev branch** locally, never the production DB.
- Turnstile test keys locally: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
- To develop against an unpublished API version: `npm link` / `pnpm link` the local `curriculum-api` checkout.

## 7. Deployment

- One Vercel project linked to this repo; production branch `main`.
- Env vars: everything in `.env.example` (front only needs `VITE_TURNSTILE_SITE_KEY`).
- Neon via Vercel Marketplace (sets `DATABASE_URL`); run `db:migrate` + `db:seed` once.
- Vercel Firewall: one rate-limit rule on `/api/public/chat` and `/api/r/` (by IP).
- OpenRouter: set a monthly spend limit.
- Custom domain `leandroassis.dev` (or chosen domain) in Vercel.

## 8. Acceptance checks

- Home loads with no function invocation (check Vercel logs) and "View source" shows the name, title and JSON-LD.
- Public chat streams text progressively; 6th question of the day from the same IP is refused (with default limit 5).
- Recruiter link: greeting shows correct name; 11th question refused; revoking in admin blocks the very next question.
- `/admin` requires login; mutations without CSRF token fail.
- Lighthouse: Performance ≥ 90, Accessibility ≥ 90 on the home page.
