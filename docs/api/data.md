# Data API — Assets, Prices, Widgets, Timezones

## `GET /assets`

Returns asset list (metadata only, no prices). Public.

```json
[{ "id": "kodex_sp500", "display_name": "KODEX 미국S&P500", "symbol": "379800.KS", "category": "etf", "currency": "KRW" }]
```

`category`: `etf`, `equity`, `crypto`, `fx`, `commodity`.

## `POST /assets`

Creates asset. Returns 201. Errors: 409 (exists).

```json
{ "symbol": "TSLA", "display_name": "Tesla, Inc.", "category": "equity", "currency": "USD" }
```

## `GET /assets/search?q={query}`

Proxies Yahoo Finance search. Up to 10 matches. Public.

```json
[{ "symbol": "TSLA", "name": "Tesla, Inc.", "category": "equity" }]
```

## `GET /assets/currency?symbol={symbol}`

Returns currency string (e.g., `"USD"`). Public.

## `GET /prices`

Latest cached prices + sparklines. Public. Server cache: 15 min. Client polls 60s.

```json
[{
  "id": "tsla", "symbol": "TSLA", "price": 412.85, "currency": "USD",
  "change_abs": -3.21, "change_pct": -0.77, "as_of": "2026-04-20T14:32:00Z",
  "sparkline": [{"date": "2026-03-21", "price": 410.1}],
  "day_high": 415.20, "day_low": 409.50, "volume": 52340000
}]
```

- `sparkline`: `{date, price}[]`, last 30 daily closes. `day_high`/`day_low`/`volume` nullable.

## `GET /widgets` *(auth required)*

Returns current user's widgets ordered by position.

```json
[
  { "id": 1, "type": "asset", "config": {"asset_id": "tsla", "label": "Tesla"}, "layout_x": 0, "layout_y": 0, "layout_w": 1, "layout_h": 1 },
  { "id": 2, "type": "news", "config": {"feed_id": "bbc_tech", "label": "BBC Tech"}, "layout_x": 2, "layout_y": 0, "layout_w": 2, "layout_h": 1 }
]
```

`type`: `"asset"`, `"time"`, or `"news"`.

## `POST /widgets` *(auth required)*

Creates widget. Returns 201. Asset requires `config.asset_id`, time requires `config.timezone`, news requires `config.feed_id`.

## `PATCH /widgets/{id}` *(auth required)*

Partial update (config and/or layout). Owner only.

## `DELETE /widgets/{id}` *(auth required)*

Deletes widget (204). Orphan cleanup: removes unreferenced assets/feeds.

## `PUT /widgets/layout` *(auth required)*

Batch layout update for drag-and-drop.

```json
[{ "id": 1, "layout_x": 0, "layout_y": 0, "layout_w": 2, "layout_h": 1 }]
```

## `GET /timezones`

Sorted list of IANA timezone strings. Public.
