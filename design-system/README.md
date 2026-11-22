# Career Chat — admin design system

The generic admin look: light, neutral, one indigo accent. Built for **Tailwind CSS v4** and server-rendered **TSX + htmx**.

| File | What it is |
|---|---|
| `theme.css` | The whole system: tokens in `@theme`, base styles, component classes. Your only stylesheet entry. |
| `tokens.json` | The same tokens as data, with usage notes (for docs, other tools, a future dark theme). |
| `src/components.tsx` | Example components: layout + sidebar, page header, score bar, badges, resume list with live search, generate form with loading state, chat-link row with revoke. |

## Setup

```bash
npm i -D tailwindcss @tailwindcss/cli
npx @tailwindcss/cli -i ./theme.css -o ./public/app.css --watch
```

`theme.css` scans `./src/**/*.{tsx,ts,html}` — adjust the `@source` line to your folder. Fonts load from Google Fonts in `AdminLayout`.

## How to style

1. **Use a component class when one exists**: `btn`, `btn-ghost`, `btn-icon`, `card`, `card-pad`, `field` + `field-label` + `input`, `chip`, `badge badge-success`, `list-head` / `list-row`, `score`, `nav-item`, `eyebrow`, `page-title`.
2. **Otherwise use utilities with the tokens**: `bg-surface`, `text-muted`, `border-line`, `rounded-card`, `font-display`, `shadow-raised`, `min-h-control`.
3. **No raw hex values** in templates. A new colour goes into `@theme` (and `tokens.json`) first.

## Rules of the look

- Cards rest on a 1px `line` border, no shadow. `shadow-raised` is for floating things only.
- Indigo `primary` is for actions and the active nav item. Status colours mean status, never decoration.
- Match scores: `high` ≥ 80 (green), `mid` 65–79 (amber), `low` < 65 (red).
- Every control is at least 44px tall. Focus is a 2px indigo outline.
- Lists over card grids: collections are one bordered list (`table-scroll` + `list-row`).

## htmx patterns

- Loading: put `class="htmx-indicator"` on the element to show during a request and point `hx-indicator` at it.
- Toggle chips: `aria-pressed="true|false"` drives the selected style.
- Status: `badge` + `badge-success|warning|danger|neutral`.

## React instead of server TSX?

The CSS doesn't change. In the components, rename `class` → `className` and `for` → `htmlFor`, and replace `hx-*` with handlers.
