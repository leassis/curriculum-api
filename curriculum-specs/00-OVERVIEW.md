# Curriculum — Overview

Personal CV website for **Leandro Assis** (backend developer) with an AI chat that answers questions about his career, plus an **open-source backend** that anyone can reuse to build their own AI-powered CV site.

This folder contains the implementation specs:

| File | What it covers |
|---|---|
| `00-OVERVIEW.md` | Vision, decisions, architecture (this file) |
| `01-curriculum-api.md` | Open-source backend package (Hono + Drizzle + Neon + OpenRouter), including the admin UI |
| `02-leandroassis-dev.md` | Personal site (Svelte SPA, pixel art) that mounts the API package |
| `03-ROADMAP.md` | Phased delivery plan with acceptance criteria |

---

## 1. Product

Three capabilities:

1. **Public chat** — any visitor can ask questions about Leandro's career. Cheap model, full master CV as context. Captcha + per-IP daily limit.
2. **Recruiter chat** — Leandro creates a private link per recruiter (`/r/:token`). Better model, context = master CV (or a tailored resume) + short job description. Limited number of questions (default 10), can be revoked, reset or deleted.
3. **Tailor resume** (admin only) — paste a job description, generate a tailored resume (markdown) with Gemini Flash, edit it, keep it. CRUD.

Admin also manages the **master CV**, prompts and **personal info** (nothing personal is hardcoded).

**Privacy:** the CV is split in two: a **personal header** (name, email, phone, address…, stored encrypted) and a **career body** (experience, skills, education). Only the body is ever sent to an LLM. Contact data is shown by the UI according to visibility (public / recruiter / print).

**Printable resume:** every tailored resume (and the master CV) has an A4, ATS-friendly print view: personal header + tailored body, joined on the server, for "Save as PDF".

## 2. Constraints and decisions

| Topic | Decision | Why |
|---|---|---|
| Hosting | Vercel, free (Hobby) plan | Free, friendly URL, deploy on push, no VPS to maintain |
| Front | **Svelte 5 SPA (Vite), static** | No cold start for pages; SEO only needs the name to be findable |
| Back | **Hono** (single Vercel function, catch-all) | Explicit server code, middleware chain (like Spring's filter chain), portable to Lambda / Cloudflare |
| Admin UI | **Hono JSX (server-rendered) + HTMX** | Server-side rendering, session cookie, CSRF, no admin JSON API exposed (Thymeleaf-like approach) |
| DB | **Neon Postgres + Drizzle ORM** (`drizzle-orm/neon-http`) | Serverless-friendly HTTP driver, typed schema, migrations |
| LLM | **OpenRouter** via Vercel **AI SDK** (`ai` + `@openrouter/ai-sdk-provider`) | One key, swap models by config, built-in streaming |
| Captcha | **Cloudflare Turnstile** | Free, low friction |
| Rejected | Next.js (dislikes implicit server/client model), SvelteKit/React Router (not needed), Java (out of scope for this project), VPS | — |

Model tiers (exact OpenRouter IDs live in config, never in code):

| Area | Tier |
|---|---|
| Public chat | cheapest acceptable model (e.g. a Gemini Flash-Lite class model) |
| Tailor resume | Gemini Flash |
| Recruiter chat | a stronger model (e.g. Claude Sonnet class) |

## 3. Repositories and deployment

Two GitHub repos, **one** Vercel project.

```
github.com/<user>/curriculum-api        PUBLIC, open source (MIT), accepts PRs
  → published to npm as @<scope>/curriculum-api
  → exports createApp(config): Hono app (API + admin) and migrate()

github.com/<user>/leandroassis.dev     Leandro's personal site
  → Svelte SPA + api/[[...route]].ts that mounts createApp()
  → depends on a pinned version of @<scope>/curriculum-api
  → deployed to Vercel (single project) → leandroassis.dev
```

Consequences:
- Same origin for front and API → no CORS, simple cookies.
- A merged PR in the open-source repo only reaches the personal site when a new version is published **and** the dependency is bumped.
- All personal data (CV, recruiters, prompts) lives in the Neon DB; all secrets in Vercel env vars. The open-source repo contains nothing personal.

> Replace `<user>` / `<scope>` with the real GitHub user and npm scope.

## 4. Runtime architecture

```
Browser
 ├─ GET /, /r/:token          → Vercel CDN (static Svelte build)          no cold start
 ├─ /api/public/*              ┐
 ├─ /api/r/:token/*            ├→ Vercel Function (Node, Fluid compute)
 └─ /admin/*  (HTML + HTMX)    ┘    api/[[...route]].ts → createApp() (Hono)
                                       ├─ Neon (Drizzle, HTTP driver)
                                       ├─ OpenRouter (AI SDK, streaming)
                                       └─ Turnstile siteverify
```

Security layers, outside → inside:
1. Vercel Firewall: one rate-limit rule (Hobby allows one) covering `/api/public/chat` and `/api/r/*`.
2. Turnstile → short-lived signed session cookie (JWT, HttpOnly) with a scope (`public` or `recruiter:<id>`).
3. Hono middleware per area (`requireSession`, `requireActiveRecruiterChat`, `requireAdmin` + CSRF).
4. DB-level atomic checks (question counters, revoked/expired status) in a single `UPDATE … RETURNING`.
5. PII guard: personal-info values are blocked from the career body on save and from every LLM prompt.
6. Low `max_tokens`, and a monthly spend limit on OpenRouter (also restrict OpenRouter to providers that don't train on prompts).

## 5. Non-goals (for now)

- No user accounts other than the single admin.
- No SSR for the public site.
- No vector DB / RAG — the CV fits in the prompt (use prompt caching).
