# News API

## `GET /news/catalog`

Returns all available RSS feeds. Public, no auth.

```json
[
  { "feed_key": "bbc_world", "source_name": "BBC", "topic": "global", "country": null },
  { "feed_key": "cnn_us", "source_name": "CNN", "topic": "global", "country": "us" }
]
```

22 predefined feeds: BBC (6), CNN (5), Reuters (3), NYT (5), HN (1), Korea Herald (1), CBC (1).
Topics: global, technology, business, science, sports, entertainment.
Countries: us, kr, ca (nullable for international feeds).

## `GET /news/articles?feed_id={feed_key}&limit={n}`

Returns cached articles for a feed. Ordered by `published_at` desc. Public.

Query params:
- `feed_id` (string, required) — key from catalog
- `limit` (int, default 20, max 100)

```json
[{
  "id": 1, "title": "Article headline", "url": "https://...",
  "source_name": "BBC", "published_at": "2026-04-29T10:00:00Z",
  "fetched_at": "2026-04-29T10:15:00Z"
}]
```

Returns `[]` if feed is not active (no widget references it).

## News Widget Config

```json
{ "feed_id": "bbc_tech", "label": "BBC Technology" }
```

- `feed_id`: valid key from `GET /news/catalog`
- `label`: auto-generated, user-editable
- Minimum widget size: 2x1
- On create: feed activated, immediate background fetch if new
- On delete: orphan feeds deactivated, articles deleted
- Articles cached 7 days, refreshed hourly by scheduler
