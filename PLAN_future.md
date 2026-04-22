# Future Roadmap

## v1 (complete) — Single-User Price Dashboard

- Asset cards with live prices, sparklines, change badges
- Add/delete/rename assets via Yahoo Finance autocomplete
- Backend scheduler refreshes prices every 15 min, frontend polls every 60s
- Single `assets` + `price_snapshots` tables, no user accounts

---

## v2 — Widget System & Customizable Grid

Still single-user. Replaces the homogeneous asset grid with a general-purpose widget system, laying the foundation for multi-user (v3) without a data migration later.

### Widget System

Each card on the dashboard is a widget with a type.

**Widget types:**
- **Asset** — current price card (already exists, becomes a widget type)
- **Time** — shows current time for a chosen region/timezone

**Database:**
- New `widgets` table: `id`, `type` (enum: asset/time/...), `config` (jsonb), `layout_x`, `layout_y`, `layout_w`, `layout_h`
- `config` stores type-specific settings:
  - Asset widget: `{ "asset_id": "tsla" }`
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

---

## v3 — Multi-User

### Auth

- Email/password authentication
- Invite-only for beta (invite codes or admin-generated links)
- Open registration planned for post-beta

### Database

- New `users` table (email, hashed password, invite code, etc.)
- `widgets` table gains a `user_id` column (FK to `users`)
- `assets` table stays as the **global catalog** — shared across all users
- User "delete widget" removes the widget, not the underlying asset
- Garbage collection: remove from `assets` (and stop tracking) only when no widgets reference the asset

### Backend

- Auth endpoints: register (with invite code), login, logout, session/token refresh
- All widget/asset/price endpoints become user-scoped
- Scheduler continues refreshing all assets in the global `assets` table

### Frontend

- Login/registration flow
- No structural changes to the dashboard — it already renders whatever the API returns

### Default Experience

- New users get a preset widget layout (e.g. a few popular assets + a time widget)
- Consider a tutorial/tips widget for onboarding

### Deployment

- Stays local during v3 development
- Deploy to VPS/cloud once stable and feature-complete

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

## Small fix needed

