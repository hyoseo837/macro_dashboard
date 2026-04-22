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
