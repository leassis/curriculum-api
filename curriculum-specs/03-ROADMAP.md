# Roadmap

Build in phases. Each phase ends deployable and with its acceptance criteria met. If something in the stack feels wrong in Phase 1, change it then — it is cheap at that point.

---

## Phase 0 — Setup (½ day)

- [ ] Create repos `curriculum-api` (public, MIT) and `leandroassis.dev`.
- [ ] Neon project (EU region) with `main` and `dev` branches.
- [ ] OpenRouter key with a spend limit; Turnstile site (prod domain + localhost).
- [ ] `curriculum-api`: TypeScript, tsup, vitest, lint, CI workflow.
- [ ] `leandroassis.dev`: Vite + Svelte 5 + TS, Vercel project linked, domain configured.
- [ ] Local link between the two (`pnpm link`) and `npm run dev` working end-to-end with a `/api/health` route.

**Done when:** `GET /api/health` works locally and on Vercel through the mounted package.

## Phase 1 — Public chat (MVP)

API:
- [ ] Config + `createApp`, schema for `profile`, `settings`, `public_usage`, migrations, `migrate`/`seed` CLI.
- [ ] Turnstile verify + `POST /api/public/session` + session middleware.
- [ ] `POST /api/public/chat` with per-IP atomic limit, streaming via OpenRouter, decrement on failure.
- [ ] Tests for limit, session, streaming (mock model).

Site:
- [ ] Pixel-art home (first version), SEO content in `index.html`, JSON-LD, robots, sitemap.
- [ ] Chat window with streaming + lives counter + "game over" state.

**Done when:** deployed site answers questions about the CV (seeded directly in DB for now), limit enforced, home is static.

## Phase 2 — Admin foundation + master CV

- [ ] Admin login (bcrypt), admin session cookie, CSRF, security headers, login throttling.
- [ ] Layout + HTMX vendored, lazy-loaded admin module.
- [ ] `/admin/profile` (name, headline, master CV, prompts) and `/admin/settings` (models, limits).
- [ ] Personal info: `personal_info` (encrypted, visibility), `/admin/personal-info`, `contact` in public/recruiter responses, PII guard on save and before every LLM call, test asserting no personal-info value ever reaches the mock LLM.

**Done when:** CV and prompts are edited only through the admin; changing a model in settings takes effect without redeploy; a body containing your email is rejected; the UI shows contact data according to visibility.

## Phase 3 — Recruiter chat

API:
- [ ] `recruiter_chats` schema + admin CRUD (create with copy-link, revoke, reset, delete) with HTMX row updates.
- [ ] `GET /api/r/:token`, `POST /api/r/:token/session`, `POST /api/r/:token/chat` with scope check and atomic DB counter.
- [ ] Tests: scope mismatch, immediate revoke, limit, expiry.

Site:
- [ ] `/r/:token` page with greeting, Turnstile, chat, lives, error screens; `noindex`.

**Done when:** a link created in admin works end-to-end, stops at the limit, and revoking blocks the next question.

## Phase 4 — Tailor resume

- [ ] `tailored_resumes` schema, admin list/create/edit/delete.
- [ ] Generate with the tailor model (loading indicator), markdown editor + sanitized preview.
- [ ] Printable resume (`/admin/resumes/:id/print`, `/admin/profile/print`): personal header + tailored body, choose header fields per resume, A4 print CSS, ATS-friendly, Markdown download.
- [ ] Optional link from a recruiter chat to a tailored resume (used as chat context).

**Done when:** paste a JD → generate (LLM sees only the career body) → edit → print to PDF with real contact data; a recruiter chat linked to it answers from the tailored version.

## Phase 5 — Open-source release

- [ ] README (architecture, quick starts for Vercel/Node/Lambda, config reference, security notes), CONTRIBUTING, issue/PR templates.
- [ ] `examples/` for Vercel, Node, AWS Lambda (Function URL + response streaming).
- [ ] OpenAPI at `/api/openapi.json`.
- [ ] Publish v1.0.0 to npm from CI; personal site pinned to `^1.0.0`.
- [ ] Branch protection on `main` (PR + green CI + owner review).

**Done when:** a fresh user can deploy the API from the README in < 15 minutes and build their own front against the OpenAPI.

## Phase 6 — Polish (optional)

- [ ] `chat_messages` log + admin view of what recruiters asked (with retention cleanup).
- [ ] Dashboard stats (questions per day, per recruiter).
- [ ] Email/notification when a recruiter uses their link.
- [ ] Prompt-caching verification and cost report per model.
