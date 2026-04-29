# API Overview

HTTP contract between `frontend/` and `backend/`. Source of truth — if a shape changes, update both sides.

- Base URL in dev: `http://localhost:8000`
- Base URL in prod: same-origin (empty `VITE_API_BASE`), Caddy reverse proxies to backend
- All responses are JSON. Timestamps are ISO 8601 UTC strings.
- Money/price values are numbers. Currency is a sibling field.

## CORS

Dev: `http://localhost:5173`. Prod: `https://macro.hyoseo.dev` (via `CORS_ORIGINS` env var).

## Authentication

JWT-based. Access token (30 min) as `Authorization: Bearer <token>`. Refresh token (7 days) as `httpOnly` cookie named `refresh_token`, scoped to `/auth`.

- Public endpoints (assets, prices, search, timezones, news catalog/articles): no auth
- Widget endpoints: user-scoped, require auth
- Admin endpoints: require admin user

## Error Shape

```json
{ "detail": "human-readable message" }
```

## Versioning

No prefix yet. If unstable, prefix with `/v1/`.

## Endpoint Groups

- [Auth endpoints](auth.md) — register, login, refresh, logout, password reset
- [Data endpoints](data.md) — assets, prices, timezones, widgets
- [Admin endpoints](admin.md) — invite codes, user list
- [News endpoints](news.md) — feed catalog, articles
