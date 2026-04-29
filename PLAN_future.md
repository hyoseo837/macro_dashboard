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

**Phase 3 — Backend: User-Scoped Widgets + Admin API** ✅

- `widgets.user_id` made NOT NULL (migration deletes orphaned rows first)
- All widget CRUD filtered by `current_user.id`
- Default widget seeding on registration (NY time + AAPL, MSFT, BTC-USD)
- Admin router: invite code CRUD + user list with widget counts
- `UserAdminSchema` with `widget_count` field

**Phase 4 — Frontend: Routing + Landing + Auth Pages** ✅

- Installed `react-router-dom`, routes: `/` (landing), `/login`, `/register`, `/dashboard`
- Landing page with hero, feature grid, footer
- Login + Register pages with form validation and error handling
- `AuthContext` with token-in-memory, cookie-based refresh, axios interceptor (auto-refresh on 401)
- `ProtectedRoute` + `AdminRoute` guards
- Dashboard extracted from `App.tsx` → `DashboardPage.tsx` with logout button
- `apiClient` now sends `withCredentials: true` for refresh cookies

**Phase 5 — Frontend: Password Reset + Admin Panel** ✅

- `ForgotPasswordPage`: email form → success message. Calls `POST /auth/forgot-password`
- `ResetPasswordPage`: reads `?token=` from URL, new password + confirm form. Calls `POST /auth/reset-password`
- `AdminPage`: two sections — invite code CRUD (create with random code generator, delete) + read-only user list (email, role badge, widget count, join date). Uses `api/admin.ts` module
- Admin button in dashboard header (visible only to admins, navigates to `/admin`)
- Routes added: `/forgot-password`, `/reset-password`, `/admin` (wrapped in `AdminRoute` guard)
- `AuthContext` now clears React Query cache on login/register/logout to prevent cross-user data leakage
- Backend: default assets (AAPL, MSFT, BTC-USD) now ensured on startup via `ensure_default_assets()`, not just on registration
- Backend: protected asset IDs — default assets are not deleted during orphan cleanup
- Default widget layout updated: AAPL (0,0 1x1), MSFT (1,0 1x1), New York time (2,0 2x2), BTC-USD (4,0 1x1)

**Phase 6 — Polish + Docs** ✅

- Version bump to 3.0.0 (`package.json`, `pyproject.toml`)
- Fixed `overflow: hidden` on `#root` — was preventing scroll on landing, auth, and admin pages. Dashboard now uses `.dashboard-layout` wrapper for its own overflow containment
- Fixed TypeScript build errors: `react-grid-layout` v2 API changes (`isDraggable`/`isResizable` → `static` per-item, `compactType={null}` → `compactor={noCompactor}`), `useRef` initial value requirements
- Auth interceptor: expired refresh token now redirects to `/login` and clears query cache
- Landing page responsive: added 2-col feature grid breakpoint at 900px
- 404 catch-all route (`NotFoundPage`) for unknown paths
- End-to-end API testing of auth flow (register, login, refresh, logout, forgot/reset password, error cases)
- Docs updated in Phase 5 (README, API.md, CLAUDE.md, GEMINI.md, HISTORY.md, PLAN_future.md)

**Dependency graph:**

```
Phase 1 → Phase 2 ──────────────────┐
    │                                ├→ Phase 5 → Phase 6
    └→ Phase 3 → Phase 4 ───────────┘
         (2 & 3 parallel after 1)
```

---

## v4 — News Widgets

Two-phase approach: Phase A (headlines) ships first with RSS-only feeds. Phase B (AI) adds Gemini-powered cross-source aggregation, topic mixing, and deduplication.

### Design Decisions

1. **Two phases**: Headlines-only (RSS) first, AI features second. Each phase is independently useful.
2. **Phase A — single-feed widgets**: Each news widget maps to exactly one RSS feed (e.g., "BBC Tech", "CNN World"). No cross-source mixing. Simple 1:1 like asset widgets.
3. **Phase B — AI-powered aggregation**: Gemini Flash unlocks cross-source topic feeds ("All Tech News"), overall feeds with dedup, and custom source+topic combos. Deferred until Phase A is stable.
4. **Feed catalog**: Predefined in code — a Python dict mapping feed keys to source name, topic, country, and RSS URL. Not user-editable. We curate the list.
5. **On-demand activation**: Like assets — feeds are only fetched when a widget references them. `news_feeds` table tracks active feeds. Orphan cleanup removes feeds and their articles when no widget references them.
6. **Hourly refresh**: Scheduler fetches active feeds every hour. Articles older than 7 days are cleaned up.
7. **Minimum widget size**: 2×1. All sizes show title + source + relative timestamp. Larger widgets show more headlines.
8. **Article count by size**: Scales automatically — 2×1 shows ~3-4 headlines, 2×2 shows ~8-10, 2×3+ shows more.
9. **Click to read**: Headlines link to the original article, opens in new tab.
10. **Label**: Auto-generated from feed name (e.g., "BBC Technology"), user-editable.
11. **Widget type**: `"news"` added to the existing `asset`/`time` enum.
12. **No custom RSS URLs**: Users pick from the curated catalog only. Custom URLs may be added later.

### Feed Catalog (Phase A)

Predefined feeds available at launch. More can be added to the catalog over time.

**International:**

| Key | Source | Topic | URL |
|-----|--------|-------|-----|
| `bbc_world` | BBC | Global | `feeds.bbci.co.uk/news/world/rss.xml` |
| `bbc_tech` | BBC | Technology | `feeds.bbci.co.uk/news/technology/rss.xml` |
| `bbc_business` | BBC | Business | `feeds.bbci.co.uk/news/business/rss.xml` |
| `bbc_science` | BBC | Science | `feeds.bbci.co.uk/news/science_and_environment/rss.xml` |
| `bbc_sports` | BBC | Sports | `feeds.bbci.co.uk/news/sport/rss.xml` |
| `bbc_entertainment` | BBC | Entertainment | `feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml` |
| `cnn_world` | CNN | Global | `rss.cnn.com/rss/edition_world.rss` |
| `cnn_tech` | CNN | Technology | `rss.cnn.com/rss/edition_technology.rss` |
| `cnn_business` | CNN | Business | `rss.cnn.com/rss/money_news_international.rss` |
| `cnn_entertainment` | CNN | Entertainment | `rss.cnn.com/rss/edition_entertainment.rss` |
| `reuters_world` | Reuters | Global | `feeds.reuters.com/reuters/worldNews` |
| `reuters_tech` | Reuters | Technology | `feeds.reuters.com/reuters/technologyNews` |
| `reuters_business` | Reuters | Business | `feeds.reuters.com/reuters/businessNews` |
| `nyt_world` | NYT | Global | `rss.nytimes.com/services/xml/rss/nyt/World.xml` |
| `nyt_tech` | NYT | Technology | `rss.nytimes.com/services/xml/rss/nyt/Technology.xml` |
| `nyt_business` | NYT | Business | `rss.nytimes.com/services/xml/rss/nyt/Business.xml` |
| `nyt_science` | NYT | Science | `rss.nytimes.com/services/xml/rss/nyt/Science.xml` |
| `hn` | Hacker News | Technology | `news.ycombinator.com/rss` |

**Country-specific:**

| Key | Source | Topic | Country | URL |
|-----|--------|-------|---------|-----|
| `cnn_us` | CNN | Global | US | `rss.cnn.com/rss/edition_us.rss` |
| `nyt_us` | NYT | Global | US | `rss.nytimes.com/services/xml/rss/nyt/US.xml` |
| `korea_herald` | Korea Herald | Global | Korea | `koreaherald.com/common/rss_xml.php` |
| `cbc_world` | CBC | Global | Canada | `cbc.ca/cmlink/rss-topstories` |

> Note: RSS URLs may need updating at implementation time — some feeds change URLs. Verify each before hardcoding.

### Database

**New tables:**

- `news_feeds`: `id`, `feed_key` (unique, from catalog), `source_name`, `topic`, `country` (nullable), `feed_url`, `last_fetched_at` (nullable), `created_at`
- `news_articles`: `id`, `feed_id` (FK → news_feeds), `title`, `url` (unique), `source_name`, `published_at`, `fetched_at`

**Modified:**

- `widgets.type` enum: add `"news"`

**Unchanged:**

- `assets`, `price_snapshots`, `users`, `invite_codes`, `refresh_tokens`, `password_reset_tokens`

### News Widget Config

```json
{
  "feed_id": "bbc_tech",
  "label": "BBC Technology"
}
```

- `feed_id` references a key from the feed catalog
- `label` auto-generated from source + topic, user-editable

### Backend

**Dependencies to add:**

- `feedparser` — RSS parsing
- `httpx` — already installed, used for fetching RSS feeds

**New service (`app/services/news.py`):**

- `FEED_CATALOG` — hardcoded dict of all available feeds
- `fetch_feed(feed_key)` — fetches RSS feed, parses with feedparser, upserts articles into `news_articles`
- `refresh_all_feeds()` — fetches all active feeds (those in `news_feeds` table)
- `cleanup_old_articles()` — deletes articles older than 7 days
- `activate_feed(feed_key)` — ensures feed exists in `news_feeds` (like creating an asset)
- `deactivate_orphan_feeds()` — removes feeds not referenced by any widget (like orphan asset cleanup)

**New endpoints (`/news`):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/news/catalog` | public | list all available feeds from catalog (key, source, topic, country) |
| GET | `/news/articles?feed_id=bbc_tech&limit=10` | public | filtered articles from cache, ordered by published_at desc |

**Scheduler additions:**

- `refresh_all_feeds()` — runs every 60 minutes (offset from price refresh)
- `cleanup_old_articles()` — runs daily

**Widget creation hook:**

- When a `type: "news"` widget is created: validate `feed_id` exists in catalog, call `activate_feed(feed_id)`, trigger an immediate fetch for that feed if it has no articles yet
- When a news widget is deleted: run `deactivate_orphan_feeds()` (same pattern as orphan asset cleanup)

### Frontend

**NewsWidget component (`components/NewsWidget.tsx`):**

Each headline row: title (clickable, opens in new tab) + source name + relative timestamp (e.g., "2h ago").

Responsive article count by widget size:
- **2×1**: 3-4 headlines, compact list
- **2×2**: 8-10 headlines
- **2×3**: 12-15 headlines
- **3×2**: 10-12 headlines with slightly wider layout
- **Larger**: scales proportionally

**Add Widget Modal — news config:**

- Step 1: type picker (Asset / Time / News)
- Step 2 (news): searchable list of available feeds from `GET /news/catalog`, grouped by source. Shows "BBC World", "BBC Technology", "CNN Global", etc. User picks one. Label auto-fills.

**Edit Widget Modal — news:**

- Edit label only (feed_id is immutable — delete and recreate to change feed)

### Implementation Phases

**Phase 1 — Backend: Models + Feed Catalog + RSS Service** ✅

- `NewsFeed`, `NewsArticle` models, Alembic migration `0899255d7d07` (add `"news"` to widget type enum)
- `FEED_CATALOG` dict with 22 predefined feeds in `app/services/news.py`
- `feedparser` + `httpx` RSS fetching service
- Feed activation/deactivation + orphan cleanup
- Article dedup on upsert (by URL via `ON CONFLICT DO UPDATE`)
- Article cleanup (>7 days)
- Bug fix: background fetch task moved after `db.commit()` to avoid race condition

**Phase 2 — Backend: API + Scheduler Integration** ✅

- `GET /news/catalog` endpoint — returns all 22 feeds from catalog
- `GET /news/articles?feed_id=X&limit=N` endpoint — filtered articles, ordered by published_at desc
- News widget validation in widget creation (validate feed_id against catalog)
- Scheduler: hourly `refresh_all_feeds()`, daily `cleanup_old_articles()` at 3 AM, both also run on startup
- Immediate background fetch on first widget creation for a feed

**Phase 3 — Frontend: News Widget Component** ✅

- `NewsWidget` with responsive headline count (4 at 2×1, 10 at 2×2, 15 at 2×3+)
- Headline rows: title (link, opens new tab) + source badge + relative timestamp ("2h", "3d")
- `useNews` hook with `useNewsCatalog` (stale: infinity) and `useNewsArticles` (stale: 5 min)
- `WidgetDispatcher` routing to `NewsWidget` for type `"news"`
- CSS: `.news-widget-*` styles with scrollable list, hover states, thin scrollbar

**Phase 4 — Frontend: Add/Edit News Widget** ✅

- News option in type picker (Newspaper icon from lucide-react)
- Feed picker: searchable list from `/news/catalog` with feed key display. Label auto-fills from source + topic
- Default widget size 2×1, placed at first free position
- Edit modal: label editing (feed_id immutable)
- Caddyfile: added `/news/*` to reverse proxy routes

**Phase 5 — Polish + Docs**

- Loading and empty states for news widgets ✅ (done in Phase 3)
- Error handling (feed fetch failures) ✅ (done in Phase 1 — logged, doesn't break batch)
- Version bump to 4.0.0
- Update API.md, CLAUDE.md, README.md, HISTORY.md

**Dependency graph:**

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
                     (3 & 4 can partially overlap)
```

---

## v4B — AI-Powered News (Gemini)

Builds on v4 Phase A. Adds Gemini Flash for cross-source aggregation and intelligent features.

### Features

- **Cross-source topic feeds**: "All Tech News" — aggregates tech articles from BBC, CNN, NYT, HN, deduplicates with AI
- **Overall feed**: All sources, all topics — Gemini clusters articles about the same event, picks the best headline or generates a combined summary
- **AI summaries**: 2-3 sentence summary per article (or per event cluster)
- **Widget config expansion**: `source` becomes optional (null = all sources), `topic` filter without source

### Design

- **Gemini Flash** via Google AI Studio (free tier: 15 RPM, 1M tokens/day)
- Summarization runs on ingest (not on request) — stored in `news_articles.summary`
- Event clustering: group articles by similarity, Gemini confirms/merges clusters
- New widget config: `{ "source": "bbc"|null, "topic": "technology"|null, "label": "..." }`

### Dependencies

- `google-generativeai` SDK
- `GEMINI_API_KEY` env var

> Scope and phases to be defined after v4A is stable.

---

## Deployment — DigitalOcean + Docker Compose ✅

Deployed to a DigitalOcean droplet running everything in Docker Compose. Full control, ~$6/month.

**Infrastructure:**

- **VPS**: DigitalOcean $6/month droplet (1 vCPU, 1 GB RAM, 25 GB SSD)
- **Domain**: `macro.hyoseo.dev` — Cloudflare DNS A record (DNS-only, grey cloud) → droplet IP `165.245.235.8`
- **HTTPS**: Caddy auto-provisions via Let's Encrypt (requires DNS-only mode in Cloudflare, not proxied)

**Docker Compose setup** (`docker-compose.prod.yml`):

- `db` — Postgres 16 Alpine, data persisted in Docker volume, healthcheck for startup ordering
- `backend` — Python 3.12 slim, Poetry install (`--only main --no-root`), runs `alembic upgrade head` then uvicorn
- `caddy` — Multi-stage: Node 22 builds Vite app (with `VITE_API_BASE=""`), Caddy 2 serves static files + reverse proxies API routes to backend

**Production config** (`.env.production` on droplet, not in git):

- `DOMAIN` — `macro.hyoseo.dev`
- `POSTGRES_PASSWORD` — database password
- `SECRET_KEY` — JWT signing secret
- `SMTP_*` — optional, for password reset emails

**Caddyfile routing** (`frontend/Caddyfile`):

- API routes (`/auth/*`, `/admin/*`, `/prices/*`, `/widgets/*`, `/timezones/*`, `/health`) → reverse proxy to backend
- Asset API routes (`/assets`, `/assets/search`, `/assets/currency`) → reverse proxy to backend (exact paths to avoid catching Vite's `/assets/index-*.js` static files)
- Everything else → static files with SPA fallback (`try_files {path} /index.html`)

**Deploy workflow**: develop locally → commit & push → SSH → `macro-deploy` (alias for `git pull` + `docker compose up -d --build`)

**Droplet aliases** (in `/root/.bashrc`):

- `macro-deploy` — pull + rebuild all containers
- `macro-logs` — tail backend logs
- `macro-backup` — pg_dump to `~/backups/`
- `macro-status` — show container status
- `macro-restart` — restart without rebuilding

**Backup:**

- Manual: `macro-backup` alias runs `pg_dump` to `~/backups/`
- Future: cron job for automated backups to object storage

**CI/CD (future, optional):**

- GitHub Actions: build frontend, build Docker image, SSH deploy or push to container registry

---

## Additional future features

- mobile friendly ui, PWA
- chrome extension
- new tab
