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

---

## 2026-04-27: v3 Phase 1 — User Model + JWT Auth

### Planning
- Full v3 plan written in `PLAN_future.md`: 14 design decisions, 6 phases, covering auth, invite system, admin panel, landing page, user-scoped widgets.
- Key decisions: email/password only (no OAuth), JWT stateless auth, invite-only registration (admin creates codes), admin seeded via CLI, real SMTP for password reset, clean slate (no v2 widget migration).

### Phase 1: Backend Auth Foundation

- **Models**: Added `User` (email, hashed_password, birth_date, is_admin, timestamps), `InviteCode` (code, created_by, max_uses, use_count, expires_at), `RefreshToken` (user_id, token_hash, expires_at, revoked) to `models.py`. Added nullable `user_id` FK + `owner` relationship on `Widget` (will become NOT NULL in Phase 3).
- **Auth utilities** (`app/auth.py`): `bcrypt` for password hashing (passlib dropped — incompatible with bcrypt 5.x), `python-jose` for JWT, SHA-256 for refresh token hashing. `get_current_user` and `require_admin` FastAPI dependencies.
- **Auth router** (`app/routers/auth.py`): 6 endpoints:
  - `POST /auth/register` — validates invite code (expiry, use count), creates user, returns access token + sets refresh cookie
  - `POST /auth/login` — validates credentials, returns access token + refresh cookie
  - `POST /auth/refresh` — rotates refresh token (old revoked, new issued)
  - `POST /auth/logout` — revokes refresh token, clears cookie
  - `GET /auth/me` — returns current user profile
- **Token design**: Access token (30 min, stateless, contains user_id + is_admin). Refresh token (7 days, stored in DB as SHA-256 hash, `httpOnly` cookie scoped to `/auth`).
- **CLI** (`app/cli.py`): `poetry run python -m app.cli create-admin --email <email> --password <password>` for seeding the first admin.
- **Config**: Added `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` to settings.
- **Migration**: `033d10d1c2d0` — creates `users`, `invite_codes`, `refresh_tokens` tables + adds `widgets.user_id` column.
- **Dependencies added**: `python-jose[cryptography]`, `bcrypt`, `python-multipart`, `email-validator`.
- **Tested**: Full auth flow (register, login, refresh rotation, logout + token revocation, /auth/me) and error cases (duplicate email, bad invite code, short password, wrong password). Existing v2 endpoints unaffected.

### Phase 2: Password Reset

- **Model**: Added `PasswordResetToken` (user_id, token_hash, expires_at, used) to `models.py`. Migration `c5336e6a41d5`.
- **Email service** (`app/services/email.py`): Async SMTP via `aiosmtplib`. Falls back to console logging when `SMTP_HOST` is not set. Sends reset link pointing to `{FRONTEND_URL}/reset-password?token=...`.
- **Endpoints** added to auth router:
  - `POST /auth/forgot-password` — generates token (1 hour expiry), sends email. Always returns 200 (no email enumeration).
  - `POST /auth/reset-password` — validates token, updates password, marks token used. Single-use tokens.
- **Config**: Added `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `FRONTEND_URL`, `RESET_TOKEN_EXPIRE_MINUTES`.
- **Dependencies added**: `aiosmtplib`.
- **Bug fix**: Captured `user.email` before `db.commit()` to avoid SQLAlchemy expired-state error.
- **Tested**: Full reset flow (forgot → reset → login with new password), token reuse rejection, short password validation, non-existent email (safe 200).

### Phase 3: User-Scoped Widgets + Admin API

- **Migration**: `02aa7e61713a` — deletes existing widgets (clean slate), makes `widgets.user_id` NOT NULL.
- **Widget CRUD user-scoped**: All widget endpoints (`GET/POST/PATCH/DELETE /widgets`, `PUT /widgets/layout`) now require auth and filter by `current_user.id`. Unauthenticated requests get 403.
- **Default widget seeding** (`app/services/default_widgets.py`): On registration, 4 widgets are created — New York time + AAPL, MSFT, BTC-USD asset widgets at positions (0,0)–(3,0). Assets are created in the global catalog if they don't exist.
- **Admin router** (`app/routers/admin.py`): 4 endpoints, all require `is_admin`:
  - `GET /admin/invite-codes` — list all codes
  - `POST /admin/invite-codes` — create code (409 if duplicate)
  - `DELETE /admin/invite-codes/{id}` — delete code
  - `GET /admin/users` — list users with widget counts (outer join)
- **Schemas**: Added `UserAdminSchema` with `widget_count` field.
- **Tested**: User isolation (admin sees 0 widgets, user sees 4), admin access controls (403 for non-admin), invite code CRUD + deletion, unauthenticated widget access blocked.

### Phase 4: Frontend — Routing + Landing + Auth Pages

- **Installed** `react-router-dom`. Routes: `/` (landing), `/login`, `/register`, `/dashboard` (protected).
- **AuthContext** (`contexts/AuthContext.tsx`): Manages access token in memory (never localStorage). On mount, attempts silent refresh via httpOnly cookie. Provides `login`, `register`, `logout` functions. Axios interceptor attaches `Authorization: Bearer` header and auto-refreshes on 401.
- **Route guards** (`components/ProtectedRoute.tsx`): `ProtectedRoute` redirects to `/login` if unauthenticated. `AdminRoute` additionally redirects non-admins to `/dashboard`.
- **Landing page** (`pages/LandingPage.tsx`): Hero section with tagline, 4-feature grid (live prices, world clocks, custom grid, privacy), footer with creator credit. Redirects to `/dashboard` if already logged in.
- **Login page** (`pages/LoginPage.tsx`): Email + password form with error display. Links to forgot-password and register.
- **Register page** (`pages/RegisterPage.tsx`): Email, password (min 8), optional birth date, invite code. Pydantic validation errors displayed.
- **Dashboard** (`pages/DashboardPage.tsx`): Extracted from `App.tsx`. Added logout button and user email in header. Version bumped to v3.0.0 in UI.
- **API layer**: `api/auth.ts` with login, register, refresh, logout, getMe. `User` and `TokenResponse` types added. `apiClient` now uses `withCredentials: true`.
- **CSS**: Landing page (nav, hero, features grid, footer), auth pages (card layout, form inputs, error states, buttons). Responsive for mobile.

### Phase 5: Frontend — Password Reset + Admin Panel

- **ForgotPasswordPage** (`pages/ForgotPasswordPage.tsx`): Email input form. On submit, calls `POST /auth/forgot-password`. Shows confirmation message regardless of whether the email exists. Links back to login.
- **ResetPasswordPage** (`pages/ResetPasswordPage.tsx`): Reads `?token=` from URL search params. New password + confirmation form with min 8 char and match validation. Calls `POST /auth/reset-password`. Handles missing/invalid/expired tokens gracefully.
- **AdminPage** (`pages/AdminPage.tsx`): Two sections — Invite Codes (create with random code generator, optional max uses, delete) and Users (read-only table: email, admin badge, widget count, join date). Uses `api/admin.ts` module with React Query for data fetching and mutations.
- **Admin API module** (`api/admin.ts`): `getInviteCodes`, `createInviteCode`, `deleteInviteCode`, `getUsers` — typed with `InviteCode`, `AdminUser`, `CreateInvitePayload` interfaces.
- **Routes added**: `/forgot-password`, `/reset-password`, `/admin` (wrapped in `AdminRoute`).
- **Dashboard**: Admin button (Shield icon) visible only to `is_admin` users, navigates to `/admin`.
- **AuthContext fix**: `queryClient.clear()` on login, register, and logout to prevent cross-user data leakage (e.g., seeing a previous user's widgets after switching accounts).
- **Backend — default asset protection**:
  - `ensure_default_assets()` extracted from `seed_default_widgets()` — now also called on startup in `main.py` so default assets exist and get price data even before any user registers.
  - `PROTECTED_ASSET_IDS` set: default assets (AAPL, MSFT, BTC-USD) are excluded from orphan cleanup on widget delete.
- **Default widget layout changed**: AAPL (0,0 1x1), MSFT (1,0 1x1), New York time (2,0 2x2), BTC-USD (4,0 1x1) — time widget now 2x2 and positioned third.
- **CSS**: Admin page styles (header, tables, form rows, badges, buttons, responsive), auth extras (hint text, success messages).

### Phase 6: Polish + Docs

- **Version bump**: `2.0.0` → `3.0.0` in `package.json` and `pyproject.toml`. UI header already showed v3.0.0 since Phase 4.
- **Scroll fix**: Removed `overflow: hidden` from `html, body, #root` — was preventing scroll on landing, auth, and admin pages on small screens. Dashboard now wrapped in `.dashboard-layout` with its own `overflow: hidden` to preserve the contained scrolling behavior.
- **TypeScript build fix**: `react-grid-layout` v2 dropped grid-level `isDraggable`/`isResizable` props. Switched to `static` per-item (already in place) and removed the deprecated props. Replaced `compactType={null}` with `compactor={noCompactor}`. Fixed `useRef` calls missing required initial values.
- **Auth session expiry redirect**: When the 401 interceptor's refresh call fails (e.g., expired refresh token), the user is now redirected to `/login` with query cache cleared, instead of silently staying on the protected page.
- **Landing page responsive**: Added 900px breakpoint for 2-column feature grid (was jumping from 4-col to 1-col at 600px).
- **404 catch-all**: Added `NotFoundPage` + `<Route path="*">` — unknown routes show a styled 404 page with links to home and dashboard.
- **End-to-end API testing**: Verified full auth flow via curl — register (short password, bad invite code, duplicate email), login (bad credentials), refresh, logout, forgot-password (non-existent email returns 200), reset-password (invalid token). All error cases return correct status codes and messages.

### Current State (v3 complete)

- **Version**: 3.0.0
- **Backend**: Live on `:8000`. Auth (register, login, refresh, logout, me, forgot-password, reset-password), admin (invite-codes CRUD, user list), widget CRUD (user-scoped), assets, prices, timezones.
- **Frontend**: Live on `:5173`. Routes: `/` (landing), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard` (protected), `/admin` (admin-only), `*` (404). Full auth flow with silent token refresh and session expiry redirect.
- **Database**: 7 tables — `users`, `invite_codes`, `refresh_tokens`, `password_reset_tokens`, `assets`, `price_snapshots`, `widgets`.

---

## 2026-04-28: Production Deployment

### Infrastructure Setup

- **VPS**: DigitalOcean $6/month droplet (1 vCPU, 1 GB RAM, 25 GB SSD), IP `165.245.235.8`.
- **Domain**: `macro.hyoseo.dev` — Cloudflare DNS A record pointing to droplet IP. DNS-only mode (grey cloud) so Caddy can provision its own HTTPS certificate via Let's Encrypt.
- **SSH**: Key-based authentication to droplet.

### Docker Production Config

- **`docker-compose.prod.yml`**: Three services — Postgres 16 (with healthcheck), FastAPI backend, Caddy (frontend + reverse proxy). All config via `.env.production` (not in git).
- **`backend/Dockerfile`**: Python 3.12 slim, Poetry install (`--only main --no-root`), runs `alembic upgrade head` then uvicorn on port 8000.
- **`frontend/Dockerfile`**: Multi-stage — Node 22 builds Vite app (with `VITE_API_BASE=""`), Caddy 2 Alpine serves the static output.
- **`frontend/Caddyfile`**: Reverse proxies API routes to backend, serves static files with SPA fallback. Exact path matchers for `/assets`, `/assets/search`, `/assets/currency` to avoid catching Vite's `/assets/index-*.js` static files.

### Bug Fixes During Deployment

- **Poetry `--no-dev` removed in v2**: Changed to `--only main --no-root` in backend Dockerfile.
- **White screen**: Caddyfile `handle /assets*` matched both API `/assets` endpoint and Vite's built static files at `/assets/index-*.js`. Fixed with exact path matchers.
- **Login failed**: `VITE_API_BASE` was empty string in production build, but `||` operator treated it as falsy and fell back to `localhost:8000`. Fixed by changing to `??` (nullish coalescing) in `frontend/src/api/client.ts`.
- **CLI `reset-password`**: Added `reset-password` command to `backend/app/cli.py` for resetting passwords on the server.

### Widget Overlap Fix

- New widgets were always placed at `(0,0)`, overlapping existing widgets. Added `findFreePosition()` in `AddWidgetModal.tsx` that scans the grid for the first available cell.

### Operational Aliases

Added shell aliases on the droplet (`/root/.bashrc`):
- `macro-deploy` — `git pull` + `docker compose up -d --build`
- `macro-logs` — tail backend logs
- `macro-backup` — `pg_dump` to `~/backups/`
- `macro-status` — show container status
- `macro-restart` — restart without rebuilding

### Current State (v3 deployed)

- **Version**: 3.0.0
- **Production**: Live at **https://macro.hyoseo.dev**
- **Local dev**: Backend on `:8000`, frontend on `:5173`
- **Deploy workflow**: develop locally → commit & push → SSH → `macro-deploy`
- **Next**: v4 (news widgets).
