# Future Roadmap

## v1 (complete) — Single-User Price Dashboard

- Asset cards with live prices, sparklines, change badges
- Add/delete/rename assets via Yahoo Finance autocomplete
- Backend scheduler refreshes prices every 15 min, frontend polls every 60s
- Single `assets` + `price_snapshots` tables, no user accounts

---

## v2 — Widget System & Customizable Grid

Still single-user. Replaces the homogeneous asset grid with a general-purpose widget system, laying the foundation for multi-user (v3) without a data migration later.

### Design Decisions

1. **Orphan asset cleanup**: Deleting a widget that is the last reference to an asset also deletes the asset + snapshots.
2. **Display name is widget-owned**: Widget config stores `label`. Asset table stores only the canonical Yahoo Finance name.
3. **Add Widget button**: Only visible in edit mode. Placement may change after prototyping.
4. **Default widget size**: 1x1 (compact).
5. **Grid compaction**: Disabled — free placement with empty space allowed. Consider fixed-height viewport (no scroll) later.
6. **Responsive**: `ResponsiveGridLayout` with breakpoints (6 cols desktop, fewer on smaller screens). Desktop-first.
7. **Existing v1 data**: Clean slate — no auto-migration.

### Widget System

Each card on the dashboard is a widget with a type.

**Widget types:**

- **Asset** — current price card (already exists, becomes a widget type)
- **Time** — shows current time for a chosen region/timezone

**Database:**

- New `widgets` table: `id`, `type` (enum: asset/time/...), `config` (jsonb), `layout_x`, `layout_y`, `layout_w`, `layout_h`
- `config` stores type-specific settings:
  - Asset widget: `{ "asset_id": "tsla", "label": "Tesla" }`
  - Time widget: `{ "timezone": "America/Toronto", "label": "Toronto" }`
- `assets` + `price_snapshots` tables remain as the global price cache
- No `user_assets` table — skipped entirely; widgets own the relationship

### Customizable Grid

Use `react-grid-layout`:

- Each widget has a position (`x`, `y`) and span (`w`, `h`) on the grid
- **Drag & drop** to reorder widgets
- **Resize** by combining grid cells — e.g. a 2-wide MSFT card shows a bigger sparkline
- **Edit mode** toggle to enter/exit customization (prevents accidental moves)
- Layout persisted in the `widgets` table

### Responsive Widget Rendering

Widget components adapt to their size:

- Asset card at `1x1`: current compact layout
- Asset card at `2x1`: expanded sparkline, additional stats (day range, volume)
- Asset card at `2x2`: full chart with date axis, more history
- Time card at `1x1`: clock + timezone label
- Larger sizes: add date, UTC offset, day-of-week

### Implementation Phases

**Phase 1 — Backend: Widget Model + Migration + CRUD** ✅

- `Widget` model, Pydantic schemas, Alembic migration
- CRUD router: `GET/POST /widgets`, `PATCH/DELETE /widgets/{id}`, `PUT /widgets/layout`
- Orphan asset cleanup on widget delete
- Removed `PATCH /assets/{id}` rename endpoint

**Phase 2 — Frontend: Types + API Layer + Hook** ✅

- Install `react-grid-layout`
- Add `Widget` types, `widgets.ts` API module, `useWidgets` hook

**Phase 3 — Frontend: Widget Grid + Edit Mode** ✅

- `WidgetGrid` wrapping `ResponsiveGridLayout` (6 cols, `compactType={null}`)
- Edit mode toggle in header
- `WidgetDispatcher` routing widgets to type-specific components
- Debounced `PUT /widgets/layout` on drag/resize

**Phase 4 — Asset Widget** ✅

- `AssetWidget` refactored from `AssetCard`, reads from shared price cache
- Display name from `config.label`
- Responsive: 1x1 compact, 2x1 wide, 2x2 full chart, 1x2 tall
- Fix sparkline gradient ID collisions
- Backend: added `day_high`, `day_low`, `volume` to `PriceSnapshot` for expanded stats

**Phase 5 — Time Widget** ✅

- `TimeWidget` — live clock via `Intl.DateTimeFormat` + `setInterval`
- Analog clock mode (`AnalogClock` component) with digital fallback
- Responsive: 1x1 compact, 2x1 wide, 1x2 tall, 2x2 full (date, weekday, UTC offset)
- Searchable timezone picker
- Backend validates against `zoneinfo.available_timezones()`, `GET /timezones` endpoint

**Phase 6 — Add Widget Modal** ✅

- Two-step: type picker → type-specific config
- Asset config reuses Yahoo Finance autocomplete, auto-fills label + currency
- Time config: timezone search + label input + analog/digital mode toggle
- Only accessible in edit mode

**Phase 7 — Polish + Cleanup + Docs** ✅

- Dark theme for react-grid-layout CSS
- Edit existing widgets (label, timezone, analog/digital mode) via EditWidgetModal
- Removed dead code (`AssetCard.tsx`, `AddAssetModal.tsx`) + ~200 lines dead CSS
- Version bump to 2.0.0
- Updated `API.md`, `CLAUDE.md`, `README.md`, `HISTORY.md`

**Dependency graph:**

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 ──┐
                              Phase 5 ──┤→ Phase 6 → Phase 7
                            (4 & 5 parallel)
```

---

## v3 — Multi-User

Still local. Adds user accounts, JWT authentication, invite-only registration, a simple admin panel, and a public landing page. The widget system (v2) becomes user-scoped.

### Design Decisions

1. **Auth method**: Email/password only — no OAuth. JWT (stateless) with short-lived access tokens and longer-lived refresh tokens.
2. **Password policy**: Minimum 8 characters, no complexity requirements.
3. **Invite-only registration**: Admin creates multi-use invite codes. Open registration planned for post-beta.
4. **Admin panel**: Minimal — invite code CRUD + user list. No role hierarchy beyond admin/regular.
5. **User profile**: Email, hashed password, birth date. Additional fields deferred.
6. **Existing v2 data**: Clean slate — no auto-migration of existing widgets. Users add their own.
7. **Default widgets for new users**: New York time widget + AAPL, MSFT, BTC-USD asset widgets.
8. **Password reset**: Email-based reset flow via SMTP from the start. SMTP credentials configured via env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).
9. **Landing page**: Public page introducing the service, vision, and creator. Shown to unauthenticated visitors. Login/register accessible from here.
10. **Frontend routing**: `react-router-dom` added. Three route groups: public (landing, login, register, password reset), protected (dashboard), admin.
11. **Assets remain global**: `assets` + `price_snapshots` are the shared catalog. User-scoping is at the widget level only.
12. **Token storage**: Access token in memory, refresh token in `httpOnly` cookie. Axios interceptor handles silent refresh on 401.
13. **Admin seeding**: First admin created via CLI command (`poetry run python -m app.cli create-admin`). No env-var magic or auto-promotion.
14. **Deployment**: Local only. HTTPS and domain deferred to post-v3.

### Auth System

**JWT Tokens:**

- Access token: 30 min expiry, stateless, payload contains `user_id` and `is_admin`
- Refresh token: 7 days expiry, stored in DB for revocation on logout
- `POST /auth/login` returns access token in body + sets refresh token as `httpOnly` cookie
- `POST /auth/refresh` validates cookie, rotates refresh token, returns new access token

**Password Hashing:**

- `passlib` with bcrypt

**Password Reset:**

- `POST /auth/forgot-password` — generates a time-limited token (1 hour), sends reset link via SMTP
- `POST /auth/reset-password` — validates token, updates password, invalidates token

### Database

**New tables:**

- `users`: `id`, `email` (unique), `hashed_password`, `birth_date` (nullable), `is_admin` (bool, default false), `created_at`, `updated_at`
- `invite_codes`: `id`, `code` (unique), `created_by` (FK → users), `max_uses` (nullable — unlimited if null), `use_count` (default 0), `expires_at` (nullable), `created_at`
- `refresh_tokens`: `id`, `user_id` (FK → users), `token_hash` (unique), `expires_at`, `revoked` (bool, default false), `created_at`
- `password_reset_tokens`: `id`, `user_id` (FK → users), `token_hash` (unique), `expires_at`, `used` (bool, default false), `created_at`

**Modified tables:**

- `widgets`: adds `user_id` (FK → users, NOT NULL)

**Unchanged:**

- `assets`, `price_snapshots` — remain global shared catalog

### Backend

**Dependencies to add:**

- `python-jose[cryptography]` — JWT encoding/decoding
- `passlib[bcrypt]` — password hashing
- `python-multipart` — form data parsing
- `aiosmtplib` — async SMTP for password reset emails

**Auth endpoints (`/auth`):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | email, password, birth_date, invite_code → creates user + default widgets, returns tokens |
| POST | `/auth/login` | public | email, password → access token + refresh cookie |
| POST | `/auth/refresh` | cookie | refresh cookie → new access token + rotated refresh cookie |
| POST | `/auth/logout` | bearer | revokes refresh token |
| POST | `/auth/forgot-password` | public | email → sends reset link via SMTP |
| POST | `/auth/reset-password` | public | token + new_password → updates password |
| GET | `/auth/me` | bearer | returns current user profile |

**Admin endpoints (`/admin`):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/invite-codes` | admin | list all invite codes |
| POST | `/admin/invite-codes` | admin | create code (code, max_uses?, expires_at?) |
| DELETE | `/admin/invite-codes/{id}` | admin | delete a code |
| GET | `/admin/users` | admin | list all users (email, birth_date, is_admin, created_at, widget count) |

**Existing endpoints — changes:**

- All widget CRUD (`/widgets/*`) filtered by `current_user.id` via auth dependency
- `/assets`, `/prices`, `/search`, `/timezones` — remain public (read-only shared catalog)
- Scheduler continues refreshing all assets in the global `assets` table (unchanged)

**Auth dependencies:**

- `get_current_user` — extracts + validates JWT from `Authorization: Bearer <token>`, returns `User`
- `require_admin` — calls `get_current_user`, raises 403 if not `is_admin`

**CLI:**

- `poetry run python -m app.cli create-admin --email <email> --password <password>` — creates the first admin user (no invite code required)

### Frontend

**New dependency:**

- `react-router-dom` — client-side routing

**Pages:**

| Route | Auth | Description |
|-------|------|-------------|
| `/` | public | Landing page — service intro, vision, creator. CTA buttons for login/register |
| `/login` | public | Email + password form |
| `/register` | public | Email, password, birth date, invite code form |
| `/forgot-password` | public | Email form → "check your email" message |
| `/reset-password?token=...` | public | New password form |
| `/dashboard` | protected | Existing widget grid (unchanged from v2) |
| `/admin` | admin | Invite code management + user list |

**Auth state management:**

- `AuthContext` provider wrapping the app
- Access token stored in memory (React state), never in localStorage
- Refresh token managed as `httpOnly` cookie (browser handles it automatically)
- Axios interceptor: attaches `Authorization: Bearer <token>` to requests, calls `/auth/refresh` on 401, retries original request
- `ProtectedRoute` wrapper — redirects to `/login` if unauthenticated
- `AdminRoute` wrapper — redirects to `/dashboard` if not admin

### Default Experience

On registration, the backend seeds 4 widgets for the new user:

| Widget | Type | Config | Position |
|--------|------|--------|----------|
| New York | time | `{"timezone": "America/New_York", "label": "New York"}` | (0,0) 1×1 |
| Apple | asset | `{"asset_id": "AAPL", "label": "Apple"}` | (1,0) 1×1 |
| Microsoft | asset | `{"asset_id": "MSFT", "label": "Microsoft"}` | (2,0) 1×1 |
| Bitcoin | asset | `{"asset_id": "BTC-USD", "label": "Bitcoin"}` | (3,0) 1×1 |

Assets (`AAPL`, `MSFT`, `BTC-USD`) are created in the global `assets` table if they don't already exist. The scheduler picks them up on its next refresh cycle.

### Admin Panel

Minimal and simple. Two sections:

**Invite Codes:**

- Table: code, uses (count / max or ∞), expires_at, created_at
- "Create Code" button → form: code string, optional max uses, optional expiry
- Delete button per row

**Users:**

- Table: email, birth_date, is_admin, created_at, widget count
- Read-only for now (no edit/delete users from UI)

### Implementation Phases

**Phase 1 — Backend: User Model + JWT Auth** ✅

- `User`, `InviteCode`, `RefreshToken` models, Alembic migration
- Password hashing via `bcrypt` directly (passlib incompatible with bcrypt 5.x)
- JWT utilities (create/verify access + refresh tokens)
- Auth endpoints: register (with invite code validation), login, refresh, logout, `GET /auth/me`
- `get_current_user` + `require_admin` dependencies
- CLI command: `create-admin`
- `Widget.user_id` FK added (nullable — Phase 3 makes NOT NULL)

**Phase 2 — Backend: Password Reset** ✅

- `PasswordResetToken` model, migration
- SMTP email service via `aiosmtplib` (falls back to console logging when `SMTP_HOST` not set)
- `POST /auth/forgot-password` + `POST /auth/reset-password`
- Config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `FRONTEND_URL`, `RESET_TOKEN_EXPIRE_MINUTES`

**Phase 3 — Backend: User-Scoped Widgets + Admin API**

- Add `user_id` column to `widgets` table (migration, drops existing rows)
- All widget CRUD filtered by `current_user.id`
- Default widget seeding logic on registration
- Admin endpoints: invite code CRUD, user list with widget counts

**Phase 4 — Frontend: Routing + Landing + Auth Pages**

- Install `react-router-dom`, set up route structure
- Landing page (public — service intro, vision, creator)
- Login + Register pages with form validation
- `AuthContext` provider, token management, axios interceptor
- `ProtectedRoute` + `AdminRoute` guards
- Redirect unauthenticated users from `/dashboard` to `/login`

**Phase 5 — Frontend: Password Reset + Admin Panel**

- Forgot password page + reset password page
- Admin panel: invite code management + user list
- Admin nav link (visible only to admins)

**Phase 6 — Polish + Docs**

- End-to-end testing of full registration → login → dashboard flow
- Landing page styling and content
- Error handling polish (expired tokens, invalid invite codes, rate limiting feedback)
- Update `API.md`, `CLAUDE.md`, `README.md`, `HISTORY.md`
- Version bump to 3.0.0

**Dependency graph:**

```
Phase 1 → Phase 2 ──────────────────┐
    │                                ├→ Phase 5 → Phase 6
    └→ Phase 3 → Phase 4 ───────────┘
         (2 & 3 parallel after 1)
```

---

## v4 — News Widgets & Multi-Source Media

### News Widget Type

New widget type added to the v2 widget system.

**Sources (multi-source for non-biased coverage):**

- BBC, CNN, NYT, Hacker News, and more
- Users choose which media sources appear in each news widget
- RSS ingestion + AI summarization (Anthropic Claude API)

**Database:**

- News widget config: `{ "sources": ["bbc", "nyt", "hn"], "topic": "markets", "count": 5 }`
- New `news_articles` table for cached/ingested articles
- Background scheduler for RSS fetching (similar to price refresh)

**Widget sizes:**

- `1x1`: single headline
- `1x2` or `2x1`: headline + summary
- `2x2`: multiple headlines with summaries, source labels

### Dependencies

- `feedparser` for RSS ingestion
- `anthropic` SDK for AI summarization
- Multi-user (v3) should land first so news preferences are per-user

---

## Additional future features

- mobile frendily ui, PWA
- chrome extension
- new tab
