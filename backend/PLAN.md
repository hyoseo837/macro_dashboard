# Backend Plan — macro_dashboard

FastAPI service that exposes asset prices to the frontend. See `../API.md` for the HTTP contract — that file is the source of truth for shapes.

## Scope

- **v1 (this plan)**: prices only. No news, no LLM, no Anthropic key needed.
- **v2 (deferred)**: news ingestion + AI summarization. Sections below marked **[v2 — deferred]** describe v2; keep them for later but do not build them now.

## Goals (v1)

- Cache prices for the configured asset list and serve them via a single `/prices` endpoint.
- Be runnable locally with one command (`docker compose up` for Postgres, `uvicorn` for the app).

## Stack

- Python 3.12
- FastAPI
- SQLAlchemy 2.x (ORM, async style)
- PostgreSQL 16 (via Docker Compose for local dev)
- `psycopg[binary]` v3 as the driver
- Alembic for migrations
- `yfinance` for market data
- APScheduler for periodic jobs (one process, in-app scheduler — fine for v1)
- `uvicorn` as the ASGI server
- **[v2 — deferred]** `feedparser` for RSS, `anthropic` SDK for news summarization (model: `claude-haiku-4-5-20251001`)

## Layout

```
backend/
  PLAN.md
  pyproject.toml          # dependencies (use uv or poetry — pick one)
  docker-compose.yml      # postgres only
  .env.example            # documents required env vars
  alembic.ini
  migrations/             # alembic
  app/
    main.py               # FastAPI app, mounts routers, starts scheduler
    config.py             # env vars, ticker list
    db.py                 # SQLAlchemy engine + session
    models.py             # ORM models
    schemas.py            # Pydantic response models
    routers/
      assets.py           # GET /assets
      prices.py           # GET /prices
      # news.py           # [v2 — deferred] GET /news
    services/
      prices.py           # yfinance fetch + cache logic
      # news.py            # [v2 — deferred] RSS fetch + Anthropic summarization
    jobs.py               # scheduler definitions
```

## Data model

Use SQLAlchemy ORM. Two tables for v1 (`assets`, `price_snapshots`). A third, `news_articles`, is specified below as **[v2 — deferred]** — do not create it in v1.

**`assets`** (configured asset list — could be config-only, but having a row per asset makes joins cleaner)
- `id` (string PK, e.g. `tsla`)
- `display_name` (text)
- `symbol` (text, yfinance symbol)
- `category` (enum: etf | equity | crypto | fx | commodity)
- `currency` (text, ISO 4217)

**`price_snapshots`** (latest fetch per asset; we overwrite, we don't accumulate history here)
- `asset_id` (FK → assets.id, PK)
- `price` (numeric)
- `change_abs` (numeric)
- `change_pct` (numeric)
- `previous_close` (numeric)
- `sparkline` (jsonb — array of 30 numbers)
- `fetched_at` (timestamptz)

For v1 we don't need long-term price history; if we add a chart with date range later, we'll add a separate `price_history` table.

**`news_articles`** — **[v2 — deferred]**
- `id` (uuid PK)
- `source` (text — display name like "Reuters")
- `feed_url` (text)
- `title` (text)
- `url` (text, unique — used for dedup)
- `published_at` (timestamptz)
- `raw_content` (text, nullable — body if we successfully fetch it)
- `summary` (text, nullable — null until summarized)
- `summarized_at` (timestamptz, nullable)

Index on `published_at desc` for the listing query. Unique on `url`.

## Configuration

Hardcode the asset list in `app/config.py` for v1. Pull secrets from env (`.env`):

```
DATABASE_URL=postgresql+psycopg://macro:macro@localhost:5432/macro_dashboard
CORS_ORIGINS=http://localhost:5173
# ANTHROPIC_API_KEY=...   # [v2 — deferred]
```

Asset list — copy from `../README.md`:

```python
ASSETS = [
    {"id": "kodex_sp500", "display_name": "KODEX 미국S&P500", "symbol": "379800.KS", "category": "etf", "currency": "KRW"},
    {"id": "tiger_nasdaq100", "display_name": "TIGER 미국나스닥100", "symbol": "133690.KS", "category": "etf", "currency": "KRW"},
    {"id": "tsla", "display_name": "Tesla", "symbol": "TSLA", "category": "equity", "currency": "USD"},
    {"id": "pltr", "display_name": "Palantir", "symbol": "PLTR", "category": "equity", "currency": "USD"},
    {"id": "btc", "display_name": "Bitcoin", "symbol": "BTC-USD", "category": "crypto", "currency": "USD"},
    {"id": "cadkrw", "display_name": "CAD / KRW", "symbol": "CADKRW=X", "category": "fx", "currency": "KRW"},
    {"id": "gold", "display_name": "Gold", "symbol": "GC=F", "category": "commodity", "currency": "USD"},
    {"id": "silver", "display_name": "Silver", "symbol": "SI=F", "category": "commodity", "currency": "USD"},
]
```

**[v2 — deferred]** RSS feeds: confirm exact URLs with the user before hardcoding. Do not invent URLs.

## Periodic jobs (APScheduler)

- `refresh_prices` — every 15 minutes. For each asset, call yfinance, write to `price_snapshots`. Run once at startup so the table is populated immediately.
- **[v2 — deferred]** `refresh_news` — hourly. For each RSS feed, parse and upsert into `news_articles` (dedup by URL). Then for any rows where `summary IS NULL`, call Anthropic to generate a summary and store it.

Jobs should swallow per-asset errors and log them — one bad ticker should not break the batch.

## News summarization — [v2 — deferred]

For each unsummarized article, send title + raw_content (or just title if body fetch failed) to Anthropic with a prompt like:

> Summarize this news article in 2-3 sentences for a busy reader. Focus on what happened and why it matters. No filler.

Model: `claude-haiku-4-5-20251001`. Cap output at ~150 tokens. Store the result.

If body fetch fails, summarizing from the title alone is acceptable — many RSS feeds include a description field that's good enough.

## Endpoints

Implement exactly the shapes in `../API.md`:

- `GET /assets` → from `assets` table
- `GET /prices` → join `assets` + `price_snapshots`
- **[v2 — deferred]** `GET /news?limit=N` → from `news_articles` where `summary IS NOT NULL`, ordered by `published_at desc`

CORS: allow origins from `CORS_ORIGINS` env var (comma-separated).

## Build order (v1)

1. `docker-compose.yml` for Postgres. Verify `docker compose up -d` brings it up and `psql` can connect.
2. `pyproject.toml` with deps (no `anthropic`, no `feedparser` in v1). Set up venv.
3. SQLAlchemy models (`assets`, `price_snapshots` only) + Alembic init + first migration. Run against local DB.
4. `app/main.py` minimal — health check endpoint, CORS, app starts.
5. Seed `assets` table from `config.ASSETS` on startup (idempotent upsert).
6. `services/prices.py` + `routers/prices.py`. Verify `/prices` returns data after one manual `refresh_prices` call.
7. `routers/assets.py` (trivial, list from DB).
8. Wire APScheduler in `main.py` startup with `refresh_prices` only. Confirm job runs on schedule.
9. `.env.example`, README section for "how to run locally."

**[v2 — deferred] later steps**: add `news_articles` model + migration, `services/news.py` (RSS parse + dedup), Anthropic summarization step, `refresh_news` job, `GET /news` endpoint.

## Things to watch

- yfinance is an unofficial scraper. Wrap calls in try/except and log failures per-symbol.
- Korean ETF symbols (`.KS` suffix) sometimes return empty data on Yahoo — verify on first run, find alternative IDs if needed.
- APScheduler in-process means the scheduler dies if the web process restarts. That's fine for v1.
- **[v2 — deferred]** Anthropic API costs money. Only summarize once per article (`summary IS NULL` check). Don't re-summarize in tests.

## Out of scope for v1

- News, RSS, LLM summarization (v2)
- Auth / users
- Per-user asset selection
- Long-term price history
- WebSocket pushes
- Production deployment config (revisit after frontend is working locally)
