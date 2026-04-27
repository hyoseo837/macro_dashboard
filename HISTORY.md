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

### Phase 4: Asset Widget — Responsive Price Cards

- **Backend**: Added `day_high`, `day_low`, `volume` (nullable) to `PriceSnapshot` model. Fetched from yfinance `fast_info`. Exposed in `/prices` response. Migration `e55cbd8eb5b9`.
- **AssetWidget** (`components/AssetWidget.tsx`): Replaces the phase 3 placeholder. Reads from shared price/asset caches via `usePrices`/`useAssets` hooks. Display name from `config.label`.
- **4 responsive size variants** driven by live grid dimensions:
  - **1x1 compact**: label, sparkline, price + change badge
  - **2x1 wide**: label + price top row, sparkline, stats bar (day range, volume)
  - **1x2 tall**: label, stretched sparkline, price + change badge
  - **2x2 full**: label + large price, chart with date axis, stats bar (day range, volume, prev close)
- **Live variant switching**: `WidgetGrid` tracks current layout dimensions in state, passes them through `WidgetDispatcher` → `AssetWidget`. Resizing a widget in edit mode updates the variant immediately.
- **Sparkline gradient fix**: Replaced static `gradient-up`/`gradient-down` IDs with `useId()`-based unique IDs per widget instance, fixing SVG gradient collisions.
- **Grid bugs fixed**: Added `static: !editMode` to layout items (belt-and-suspenders for drag prevention). Added `onSuccess` to `layoutMutation` to invalidate widgets query so layout changes persist after locking.

### Phase 5: Time Widget — Live Clocks

- **TimeWidget** (`components/TimeWidget.tsx`): Live clock ticking every second via `Intl.DateTimeFormat` + `setInterval`.
- **Analog/digital mode**: Users choose at widget creation. Config stores `mode: "analog" | "digital"`. Defaults to analog for widgets without a mode set.
- **AnalogClock** (`components/AnalogClock.tsx`): SVG-based clock face with hour markers, hour/minute/second hands, green accent on seconds hand and center dot.
- **4 responsive size variants** (same pattern as AssetWidget):
  - **1x1 compact**: label + clock (analog or digital) + UTC offset
  - **2x1 wide**: analog: clock on left with digital + date on right. Digital: large time + date
  - **1x2 tall**: analog: clock + digital time + date details. Digital: large time + details
  - **2x2 full**: analog: large clock + digital + full details row. Digital: extra-large time + details
- Backend timezone validation was already in place from Phase 3 (`zoneinfo.available_timezones()`).

### Phase 6: Add Widget Modal

- **AddWidgetModal** (`components/AddWidgetModal.tsx`): Two-step flow — type picker (Asset or Time) → type-specific config.
- **Type picker**: Cards with icons (TrendingUp, Clock) and descriptions. Back arrow returns to picker from config step.
- **Asset config**: Reuses Yahoo Finance autocomplete from v1. Search → select → auto-fills label, category, currency. Creates the asset (or ignores 409 if it already exists) then creates the widget.
- **Time config**: Searchable timezone list fetched from `GET /timezones` (all 498 IANA timezones), label input, analog/digital mode toggle.
- **Backend**: Added `GET /timezones` endpoint returning sorted `zoneinfo.available_timezones()`.
- **+ Add button**: Visible only in edit mode, in the header strip next to the Edit/Lock toggle.

### Phase 7: Polish + Cleanup + Docs

- **Edit Widget modal** (`components/EditWidgetModal.tsx`): Pencil button on each widget in edit mode. Edit label for asset widgets; label, timezone, and analog/digital mode for time widgets. Uses `PATCH /widgets/{id}`.
- **Dead code removal**: Deleted `AssetCard.tsx` and `AddAssetModal.tsx` (replaced by widget system). Removed ~200 lines of dead CSS (`.asset-grid`, `.asset-card`, `.add-asset-card`, `.asset-menu`, `.news-grid`, etc.).
- **Version bump**: `1.1.0` → `2.0.0` in `package.json` and `pyproject.toml`. UI header already showed `v2.0.0`.
- **Docs updated**: `API.md` rewritten to document all v2 endpoints (widgets CRUD, timezones, sparkline shape, day_high/day_low/volume). `CLAUDE.md` updated for v2 state. `README.md` updated to reflect v2 features and stack.

### Bug Fixes & Polish

- **Fast-polling for new assets**: After adding an asset widget, prices poll every 3s until the new asset's price appears in the cache, then reverts to the normal 60s interval. Fixes "LOADING..." stuck state after adding a new asset (the backend fetches prices in the background via `asyncio.ensure_future`, so the first `/prices` response after widget creation often doesn't include the new asset yet).
- **Viewport-fit layout**: Page no longer scrolls at the body level. Top strip is pinned, dashboard area fills remaining viewport height and scrolls internally. Styled scrollbar (thin 6px, dark theme colors) for the dashboard overflow.

### Current State (v2 complete)

- **Backend**: Live on `:8000`. Endpoints: `GET /assets`, `POST /assets`, `GET /assets/search`, `GET /assets/currency`, `GET /prices`, `GET /widgets`, `POST /widgets`, `PATCH /widgets/{id}`, `DELETE /widgets/{id}`, `PUT /widgets/layout`, `GET /timezones`, `GET /health`.
- **Frontend**: Live on `:5173`. Widget grid with asset + time widgets, add/edit/delete, drag-and-drop, resize, edit mode.
- **Database**: `assets`, `price_snapshots`, `widgets` tables.
- **Version**: 2.0.0.
