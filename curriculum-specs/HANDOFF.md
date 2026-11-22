# Handoff — Curriculum project (Leandro Assis)

Context for continuing this work in a new session. Read this first, then the specs in this folder.

## 1. Who and what

- **Leandro Assis**: backend developer based in the Netherlands, almost 30 years of career. Main stack is Java/Spring Boot, plus TypeScript and Go. He positions himself as **backend** (not full stack).
- **Project:** a personal CV website with an 80s/90s pixel-art look, plus AI chats about his career, plus an **open-source backend** that others can reuse.
- **Earlier attempt:** the site was built with Next.js on Vercel. He didn't like Next (dislikes the implicit server/client model, `"use client"`, implicit caching), and LLM calls sometimes failed (most likely function timeouts and no streaming).
- **Language:** conversation in Portuguese; specs and open-source docs in **English**.

## 2. Spec files (in this folder)

| File | Content |
|---|---|
| `00-OVERVIEW.md` | Vision, decisions, architecture, security layers |
| `01-curriculum-api.md` | Open-source backend: layout, layered architecture, data model, personal-info split (§4.1), routes, admin, printable resume (§5.5), sessions, LLM, tests, packaging |
| `02-leandroassis-dev.md` | Personal site: Svelte SPA, pages, mounting the API, SEO without SSR, local dev, deploy, acceptance checks |
| `03-ROADMAP.md` | Phases 0–6 with "done when" criteria |

## 3. Final decisions

| Topic | Decision |
|---|---|
| Hosting | Vercel, free (Hobby) plan, **Fluid compute ON** (300s function limit), no VPS |
| Front | **Svelte 5 SPA** (Vite), static on CDN, so pages have no cold start |
| Back | **Hono**, single catch-all function. Chosen for its middleware chain and route organization (cold-start gain is small); portable to Lambda/Cloudflare |
| Admin UI | **Hono JSX (server-rendered) + HTMX**, Thymeleaf-like, no admin JSON API |
| Code structure | routes/admin → **services** → **repositories (DAL)** → Drizzle; DI via `createContainer()` + `c.var.services` |
| DB | **Neon Postgres + Drizzle** (`drizzle-orm/neon-http`) |
| LLM | **OpenRouter** via Vercel AI SDK (`@openrouter/ai-sdk-provider`), with streaming |
| Models | public chat = cheapest; tailor resume = Gemini Flash; recruiter chat = stronger model. IDs set in config/DB, never in code |
| Captcha | Cloudflare Turnstile → short-lived signed JWT cookie with a scope |
| Privacy | CV split into a **personal header** (encrypted, never sent to the LLM) and a **career body** (the only part sent). Contact data is shown by the UI according to visibility (public / recruiter / print). A PII guard runs on save and before every LLM call |
| Printable resume | Server joins header + tailored body; A4, ATS-friendly; browser "Save as PDF" (no server PDF) |
| SEO | No SSR. Content and JSON-LD in `index.html` (or prerender the home), domain with his name, Search Console, links from LinkedIn/GitHub |

## 4. Repositories and deploy

- **`curriculum-api`**: public, MIT, accepts PRs. Published to npm as `@<scope>/curriculum-api`. Exports `createApp(config)` (Hono app: API + admin) and `migrate()`, plus a small CLI (`migrate`, `seed`, `hash-password`). Also ships a one-click "Deploy to Vercel" example.
- **`leandroassis.dev`**: Svelte site + `api/[[...route]].ts` that mounts `createApp()`. It depends on a **pinned** version of the package, so merged PRs only reach the site when a new version is published and the dependency is bumped.
- **One Vercel project, one domain**, so there's no CORS.
- No personal data in either repo: the CV lives in Neon, secrets in Vercel env vars.

## 5. Features

1. **Public chat**: cheap model, master career body as context, Turnstile, limit per IP per day (salted IP hash, for GDPR).
2. **Recruiter chat** `/r/:token`: one link per recruiter, stronger model, body (or tailored body) + short job description, 10 questions by default, atomic DB counter. Revoke takes effect immediately (checked in the DB on every question). Admin CRUD: create, revoke, reset, delete.
3. **Tailor resume** (admin): paste a job description → Gemini Flash generates a tailored body → edit → print.
4. **Admin** also manages the master body, prompts, personal-info fields, model and limit settings.

## 6. Rejected options (don't re-open without a reason)

- **Next.js**: he dislikes its model.
- **React / React Router**: React isn't needed; he's positioning as backend. React Router framework mode would mean SSR.
- **SvelteKit**: he preferred plain Svelte + a separate backend.
- **Java/Spring + Thymeleaf for the admin**: he likes the approach, but doesn't want Java in this project ("enterprise"). Hono JSX + HTMX keeps the same approach.
- **Go on Vercel**: possible, but he would lose the AI SDK, Drizzle, JSX and the npm-package model. Staying with TypeScript.
- **VPS**: he doesn't want one to maintain.
- **Inline PII placeholders `{{PII:EMAIL}}`**: replaced by the simpler header/body split.

## 7. Open items to verify or decide

- [ ] Real GitHub user and npm scope (replace `<user>` / `<scope>`).
- [ ] `vercel.json` rewrites: confirm `/api/*` and `/admin*` reach the catch-all function and everything else goes to the SPA.
- [ ] Exact OpenRouter model IDs and prices; restrict OpenRouter to providers that don't train on prompts.
- [ ] Vercel Firewall: Hobby allows one rate-limit rule (it should cover `/api/public/chat` and `/api/r/*`).
- [ ] Admin login: bcrypt password from env (current spec) or GitHub OAuth restricted to his account.
- [ ] Chat history: client sends the last N messages (current spec) or store it server-side.
- [ ] Svelte Turnstile integration (`svelte-turnstile` or load the script directly).
- [ ] Data retention period for `chat_messages` and `public_usage`.
- [ ] Domain (`leandroassis.dev` or another).

## 8. Next step

Start **Phase 0** of `03-ROADMAP.md`: create both repos, the Neon project (EU, with `main` and `dev` branches), the OpenRouter key with a spend limit, and the Turnstile site; link the package locally; get `GET /api/health` working locally and on Vercel. Then Phase 1 (public chat MVP).

## 9. Working preferences observed

- He wants short, direct answers once a topic is settled; he dislikes long back-and-forth.
- He likes explicit server/client boundaries and server-side security, and compares things to Spring (filter chain, controller → service → repository).
- Free hosting, simple deploys, a friendly URL.
- The open-source backend should showcase backend skills: API design, security, portability, OpenAPI.
