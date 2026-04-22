# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

v1 is built and running locally (see [HISTORY.md](HISTORY.md)): backend on `:8000`, frontend on `:5173`, Postgres in Docker on **host port 5433**, `price_snapshots` refreshed every 15 min. Both `PLAN.md` files and [API.md](API.md) are design docs — trust the shipped code when they disagree (see "Known drift" below).

## Scope discipline: v1 vs v2

The plans deliberately describe both versions. **Only v1 is in scope.** Anything tagged `[v2 - deferred]` (news ingestion, RSS, Anthropic summarization, `/news` endpoint, `NewsCard`, `news_articles` table) must be preserved in the docs but **not implemented**. Do not add `feedparser`, `anthropic`, or news-related files during v1 work.

v1 = prices only (yfinance + Postgres cache + `/assets` + `/prices` + a grid of asset cards).

## Architecture

Two independent halves:

- [backend/](backend/) — FastAPI + SQLAlchemy 2.x (async, `psycopg` v3) + PostgreSQL 16 (Docker) + APScheduler + yfinance. Poetry for packaging. The scheduler is wired inline in [backend/app/main.py](backend/app/main.py) (not a separate `jobs.py` as PLAN.md suggests); it runs `refresh_all_prices` once on startup, then every 15 min. `/prices` reads the cache via a single `Asset`↔`PriceSnapshot` join.
- [frontend/](frontend/) — Vite + React 19 + TypeScript + Tailwind v4 + `@tanstack/react-query` + `recharts` + `axios`. Single page, no router. `usePrices` polls `/prices` every 60 s with `staleTime: 30 s`. Dark mode only.

The contract between halves is [API.md](API.md). If a shape changes, update `API.md`, then both sides. The frontend must never call yfinance/RSS directly — everything goes through the backend.

## Known drift from the spec docs

- **Sparkline shape**: shipped as `{date: string, price: number}[]` (see [backend/app/services/prices.py](backend/app/services/prices.py) `fetch_price_data` and [frontend/src/api/types.ts](frontend/src/api/types.ts) `SparklinePoint`). `API.md` still documents it as `number[]` — treat the code as truth and update `API.md` when convenient.
- **Postgres port**: host-mapped to `5433` in [backend/docker-compose.yml](backend/docker-compose.yml) (the default env/URL in [backend/app/config.py](backend/app/config.py) matches). PLAN.md and `API.md` examples still say `5432`.
- **Package manager**: Poetry (the plan flagged this as an open choice; it's settled).

## Key conventions

- Asset list is hardcoded in [backend/app/config.py](backend/app/config.py) and upserted into the `assets` table on startup. Asset `id` values (`tsla`, `kodex_sp500`, `cadkrw`, etc.) are the primary keys and join keys — they must match across backend, frontend, and any references.
- `price_snapshots` is a **cache** (one row per asset, overwritten via `ON CONFLICT DO UPDATE`) — not a history table. A separate `price_history` table would be added later if charts need date ranges.
- Sparkline = last 30 daily closes, stored as jsonb. May be shorter; don't pad.
- Korean ETF symbols (`379800.KS`, `133690.KS`) sometimes return empty from Yahoo. `fetch_price_data` wraps each symbol in try/except and logs failures — one bad ticker must not break the batch. Preserve that behavior.
- CORS origins come from the `CORS_ORIGINS` env var (default `http://localhost:5173`). Frontend base URL comes from `VITE_API_BASE` (default `http://localhost:8000`).

## Commands

Backend (from `backend/`):

```bash
docker compose up -d                    # Postgres on :5433 (user/pass: macro/macro)
poetry install
poetry run alembic upgrade head         # apply migrations
poetry run uvicorn app.main:app --reload
poetry run alembic revision --autogenerate -m "describe change"  # new migration
```

Frontend (from `frontend/`):

```bash
npm install
npm run dev       # Vite on :5173
npm run build     # tsc -b && vite build
npm run lint      # eslint .
```

No test suite exists yet. `pytest` is listed as a dev dep in `pyproject.toml` but there is no `tests/` directory; don't claim to have run tests without adding them.

## Alembic notes

Migrations live in `backend/migrations/versions/`. The `env.py` overrides the URL from `alembic.ini` with `settings.DATABASE_URL`, so the dummy URL in `alembic.ini` (`driver://user:pass@localhost/dbname`) is unused — don't change it expecting it to take effect. All model classes must inherit from `app.models.Base` for autogenerate to detect them.
