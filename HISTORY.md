# Project History - macro_dashboard

## 2026-04-20: v1 Initial Implementation

### 1. Planning & Research
- Analyzed `README.md`, `API.md`, and `PLAN.md` to define v1 scope (Prices only, News deferred to v2).
- Integrated insights from Hyoseo's blog post: focus on habit-building UX and robust server structure.
- Adopted the `sample_design.html` as the visual North Star (IBM Plex Mono/Sans, dark mode, high density).

### 2. Backend Development (FastAPI)
- **Infrastructure**: Configured Docker with PostgreSQL 16 on port `5433` (to avoid host conflicts).
- **Database**: Set up SQLAlchemy 2.x with async support and Alembic migrations.
- **Data Ingestion**: Implemented `yfinance` service to fetch live prices and 30-day history.
- **Background Jobs**: Integrated `APScheduler` to refresh all 8 assets every 15 minutes.
- **API**: Exposed `GET /assets` and `GET /prices` endpoints following the `API.md` contract.

### 3. Frontend Development (React + Vite)
- **Stack**: Vite, TypeScript, Tailwind CSS, TanStack React Query, and Recharts.
- **Data Layer**: Implemented polling-based state management (60s interval) for real-time updates.
- **UI Architecture**: Decoupled components (`AssetCard`, `Sparkline`, `ChangeBadge`) for maintainability.

### 4. Design Iterations
- **Initial Scaffold**: Implemented the base grid and dark-mode styling.
- **Sparkline Evolution**:
    - Started with Recharts (encountered sizing warnings).
    - Switched to hand-rolled Bezier SVG for performance.
    - Returned to Recharts + enlarged cards to support interactive hover/tooltips with exact prices and dates.
- **Layout Refinement**:
    - Increased card size (320px+ width) for better visibility.
    - Attached the graph directly to the price section for a unified visual block.
    - Removed secondary backgrounds to achieve a "final v1" minimal look.
    - Enlarged and emphasized the percentage change indicators (e.g., ▲+1.23%).

### 5. Current State (as of 2026-04-20)
- **Backend**: Live on `:8000`.
- **Frontend**: Live on `:5173`.
- **Database**: Populated with 8 global assets (Equities, Crypto, FX, Commodities).
- **Scope**: v1 feature-complete. v2 (AI News) remains in planning.

---

## 2026-04-22: Asset Management & UX Improvements

### 1. Asset CRUD
- **Add**: New "+" card in the grid opens a modal to add assets. Symbol field has Yahoo Finance autocomplete (proxied via `GET /assets/search`). Selecting a result auto-fills display name, category, and currency (fetched from yfinance via `GET /assets/currency`).
- **Delete**: 3-dot menu on each card with fade-out animation. Backend `DELETE /assets/{id}` cascades to `price_snapshots`.
- **Rename**: 3-dot menu "Rename" option turns the title into an inline editable input. Backend `PATCH /assets/{id}`.
- Removed hardcoded asset seed list from `config.py` and startup seeding from `main.py`. Assets are now managed entirely through the UI.

### 2. Backend Fixes
- Fixed `fetch_price_data` blocking the event loop — now runs yfinance in a thread pool via `asyncio.to_thread`.
- Fixed "failed to add asset" error caused by SQLAlchemy session expiry after commit — added `db.refresh(asset)`.
- Asset creation returns immediately; price fetch runs in background via `asyncio.ensure_future`.
- Added `httpx` dependency for Yahoo Finance search proxy.

### 3. Frontend Enhancements
- **Animations**: Fade-in + scale on new cards, fade-out + scale on delete.
- **Fast polling**: After adding an asset, prices poll every 3s until the new asset's price appears, then reverts to 60s.
- **Title layout**: Display name shown first (larger, brighter), Yahoo symbol below (smaller, dim).
- **Price formatting**: Small FX values (e.g. JPY/KRW ≈ 9.xx) now show 2 decimal places instead of rounding to 0.
- Removed focus outlines on sparkline chart clicks.

### 4. Housekeeping
- Added `.gitignore` and untracked `.venv` / `__pycache__` from git (removed ~9,800 generated files).
- Updated `CLAUDE.md` with Alembic notes and migration commands.

### 5. Current State
- **Backend**: Live on `:8000`. Endpoints: `GET /assets`, `POST /assets`, `PATCH /assets/{id}`, `DELETE /assets/{id}`, `GET /assets/search`, `GET /assets/currency`, `GET /prices`, `GET /health`.
- **Frontend**: Live on `:5173`. Dynamic asset grid with add/delete/rename.
- **Database**: User-managed assets only (no hardcoded seeds).
- **Scope**: v1 extended with asset management. v2 (AI News) remains in planning.

---

## 2026-04-23: v1.1.0 — Cleanup & v2 Prep

### 1. Cleanup
- Removed unused Vite template assets: `react.svg`, `vite.svg`, `hero.png`, `App.css` (all dead code), `icons.svg`.
- Removed empty `src/assets/` directory.
- Fixed favicon path in `index.html` (was pointing to non-existent `/vite.svg`, now `/favicon.svg`).

### 2. Small Fixes
- **Currency visibility**: Increased currency label size (11px → 13px) and brightness for better readability.
- **Versioning**: Bumped to `v1.1.0` across `package.json`, `pyproject.toml`, and the UI header. Adopted semver convention: version prefix on all commit messages.

### 3. Docs
- Rewrote `README.md`: reflects v1 as complete, updated stack details, added quick start commands, replaced hardcoded asset table with roadmap summary linking to `PLAN_future.md`.
- Updated `PLAN_future.md`: removed "Small fix needed" section (resolved), cleaned up formatting.
- Added `.claude/`, `.gemini/`, `graphify-out/` to `.gitignore`.

### 4. v2 Planning Decisions
v2 = Widget System & Customizable Grid. Key decisions made:
- **Add Widget flow**: Widget-type picker first (Asset or Time), then type-specific config.
- **Delete behavior**: Deleting an asset *widget* removes only the widget, not the underlying asset from the `assets` table. Prepares for v3 shared catalog.
- **Grid**: 6 columns via `react-grid-layout` for high customizability.
- **Migration**: Existing assets will NOT be auto-migrated to widgets. Start fresh with one TSLA asset for testing.
- **No news, no user accounts** — those remain v4 and v3 respectively.

---

## 2026-04-23: v2 — Widget System & Customizable Grid

### Design Decisions

Before implementation, the following decisions were made:

1. **Orphan asset cleanup**: When no widget references an asset, remove it from the `assets` table (and its `price_snapshots`). In v3 multi-user, orphans will be rarer since multiple users share the asset catalog.
2. **Display name is widget-owned**: Widget config stores `label`. Users edit the widget title, NOT the underlying asset name. `PATCH /assets/{id}` rename endpoint removed. Asset table stores the canonical Yahoo Finance name only.
3. **Add Widget button**: Only visible in edit mode. Placement may change after prototyping.
4. **Default widget size**: 1x1 (compact) for all new widgets.
5. **Grid compaction**: Disabled — allow free placement with empty space. Consider fixed-height viewport (no scroll) as a future constraint.
6. **Responsive**: Fewer columns on smaller screens via `ResponsiveGridLayout`, but desktop-first (6 cols).
7. **Existing v1 data**: Clean slate — assets will be added manually to test features.

### Phase 1: Backend — Widget Model + Migration + CRUD

- **Widget model**: Added `Widget` to `models.py` with `id` (auto-increment int), `type` (enum: asset/time), `config` (jsonb), `layout_x/y/w/h`.
- **Schemas**: `WidgetSchema`, `WidgetCreateSchema`, `WidgetUpdateSchema`, `LayoutItemSchema`. Removed `AssetUpdateSchema`.
- **Widget router** (`routers/widgets.py`): 5 endpoints:
  - `GET /widgets` — list all, ordered by position
  - `POST /widgets` — create with validation (asset existence, timezone validity)
  - `PATCH /widgets/{id}` — partial update (config or layout)
  - `DELETE /widgets/{id}` — delete widget + orphan asset cleanup
  - `PUT /widgets/layout` — batch layout save for drag-and-drop
- **Orphan cleanup**: On widget delete, if no other widget references the same `asset_id`, the asset and its snapshots are deleted.
- **Removed**: `PATCH /assets/{id}` rename endpoint (display name is now widget-owned).
- **Migration**: `a32d37208a59_add_widgets_table` — applied successfully.

### Phase 2: Frontend — Types + API Layer + Hook

- **Installed** `react-grid-layout` + `@types/react-grid-layout`.
- **Types** (`api/types.ts`): Added `Widget`, `WidgetType`, `AssetWidgetConfig`, `TimeWidgetConfig`, `LayoutItem`.
- **API module** (`api/widgets.ts`): `getWidgets`, `createWidget`, `updateWidget`, `deleteWidget`, `updateLayout`.
- **Hook** (`hooks/useWidgets.ts`): `useWidgets()` — same pattern as `useAssets` with `staleTime: Infinity`.
- All existing code untouched; `AssetCard` + `AddAssetModal` still functional for now.

### Phase 3: Frontend — Widget Grid + Edit Mode

- **WidgetGrid** (`components/WidgetGrid.tsx`): Wraps `ResponsiveGridLayout` with 6/4/2/1 column breakpoints (lg/md/sm/xs). `compactType={null}` for free placement. `preventCollision={true}`. Layout changes debounced 400ms before saving via `PUT /widgets/layout`.
- **WidgetDispatcher** (`components/WidgetDispatcher.tsx`): Routes widgets to type-specific components. Currently renders placeholders showing type + label — real widget components come in Phases 4 & 5.
- **Edit mode**: Toggle button in the header strip. When active: grid becomes draggable/resizable, dashed borders appear, delete buttons (X) show on each widget. When locked: static grid, no interaction.
- **App.tsx rewrite**: Replaced the v1 asset grid with `WidgetGrid`. Removed `AssetCard`/`AddAssetModal` usage. `useAssets` and `usePrices` still called at top level to keep caches warm.
- **CSS**: Added edit mode button, widget cell, delete button, placeholder, and react-grid-layout dark theme overrides.
- **Fix**: `react-grid-layout` v2 dropped `WidthProvider` — switched to `useContainerWidth` hook + explicit `width` prop.

### Current State (Phases 1–3 complete, 4–7 remaining)

- **Backend**: Live on `:8000`. New endpoints: `GET/POST /widgets`, `PATCH/DELETE /widgets/{id}`, `PUT /widgets/layout`. Removed `PATCH /assets/{id}`.
- **Frontend**: Live on `:5173`. Widget grid with edit mode (drag/drop/resize/delete). Widgets render as placeholders — real Asset and Time widget components are Phase 4 & 5.
- **Database**: `widgets` table added. Assets/snapshots tables unchanged.
- **Next**: Phase 4 (Asset Widget) and Phase 5 (Time Widget) can run in parallel, then Phase 6 (Add Widget Modal), Phase 7 (Polish).
