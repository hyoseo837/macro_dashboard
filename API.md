# API Contract

HTTP contract between `frontend/` and `backend/`. This is the source of truth — if you change a shape here, update both sides.

- Base URL in dev: `http://localhost:8000`
- Base URL in prod: env var `VITE_API_BASE` on the frontend
- All responses are JSON. All timestamps are ISO 8601 UTC strings.
- All money/price values are numbers (not strings). Currency is included as a sibling field where ambiguous.

## CORS

Backend must allow the frontend origin. In dev: `http://localhost:5173`.

## Authentication

JWT-based. Access token is short-lived (30 min), refresh token is long-lived (7 days) stored as `httpOnly` cookie.

- Access token: sent as `Authorization: Bearer <token>` header
- Refresh token: `httpOnly` cookie named `refresh_token`, scoped to `/auth` path
- Public endpoints (assets, prices, search, timezones) require no auth
- Widget endpoints will become user-scoped in v3 Phase 3

### `POST /auth/register`

Creates a new user account. Requires a valid invite code.

Request:
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "birth_date": "2000-01-15",
  "invite_code": "BETA2026"
}
```

Response (201):
```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

Also sets `refresh_token` cookie. Errors: 409 (email taken), 400 (invalid/expired/exhausted invite code), 422 (password < 8 chars).

### `POST /auth/login`

```json
{ "email": "user@example.com", "password": "min8chars" }
```

Response (200):
```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

Also sets `refresh_token` cookie. Errors: 401 (bad credentials).

### `POST /auth/refresh`

No request body. Reads `refresh_token` cookie. Rotates the refresh token (old one is revoked).

Response (200):
```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

Errors: 401 (missing/invalid/expired/revoked refresh token).

### `POST /auth/logout`

Requires `Authorization: Bearer <token>`. Revokes the refresh token and clears the cookie.

Response: 204 No Content.

### `POST /auth/forgot-password`

```json
{ "email": "user@example.com" }
```

Response (200):
```json
{ "detail": "If that email exists, a reset link has been sent" }
```

Always returns 200 regardless of whether the email exists (prevents enumeration). When SMTP is configured, sends an email with a reset link pointing to `{FRONTEND_URL}/reset-password?token=...`. Token expires in 60 minutes.

### `POST /auth/reset-password`

```json
{ "token": "raw-token-from-email-link", "new_password": "min8chars" }
```

Response (200):
```json
{ "detail": "Password has been reset" }
```

Errors: 400 (invalid/expired/already-used token), 422 (password < 8 chars). Tokens are single-use.

### `GET /auth/me`

Requires `Authorization: Bearer <token>`.

```json
{
  "id": 1,
  "email": "user@example.com",
  "birth_date": "2000-01-15",
  "is_admin": true,
  "created_at": "2026-04-27T05:22:33Z"
}
```

## Endpoints

### `GET /assets`

Returns the configured asset list (display metadata only, no live prices).

```json
[
  {
    "id": "kodex_sp500",
    "display_name": "KODEX 미국S&P500",
    "symbol": "379800.KS",
    "category": "etf",
    "currency": "KRW"
  }
]
```

`category`: one of `etf`, `equity`, `crypto`, `fx`, `commodity`.

### `POST /assets`

Creates a new asset. Returns 201 on success, 409 if the asset already exists.

```json
{
  "symbol": "TSLA",
  "display_name": "Tesla, Inc.",
  "category": "equity",
  "currency": "USD"
}
```

### `GET /assets/search?q={query}`

Proxies Yahoo Finance symbol search. Returns up to 10 matches.

```json
[
  { "symbol": "TSLA", "name": "Tesla, Inc.", "category": "equity" }
]
```

### `GET /assets/currency?symbol={symbol}`

Returns the currency for a Yahoo Finance symbol (e.g. `"USD"`).

### `GET /prices`

Returns the latest cached price for every configured asset, plus a sparkline series.

```json
[
  {
    "id": "tsla",
    "symbol": "TSLA",
    "price": 412.85,
    "currency": "USD",
    "change_abs": -3.21,
    "change_pct": -0.77,
    "as_of": "2026-04-20T14:32:00Z",
    "sparkline": [{ "date": "2026-03-21", "price": 410.1 }, { "date": "2026-03-22", "price": 411.4 }],
    "day_high": 415.20,
    "day_low": 409.50,
    "volume": 52340000
  }
]
```

- `sparkline` is `{ date: string, price: number }[]` — last 30 daily closes (or fewer).
- `day_high`, `day_low`, `volume` are nullable (may be `null` if unavailable).
- `change_abs` and `change_pct` are vs. the previous close.
- Server-side cache TTL: 15 minutes. Client may poll every 60s (it'll mostly hit cache).

### `GET /widgets`

Returns all widgets, ordered by position.

```json
[
  {
    "id": 1,
    "type": "asset",
    "config": { "asset_id": "tsla", "label": "Tesla" },
    "layout_x": 0, "layout_y": 0, "layout_w": 1, "layout_h": 1
  },
  {
    "id": 2,
    "type": "time",
    "config": { "timezone": "America/Toronto", "label": "Toronto", "mode": "analog" },
    "layout_x": 1, "layout_y": 0, "layout_w": 1, "layout_h": 1
  }
]
```

`type`: `"asset"` or `"time"`.

### `POST /widgets`

Creates a widget. Returns 201.

```json
{
  "type": "asset",
  "config": { "asset_id": "tsla", "label": "Tesla" },
  "layout_x": 0, "layout_y": 0, "layout_w": 1, "layout_h": 1
}
```

- Asset widgets require `config.asset_id` pointing to an existing asset.
- Time widgets require `config.timezone` from `GET /timezones`.

### `PATCH /widgets/{id}`

Partial update (config and/or layout fields). Returns updated widget.

```json
{ "config": { "asset_id": "tsla", "label": "New Label" } }
```

### `DELETE /widgets/{id}`

Deletes a widget (204). If it's an asset widget and no other widget references the same asset, the asset and its price snapshots are also deleted.

### `PUT /widgets/layout`

Batch layout update for drag-and-drop.

```json
[
  { "id": 1, "layout_x": 0, "layout_y": 0, "layout_w": 2, "layout_h": 1 },
  { "id": 2, "layout_x": 2, "layout_y": 0, "layout_w": 1, "layout_h": 1 }
]
```

### `GET /timezones`

Returns a sorted list of all valid IANA timezone strings.

```json
["Africa/Abidjan", "Africa/Accra", "..."]
```

### `GET /news` — [v4 — deferred]

Returns the most recent N summarized articles across all configured feeds.

Query params:
- `limit` (int, default 20, max 100)

```json
[
  {
    "id": "uuid-or-hash",
    "title": "Original article headline",
    "summary": "2-3 sentence LLM summary.",
    "source": "Reuters",
    "url": "https://...",
    "published_at": "2026-04-20T13:00:00Z"
  }
]
```

- News is refreshed on a schedule (hourly). Frontend may poll every 5 minutes.
- `summary` is generated once per article and stored — never generated on request.

## Error shape

Non-2xx responses return:

```json
{ "detail": "human-readable message" }
```

## Versioning

No versioning in v2. If the contract becomes unstable, prefix with `/v1/`.
