# API Contract

HTTP contract between `frontend/` and `backend/`. This is the source of truth — if you change a shape here, update both sides.

**v1 endpoints**: `/assets`, `/prices`. The `/news` section below is marked **[v2 — deferred]** and is not implemented in v1.

- Base URL in dev: `http://localhost:8000`
- Base URL in prod: env var `VITE_API_BASE` on the frontend
- All responses are JSON. All timestamps are ISO 8601 UTC strings.
- All money/price values are numbers (not strings). Currency is included as a sibling field where ambiguous.

## CORS

Backend must allow the frontend origin. In dev: `http://localhost:5173`.

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
    "sparkline": [410.1, 411.4, 412.0, 411.8, 412.85]
  }
]
```

- Sparkline is the last 30 closes (or fewer if not available). Resolution can be daily for v1.
- `change_abs` and `change_pct` are vs. the previous close.
- Server-side cache TTL: 15 minutes. Client may poll every 60s (it'll mostly hit cache).

### `GET /news` — [v2 — deferred]

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
{ "error": "string code", "detail": "human-readable message" }
```

## Versioning

No versioning in v1. If the contract becomes unstable, prefix with `/v1/`.
