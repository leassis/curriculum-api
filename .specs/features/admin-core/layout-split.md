# Admin layout: routes and view split

`src/admin/<page>/routes.ts` holds the Hono handlers: input parsing, service calls, PII checks,
redirects, cookies and headers. `src/admin/<page>/view.tsx` holds JSX only, as pure functions from
plain props. `script.ts` holds a page's static script and `print/style.ts` the print stylesheet.
`chats/messages/` is the messages page. Shared pieces stay at `src/admin/`: `index.tsx` (wiring),
`layout.tsx`, `error-fragment.tsx` and `static/`.

Boundary, enforced by `scripts/check-architecture.ts` (part of `pnpm lint`): `view.tsx`,
`layout.tsx` and `error-fragment.tsx` under `src/admin/` must not import `services/`,
`repositories/`, `security/`, `db/` or `llm/`, type imports included. Views declare their own prop
types; service objects satisfy them structurally. Routes call views as functions
(`c.html(ProfilePage({ ... }))`), so `routes.ts` contains no JSX.
