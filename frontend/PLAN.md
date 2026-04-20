# Frontend Plan — macro_dashboard

Vite + React SPA. One page. See `../API.md` for the HTTP contract — that file is the source of truth for shapes.

## Scope

- **v1 (this plan)**: asset cards only. No news section rendered.
- **v2 (deferred)**: news cards. Spec below is kept but marked **[v2 — deferred]**. Don't build v2 pieces yet.

## Goals (v1)

- Render the dashboard fast and keep it readable on common screen sizes (1440 down to ~1024 wide).
- Prices, changes, and sparklines visible at a glance.
- Polling only — no WebSockets.

## Stack

- Vite + React + TypeScript
- Tailwind CSS for styling
- `@tanstack/react-query` for server state and polling
- `recharts` for sparklines (small footprint, declarative). Alternative: hand-rolled SVG if recharts feels heavy.
- No router. Single page.
- No global state library. React Query handles cache; everything else is local component state.

## Layout

```
frontend/
  PLAN.md
  package.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  index.html
  .env.example          # documents VITE_API_BASE
  src/
    main.tsx            # bootstrap, QueryClientProvider
    App.tsx             # page layout, grid
    api/
      client.ts         # fetch wrapper, base URL from env
      assets.ts         # GET /assets
      prices.ts         # GET /prices
      # news.ts         # [v2 — deferred]
      types.ts          # response types matching API.md
    components/
      AssetCard.tsx
      # NewsCard.tsx    # [v2 — deferred]
      Sparkline.tsx
      ChangeBadge.tsx   # green/red percent change pill
      Grid.tsx          # responsive grid wrapper
    hooks/
      usePrices.ts      # react-query, 60s poll
      # useNews.ts      # [v2 — deferred]
      useAssets.ts      # react-query, no poll (list rarely changes)
    lib/
      format.ts         # number/currency formatting
```

## Page structure

One page. Top: title + last-updated timestamp. Body: a CSS grid of asset cards.

For v1 the layout is fixed:
- Asset cards fill the viewport (auto-fit, ~240px wide).
- **[v2 — deferred]** News cards (~360px wide), 2-3 columns, rendered below the asset grid.

No drag-and-drop. No persistence of layout.

## Components

**`AssetCard`** — props: one entry from `/prices` (joined with display name from `/assets`).
- Display name (top, slightly muted)
- Big price, formatted with thousands separators and the right number of decimals (2 for fiat, 0-4 for crypto/FX)
- Change badge: `+1.23%` green or `-0.45%` red
- Sparkline filling the bottom third of the card
- Currency code in small text next to price

**`NewsCard`** — **[v2 — deferred]**. Props: one entry from `/news`.
- Source (small, top)
- Title (bold, 1-2 lines, truncate)
- Summary (3-4 lines)
- "X hours ago" timestamp + source link icon

**`Sparkline`** — recharts `<LineChart>` with no axes/grid, just the line. Color: green if last > first, red if last < first, gray otherwise.

**`ChangeBadge`** — pill with color and arrow. Shared between AssetCard and anywhere else.

## Data fetching

Use React Query for everything.

```ts
// usePrices.ts
useQuery({
  queryKey: ['prices'],
  queryFn: getPrices,
  refetchInterval: 60_000,
  staleTime: 30_000,
})
```

Polling intervals:
- `/prices`: 60s
- `/assets`: once on mount, no refetch
- **[v2 — deferred]** `/news`: 5 minutes

Keep error UX simple: if a query fails, show the last successful data with a small "stale" indicator. Don't blow up the page.

## Styling

Tailwind. Dark mode by default for v1 — financial dashboards look right dark. Use `dark:` classes if you want a future toggle, or just commit to dark and skip the variants for now (faster).

Color guidelines:
- Background: near-black (`bg-zinc-950`)
- Cards: slightly lighter (`bg-zinc-900`), subtle border
- Positive change: `text-emerald-400`
- Negative change: `text-red-400`
- Muted text: `text-zinc-400`

## Configuration

`.env.example`:

```
VITE_API_BASE=http://localhost:8000
```

In code, read with `import.meta.env.VITE_API_BASE`. Default to `http://localhost:8000` if unset (dev convenience).

## Build order (v1)

1. `npm create vite@latest frontend -- --template react-ts` (already inside `frontend/`, so init in place).
2. Install Tailwind, configure `tailwind.config.js` and `postcss.config.js`, add directives to `src/index.css`.
3. Install `@tanstack/react-query` and `recharts`.
4. Set up `api/client.ts` and `api/types.ts` matching `../API.md` exactly (prices + assets types only).
5. Hard-code mock data in each hook first — build out the UI without the backend running. Make it look right.
6. Wire `useAssets` + `usePrices` to the real API. Verify against backend running on `localhost:8000`.
7. `AssetCard` with sparkline.
8. `Grid` layout — responsive, auto-fit columns.
9. Polish: empty states, loading skeletons, error indicator.

**[v2 — deferred] later steps**: add `api/news.ts`, `useNews` hook, `NewsCard` component, render the news section below the asset grid.

## Things to watch

- Korean characters need a font stack that includes a Korean font. Tailwind's default `font-sans` works on most systems; if it looks bad, add `'Pretendard'` or `'Noto Sans KR'` to the stack.
- Numbers need locale-aware formatting. Use `Intl.NumberFormat` not template strings.
- Sparkline arrays may be short (less than 30 points). Recharts handles this fine; don't pad.
- Frontend should never call yfinance or RSS feeds directly. Everything goes through the backend.

## Out of scope for v1

- News section (v2)
- Layout customization (drag-and-drop, save preferences)
- Auth
- Multiple dashboards
- Mobile-optimized layout (target desktop first)
- Charts beyond a sparkline (no full time-range price chart yet)
