# Spec — `curriculum-api` (open-source backend)

Hono application, published as an npm package, that provides:
- JSON/streaming API for the **public chat** and **recruiter chat**,
- a server-rendered **admin** (Hono JSX + HTMX) to manage the master CV, tailored resumes and recruiter chats,
- Drizzle schema + migrations for Neon Postgres.

It must contain **nothing personal**. Everything specific to a person comes from the database or from `createApp(config)`.

---

## 1. Tech stack

- TypeScript (strict), ESM, Node ≥ 22
- `hono`, `hono/jsx` (admin views), `hono/csrf`, `hono/cookie`
- `@hono/zod-openapi` + `zod` (validation + OpenAPI for public/recruiter routes)
- `drizzle-orm` (`drizzle-orm/neon-http`) + `@neondatabase/serverless`, `drizzle-kit` (dev)
- `ai` (Vercel AI SDK) + `@openrouter/ai-sdk-provider`
- `jose` (JWT HS256 session cookies)
- `bcryptjs` (admin password hash verification; pure JS, serverless-safe)
- HTMX (vendored file served by the app, pinned version)
- Build: `tsup` (ESM + `.d.ts`). Tests: `vitest`. Lint/format: `eslint` + `prettier` (or `biome`).

## 2. Repository layout

```
curriculum-api/
├── src/
│   ├── index.ts                 # exports createApp, migrate, types
│   ├── config.ts                # CurriculumApiConfig type + zod validation + defaults
│   ├── app.ts                   # builds the Hono app, wires routes + middleware
│   ├── container.ts             # builds db → repositories → services (composition root)
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts            # createDb(databaseUrl)
│   │   └── migrate.ts           # migrate() using drizzle neon-http migrator
│   ├── repositories/            # DAL — the ONLY place that imports Drizzle queries
│   │   ├── profile.repository.ts
│   │   ├── settings.repository.ts
│   │   ├── public-usage.repository.ts
│   │   ├── recruiter-chat.repository.ts
│   │   ├── resume.repository.ts
│   │   ├── chat-message.repository.ts
│   │   └── personal-info.repository.ts
│   ├── services/                # business rules, framework-agnostic
│   │   ├── profile.service.ts
│   │   ├── settings.service.ts
│   │   ├── public-chat.service.ts
│   │   ├── recruiter-chat.service.ts
│   │   ├── resume.service.ts
│   │   ├── llm.service.ts           # the ONLY caller of the LLM provider (runs PII guard)
│   │   ├── personal-info.service.ts # personal header: CRUD, encryption, visibility (§4.1)
│   │   └── errors.ts            # domain errors (NotFound, Revoked, LimitReached…)
│   ├── llm/
│   │   ├── openrouter.ts        # provider factory
│   │   ├── prompts.ts           # builds system prompts from DB data
│   │   ├── stream.ts            # helper: streamText → Response, error handling
│   │   └── pii-guard.ts         # outbound check: no personal-info value in prompts
│   ├── security/
│   │   ├── session.ts           # sign/verify JWT, cookie helpers
│   │   ├── turnstile.ts         # siteverify
│   │   ├── ip.ts                # client IP extraction + salted hash
│   │   └── admin-auth.ts        # login, admin session
│   ├── middleware/
│   │   ├── require-session.ts
│   │   ├── require-active-recruiter-chat.ts
│   │   ├── require-admin.ts
│   │   └── security-headers.ts
│   ├── routes/
│   │   ├── public.ts            # /api/public/*
│   │   ├── recruiter.ts         # /api/r/:token/*
│   │   ├── openapi.ts           # /api/openapi.json
│   │   └── health.ts            # /api/health
│   └── admin/                   # lazily imported (dynamic import)
│       ├── index.tsx            # /admin router
│       ├── layout.tsx
│       ├── login.tsx
│       ├── profile.tsx          # master CV + prompts
│       ├── resumes.tsx          # tailored resumes CRUD + generate
│       ├── chats.tsx            # recruiter chats CRUD + revoke/reset
│       ├── personal-info.tsx    # personal header fields CRUD
│       ├── print.tsx            # printable resume / master CV + print CSS
│       └── static/htmx.min.js
├── drizzle/                     # generated SQL migrations (shipped in the package)
├── examples/
│   ├── vercel/api/[[...route]].ts
│   ├── node/server.ts
│   └── aws-lambda/handler.ts
├── test/
├── drizzle.config.ts
├── .env.example
├── README.md  CONTRIBUTING.md  LICENSE (MIT)
└── package.json
```

## 2.1 Layered architecture (routes → services → repositories)

Same idea as controller → service → repository in Spring.

```
routes/ (JSON, stream)  ─┐
admin/  (HTML + HTMX)   ─┼─→ services/ ─→ repositories/ ─→ Drizzle ─→ Neon
                         │       │
                         │       └─→ llm/ (OpenRouter)
middleware/ ─────────────┘  (auth/session; may call services, never repositories)
```

**Rules**

1. **Routes and admin handlers never import Drizzle, the schema, or repositories.** They: validate input (zod), call one service method, map the result to a response (JSON, text stream or HTML fragment).
2. **Services hold all business rules** and are framework-agnostic: no `Context`, no `Request`/`Response`, no HTML. They receive plain inputs and return plain data or a stream object, and throw **domain errors** from `services/errors.ts`.
3. **Repositories are the DAL**: only Drizzle queries, no business decisions. Atomic statements (the `UPDATE … RETURNING` counters, the `INSERT … ON CONFLICT` usage counter) live here and return raw results (e.g. `null` when no row matched); the service decides what that means.
4. **Services are shared** between the API and the admin. Example: revoking a chat is `recruiterChatService.revoke(id)` whether called from `/admin/chats/:id/revoke` today or from a future API.
5. **Domain error → HTTP mapping happens in one place**: a Hono `onError` handler for `/api/*` (JSON) and one for `/admin/*` (HTML fragment).

| Domain error | `/api` status |
|---|---|
| `ValidationError` | 400 |
| `UnauthorizedError` | 401 |
| `NotFoundError` | 404 |
| `ChatRevokedError` / `ChatExpiredError` | 410 |
| `LimitReachedError` | 429 |
| `LlmUnavailableError` | 502 |

**Dependency wiring (no globals)**

```ts
// container.ts
export function createContainer(config: ResolvedConfig) {
  const db = createDb(config.databaseUrl);

  const repos = {
    profile: new ProfileRepository(db),
    settings: new SettingsRepository(db),
    publicUsage: new PublicUsageRepository(db),
    recruiterChats: new RecruiterChatRepository(db),
    resumes: new ResumeRepository(db),
    messages: new ChatMessageRepository(db),
    personalInfo: new PersonalInfoRepository(db),
  };

  const personalInfo = new PersonalInfoService(repos.personalInfo, config.piiEncryptionKey);
  const llm = new LlmService(config, repos.settings, personalInfo);   // PII guard always on

  return {
    profile: new ProfileService(repos.profile),
    settings: new SettingsService(repos.settings, config),
    publicChat: new PublicChatService(repos.publicUsage, repos.profile, llm, config),
    recruiterChat: new RecruiterChatService(repos.recruiterChats, repos.resumes, repos.profile, llm),
    resumes: new ResumeService(repos.resumes, repos.profile, llm),
    personalInfo,
  };
}
export type Services = ReturnType<typeof createContainer>;

// app.ts
type Env = { Variables: { services: Services; session?: Session } };
const app = new Hono<Env>();
const services = createContainer(config);          // created once per instance, no I/O
app.use("*", async (c, next) => { c.set("services", services); await next(); });
```

Handlers then use `c.var.services.recruiterChat.consumeQuestion(chatId)`.

**Example — recruiter question**

```ts
// repositories/recruiter-chat.repository.ts
async incrementIfAllowed(id: string): Promise<{ remaining: number } | null> {
  const rows = await this.db.update(recruiterChats)
    .set({ used: sql`${recruiterChats.used} + 1`, lastUsedAt: new Date() })
    .where(and(
      eq(recruiterChats.id, id),
      eq(recruiterChats.status, "active"),
      lt(recruiterChats.used, recruiterChats.maxQuestions),
      or(isNull(recruiterChats.expiresAt), gt(recruiterChats.expiresAt, new Date())),
    ))
    .returning({ remaining: sql<number>`${recruiterChats.maxQuestions} - ${recruiterChats.used}` });
  return rows[0] ?? null;
}

// services/recruiter-chat.service.ts
async consumeQuestion(id: string): Promise<{ remaining: number }> {
  const result = await this.chats.incrementIfAllowed(id);
  if (result) return result;
  const chat = await this.chats.findById(id);          // explain why it failed
  if (!chat) throw new NotFoundError();
  if (chat.status === "revoked") throw new ChatRevokedError();
  if (chat.expiresAt && chat.expiresAt <= new Date()) throw new ChatExpiredError();
  throw new LimitReachedError();
}

// routes/recruiter.ts
app.post("/r/:token/chat", requireSession("recruiter"), async (c) => {
  const body = ChatRequestSchema.parse(await c.req.json());
  const { stream, remaining } = await c.var.services.recruiterChat.ask(c.var.session!.cid!, body.messages);
  return stream.toTextStreamResponse({ headers: { "X-Remaining": String(remaining) } });
});
```

**Testing per layer**

- **Services**: unit tests with in-memory fake repositories and a mock LLM — no DB, fast. This is where most business-rule tests live (limits, revoke, expiry, decrement on LLM failure).
- **Repositories**: integration tests against a Neon branch / local Postgres, focused on the atomic statements (including parallel requests).
- **Routes/admin**: a few `app.request()` tests with a container built from fakes, checking status codes, headers, CSRF and the error mapping.

## 3. Public API of the package

```ts
export interface CurriculumApiConfig {
  databaseUrl: string;
  openrouterApiKey: string;
  sessionSecret: string;            // ≥ 32 bytes, used for JWT signing
  turnstileSecret: string;
  adminPasswordHash: string;        // bcrypt hash
  ipHashSalt: string;               // for hashing IPs (privacy)
  piiEncryptionKey: string;         // 32 bytes base64, AES-256-GCM key for personal-info values at rest
  basePath?: string;                // default "" → routes at /api/* and /admin/*
  secureCookies?: boolean;          // default true; false for local http dev
  models?: {
    public?: string;                // OpenRouter model IDs
    tailor?: string;
    recruiter?: string;
  };
  limits?: {
    publicQuestionsPerIpPerDay?: number;   // default 5
    recruiterQuestionsDefault?: number;    // default 10
    publicMaxOutputTokens?: number;        // default 500
    recruiterMaxOutputTokens?: number;     // default 1200
    maxQuestionChars?: number;             // default 1000
    maxHistoryMessages?: number;           // default 10
    sessionTtlMinutes?: number;            // default 120
  };
}

export function createApp(config: CurriculumApiConfig): Hono;
export function migrate(databaseUrl: string): Promise<void>;
```

- Validate config with zod at startup; fail fast with a clear message.
- `createApp` must not perform I/O at import time (keep cold start low).
- Models can also be overridden from the `settings` table (admin) so they change without redeploy; config values are the fallback.

## 4. Data model (Drizzle, Postgres)

```ts
profile            // single row (id = 1)
  id                 integer PK default 1
  fullName           text not null
  headline           text not null          // e.g. "Backend Developer"
  masterCv           text not null          // markdown CAREER BODY only (summary, experience, skills, education) — NO personal info (§4.1)
  publicSystemPrompt     text not null      // instructions for public chat
  recruiterSystemPrompt  text not null      // instructions for recruiter chat
  tailorSystemPrompt     text not null      // instructions for resume tailoring
  updatedAt          timestamptz

settings           // key/value overrides (model IDs, limits)
  key                text PK
  value              text not null

personal_info      // the CV HEADER — personal data, NEVER sent to an LLM (§4.1)
  key                text PK                 // e.g. FULL_NAME, EMAIL, PHONE, CITY, ADDRESS, LINKEDIN, GITHUB
  label              text not null           // human label shown in admin / print
  sortOrder          integer not null default 0
  valueEncrypted     text not null           // AES-256-GCM (iv + ciphertext + tag), base64
  visibility         text not null           // 'public' | 'recruiter' | 'print'
  updatedAt          timestamptz

tailored_resumes
  id                 uuid PK
  title              text not null
  company            text
  jobDescription     text not null
  content            text not null default ''   // markdown CAREER BODY only (no personal info)
  headerFields       text[]                      // personal_info keys shown in the printed header
  model              text                        // model used to generate
  createdAt, updatedAt timestamptz

recruiter_chats
  id                 uuid PK
  token              text unique not null   // random, URL-safe, ≥ 22 chars (nanoid/crypto)
  recruiterName      text not null
  company            text
  jobDescriptionShort text
  tailoredResumeId   uuid null → tailored_resumes.id (on delete set null)
  maxQuestions       integer not null default 10
  used               integer not null default 0
  status             text not null default 'active'   // 'active' | 'revoked'
  expiresAt          timestamptz null
  createdAt          timestamptz
  lastUsedAt         timestamptz null

public_usage
  ipHash             text not null
  day                date not null
  used               integer not null default 0
  PK (ipHash, day)

chat_messages      // optional log, retention configurable
  id                 uuid PK
  recruiterChatId    uuid null → recruiter_chats.id (on delete cascade)   // null = public
  role               text not null   // 'user' | 'assistant'
  content            text not null
  createdAt          timestamptz
```

Notes:
- `profile.fullName` / `headline` are only for the UI; the LLM never receives the name (prompts say "the candidate").
- Store a **salted SHA-256 of the IP**, never the raw IP (GDPR).
- Provide a seed command that inserts an empty `profile` row with sensible default prompts.
- Recommended: a cleanup query (documented) that deletes `public_usage` older than 30 days and `chat_messages` older than N days.

## 4.1 Personal info vs career body — personal data never goes to an LLM

**Requirement:** the owner's personal data (name, email, phone, address, links, date of birth…) must never be sent to any LLM provider.

**Approach — the CV is split in two parts:**

```
┌──────────────────────────────────────────────┐
│ PERSONAL HEADER   (table personal_info)      │  never sent to an LLM
│ name · city · email · phone · LinkedIn …     │  stored encrypted
├──────────────────────────────────────────────┤
│ CAREER BODY       (profile.masterCv /        │  the only part sent to an LLM
│                    tailored_resumes.content) │
│ summary · experience · skills · education …  │
└──────────────────────────────────────────────┘
```

- **LLM input** = prompts + career body (+ job description). Nothing else.
- **Chats**: the model has no contact data. Contact info is shown by the **UI** from the `contact` field of the API responses, filtered by visibility:

| Visibility | Public page | Recruiter page | Printable resume |
|---|---|---|---|
| `public` (e.g. LinkedIn, GitHub) | shown | shown | shown |
| `recruiter` (e.g. email, phone) | hidden | shown | shown |
| `print` (e.g. address, date of birth) | hidden | hidden | shown (if selected for that resume) |

- **Tailor resume**: the LLM receives the master **body** + job description and returns a tailored **body**. The printable resume = personal header + tailored body, joined on the server (§5.5).

**Rules for implementation**

1. `PersonalInfoService` owns CRUD, encryption/decryption (AES-256-GCM via Web Crypto, key from `piiEncryptionKey`) and `contactFor(channel)`.
2. **PII guard** (`llm/pii-guard.ts`), defense in depth in case personal data slips into the body:
   - on **save** of master CV / tailored resume in admin: if any personal-info value is found in the body (case-insensitive; phone compared by digits only; email normalized), reject the save with a clear message ("Your email is in the body — keep contact data in Personal info");
   - before **every** LLM call (`LlmService`): same scan over the full prompt; if found in the body → refuse the call and log a warning (never the value); if found in a visitor's message → replace it with `[redacted]`.
3. Logs and `chat_messages` never contain personal-info values.
4. **Recruiter data** (third-party): the recruiter's name and company are shown in the UI but are **not** sent to the LLM; the prompt says "the recruiter" / "the company". The owner should not paste personal data in job descriptions (document this; the guard does not cover third-party data).
5. Configure OpenRouter to use only providers that do not train on prompts.

## 5. Routes

### 5.1 Public (`/api/public`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/public/session` | Turnstile token in body | Verifies Turnstile, sets cookie `curr_session` with scope `public` |
| POST | `/api/public/chat` | `requireSession('public')` | Streams answer. Body: `{ messages: [{role, content}] }` |
| GET | `/api/public/profile` | none | `{ fullName, headline, contact }` for the UI (`contact` = personal-info fields with visibility `public`) |

`/api/public/chat` flow:
1. Validate body (zod): last message is `user`, ≤ `maxQuestionChars`, history ≤ `maxHistoryMessages`.
2. Atomic per-IP counter:
   ```sql
   INSERT INTO public_usage (ip_hash, day, used) VALUES ($1, current_date, 1)
   ON CONFLICT (ip_hash, day) DO UPDATE SET used = public_usage.used + 1
     WHERE public_usage.used < $limit
   RETURNING used;
   ```
   No row returned → `429` with JSON `{ error: "limit_reached" }`.
3. Build system prompt = `publicSystemPrompt` + `masterCv` (career body only); run the PII guard.
4. `streamText` with the public model and `publicMaxOutputTokens`; return text stream.
5. Response headers: `X-Remaining`, `Cache-Control: no-store`.
6. If the LLM call fails before streaming starts → decrement the counter, return `502`.

### 5.2 Recruiter (`/api/r/:token`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/r/:token` | none | `{ recruiterName, company, remaining, status, contact }` (`contact` = personal-info fields with visibility `public` or `recruiter`, shown by the UI, never by the LLM); `404` for unknown, `410` for revoked/expired |
| POST | `/api/r/:token/session` | Turnstile token | Verifies Turnstile + chat is active → cookie with scope `recruiter:<chatId>` |
| POST | `/api/r/:token/chat` | `requireSession('recruiter')` + `requireActiveRecruiterChat` | Streams answer |

Rules:
- The session scope must match the `:token`'s chat id (a cookie for chat A must not work for chat B).
- **Revocation takes effect immediately**: the active/limit check happens in the DB on every question, not only in the JWT:
  ```sql
  UPDATE recruiter_chats
     SET used = used + 1, last_used_at = now()
   WHERE id = $id AND status = 'active'
     AND used < max_questions
     AND (expires_at IS NULL OR expires_at > now())
  RETURNING max_questions - used AS remaining;
  ```
  No row → re-read the chat to answer `410` (revoked/expired) or `429` (limit).
- Context = `recruiterSystemPrompt` + (tailored resume content if linked, else `masterCv`) + `jobDescriptionShort`. Recruiter name/company are NOT sent (§4.1). PII guard runs before the call.
- Same streaming, headers, and decrement-on-failure behaviour as the public chat.

### 5.3 Admin (`/admin`) — server-rendered HTML

All admin code is loaded via **dynamic import** so the chat routes don't pay for it on cold start.

| Method | Path | Description |
|---|---|---|
| GET/POST | `/admin/login` | Password form → bcrypt verify → admin cookie `curr_admin` (JWT, scope `admin`, 8h) |
| POST | `/admin/logout` | Clears cookie |
| GET | `/admin` | Dashboard: counts, recent usage |
| GET/POST | `/admin/profile` | Edit full name, headline, master CV, prompts |
| GET/POST | `/admin/settings` | Model IDs and limits overrides |
| GET | `/admin/personal-info` | Personal header fields (values masked), order, visibility |
| POST | `/admin/personal-info` | Create field (key, label, value, visibility) |
| PUT | `/admin/personal-info/:key` | Update value/label/visibility/order |
| DELETE | `/admin/personal-info/:key` | Delete field (`hx-confirm`) |
| GET | `/admin/personal-info/:key/reveal` | Returns the decrypted value fragment (HTMX, admin only, `Cache-Control: no-store`) |
| GET | `/admin/resumes` | List |
| POST | `/admin/resumes` | Create from job description (title, company, JD) |
| GET | `/admin/resumes/:id` | View/edit (textarea markdown + live preview via `hx-post`) |
| POST | `/admin/resumes/:id/generate` | Generate/regenerate with the tailor model; show loading indicator (`hx-indicator`) |
| PUT | `/admin/resumes/:id` | Save edits |
| DELETE | `/admin/resumes/:id` | Delete (`hx-confirm`) |
| GET | `/admin/resumes/:id/print` | Printable resume = personal header + tailored body (§5.5) |
| GET | `/admin/profile/print` | Printable master CV (§5.5) |
| GET | `/admin/resumes/:id/download.md` | Markdown download (personal header + body) |
| GET | `/admin/chats` | List with used/max, status, expiry, last used |
| POST | `/admin/chats` | Create → show full link with copy button |
| PATCH | `/admin/chats/:id/revoke` | Revoke → returns updated `<tr>` |
| PATCH | `/admin/chats/:id/reset` | Reset `used` to 0 → returns updated `<tr>` |
| DELETE | `/admin/chats/:id` | Delete → removes `<tr>` |
| GET | `/admin/static/htmx.min.js` | Vendored HTMX with long cache headers |

Admin security:
- `requireAdmin` on everything except `/admin/login` and static assets.
- `hono/csrf` on all non-GET admin routes.
- Login: constant-time verify, small artificial delay, and a DB- or memory-based throttle (e.g. 5 attempts / 15 min per IP hash).
- Admin cookie: `HttpOnly; Secure; SameSite=Strict; Path=/admin`.
- Headers: `X-Frame-Options: DENY`, strict CSP (self only; allow the vendored HTMX), `Referrer-Policy: same-origin`.
- Render markdown preview with a sanitizer (or render as escaped text) — never inject raw HTML from the LLM.

Admin look: simple, clean, readable; light retro touch allowed (pixel font for headings only), no client framework.

### 5.5 Printable resume

Every tailored resume (and the master CV) must have a print-ready version. This is where the personal header and the career body are joined — on the server, without any LLM call.

- Route: `GET /admin/resumes/:id/print` (and `/admin/profile/print`), admin only, `Cache-Control: no-store`, `X-Robots-Tag: noindex`.
- Rendering: personal header (the fields in `headerFields`, in `sortOrder`) + server-side markdown → HTML of the body (sanitized). No LLM call. No client framework; a "Print / Save as PDF" button that calls `window.print()` (hidden in print).
- Dedicated print stylesheet:
  - `@page { size: A4; margin: 16mm 18mm; }` (configurable to Letter in settings).
  - Single column, real text (no images of text), standard fonts (system serif/sans), body 10.5–11pt, headings scaled down, black on white, links shown as text.
  - `break-inside: avoid` on each job/experience block; `break-after: avoid` on headings; no headers/footers from the app.
  - Hide all admin chrome and the pixel font in print.
- **ATS-friendly**: semantic headings (`h1` name, `h2` sections, `h3` roles), plain lists, no tables for layout, so the PDF text extracts cleanly.
- Per resume, the admin chooses which personal fields appear in the printed header (`headerFields`, e.g. hide address for some applications); default = all fields.
- Optional later: server-side PDF generation is **out of scope** for now (headless Chrome is heavy for serverless); browser "Save as PDF" is the supported path.
- The print view shows a warning banner (screen only) if the PII guard finds a personal-info value inside the body.

### 5.4 Misc

- `GET /api/health` → `{ ok: true }` (no DB call).
- `GET /api/openapi.json` → generated from `@hono/zod-openapi` (public + recruiter routes only; admin is HTML and not part of the API contract).

## 6. Sessions

- Cookie `curr_session`: JWT (HS256, `jose`), payload `{ scope: "public" | "recruiter", cid?: string, iat, exp }`, TTL `sessionTtlMinutes`.
- Attributes: `HttpOnly; SameSite=Strict; Path=/api; Secure` (unless `secureCookies: false`).
- Turnstile verification: POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response` and `remoteip`; reject on `success: false`.
- Client IP: first entry of `x-forwarded-for` (fallback `x-real-ip`); document that this is correct behind Vercel/CloudFront and how to adapt elsewhere.

## 7. LLM integration

- Provider: `createOpenRouter({ apiKey })`.
- Use `streamText(...).toTextStreamResponse()`.
- System prompt built from DB data; mark the CV block for **prompt caching** when the target model supports it (Anthropic via OpenRouter needs `cache_control`; Gemini caches implicitly). Keep the CV block first and stable to maximize cache hits.
- Prompts must instruct the model to: answer only about the person's professional profile, say when information is not in the CV, never invent facts, answer in the user's language, refuse prompt-injection attempts to change role; refer to the person as "the candidate"; if asked for contact details, say they are shown on the page and never invent any (§4.1).
- Every call goes through `LlmService`, which always runs the PII guard first — there is no code path that calls the provider directly.
- Tailor resume: non-streaming `generateText` (or stream into the textarea via HTMX SSE — optional), output markdown only.
- Timeouts: rely on streaming; document that on Vercel Hobby with Fluid compute the function limit is 300s.
- Never log API keys; log model ID, token usage and latency.

## 8. Error handling

JSON errors for `/api/*`: `{ error: string, message?: string }` with proper status (`400`, `401`, `403`, `404`, `410`, `429`, `502`). Admin errors render an HTML error fragment. No stack traces in responses.

## 9. Testing

- Unit: prompt builder, session sign/verify, IP hashing, config validation.
- Route tests with `app.request()` (Hono) and a mocked LLM provider (AI SDK test utilities / mock model).
- DB tests against a Neon **branch** or local Postgres (Docker) — configurable via `TEST_DATABASE_URL`.
- Must cover: counter limits and atomicity (parallel requests), revoke takes effect immediately, scope mismatch rejected, CSRF required on admin mutations, decrement on LLM failure.
- PII (mandatory): the mock LLM records every prompt it receives — assert that **no personal-info value ever appears** in any recorded prompt across all flows (public, recruiter, tailor); guard blocks saving a body that contains a personal-info value (incl. normalized phone/email); `contact` in API responses respects visibility; encryption round-trip and wrong-key failure; print view joins header + body correctly.
- CI (GitHub Actions): lint, typecheck, test, build on every PR.

## 10. Packaging and release

- `package.json`: `"type": "module"`, `exports` for `.` (ESM + types), `files`: `dist`, `drizzle`, `README.md`, `LICENSE`.
- `hono` as a dependency (pinned range); document Node ≥ 22.
- Versioning: semver, changesets (or manual tags). Releases published to npm from CI on tag.
- `.env.example` documents every variable:
  ```
  DATABASE_URL=
  OPENROUTER_API_KEY=
  SESSION_SECRET=           # openssl rand -base64 32
  TURNSTILE_SECRET=
  ADMIN_PASSWORD_HASH=      # npx curriculum-api hash-password  (small bin script)
  IP_HASH_SALT=
  PII_ENCRYPTION_KEY=       # openssl rand -base64 32  (losing it = losing personal-info values)
  MODEL_PUBLIC=
  MODEL_TAILOR=
  MODEL_RECRUITER=
  ```
- Provide a tiny CLI (`bin`): `curriculum-api migrate`, `curriculum-api seed`, `curriculum-api hash-password`.

## 11. README must include

- What it is, screenshot of the admin, architecture diagram.
- Quick start: Vercel (with "Deploy to Vercel" button and Neon integration), Node, AWS Lambda (`hono/aws-lambda`, Function URL with response streaming), Cloudflare (notes on CPU limits).
- Configuration reference.
- Security notes: set an OpenRouter spend limit, add a Vercel Firewall rate-limit rule, rotate secrets.
- Turnstile test keys for local dev: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

## 12. Portability rule

`src/` must not import anything platform-specific (`@vercel/*`, AWS SDK, etc.). Platform glue lives only in `examples/` and in the consuming project.
