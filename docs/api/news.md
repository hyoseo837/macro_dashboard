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

## `GET /news/topics`

Returns sorted list of available topics. Public.

```json
["business", "entertainment", "global", "science", "sports", "technology"]
```

## `GET /news/ai-status`

Returns whether AI features are enabled. Public.

```json
{ "ai_enabled": true }
```

## `GET /news/articles?feed_id={key}&limit={n}`

Returns cached articles for a single feed. Ordered by `published_at` desc.

```json
[{
  "id": 1, "title": "Headline", "url": "https://...",
  "source_name": "BBC", "published_at": "2026-04-30T10:00:00Z",
  "fetched_at": "2026-04-30T10:15:00Z"
}]
```

## `GET /news/articles/topic?topic={topic}&limit={n}`

Cross-source articles for a topic, grouped by AI event clusters. Same response format as `/articles/clustered`.

## `GET /news/articles/clustered?limit={n}`

Articles grouped by AI event clusters. Returns clusters first, then unclustered articles.

```json
[
  { "cluster_id": 1, "cluster_label": "Fed Rate Decision", "articles": [...] },
  { "cluster_id": null, "cluster_label": null, "articles": [{ ... }] }
]
```

## News Widget Config

Three modes via `config.mode`:

**Single** (default): `{ "feed_id": "bbc_tech", "label": "BBC Technology" }`
**Topic**: `{ "mode": "topic", "topic": "technology", "label": "All Tech News" }`
**Overall**: `{ "mode": "overall", "label": "All News" }`

- Minimum widget size: 2x1. Topic/overall default to 2x2.
- On create: relevant feeds activated. On delete: orphan feeds deactivated.
- Articles cached 7 days, refreshed hourly. AI pipeline runs every 65 min.
