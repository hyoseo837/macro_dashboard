# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

v2 is complete. v3 (multi-user) is in progress — Phases 1–5 are done, Phase 6 (polish) remains. Backend on `:8000`, frontend on `:5173`, Postgres in Docker on **host port 5433**, `price_snapshots` refreshed every 15 min. [PLAN_future.md](PLAN_future.md) and [API.md](API.md) are design docs — trust the shipped code when they disagree.

## Scope discipline

v3 is in progress. Anything related to news (RSS, Anthropic summarization, `/news` endpoint, `news_articles` table) is v4 scope — do not add `feedparser`, `anthropic`, or news-related files.

## Architecture

Two independent halves:

- [backend/](backend/) — FastAPI + SQLAlchemy 2.x (async, `psycopg` v3) + PostgreSQL 16 (Docker) + APScheduler + yfinance. Poetry for packaging. The scheduler is wired inline in [backend/app/main.py](backend/app/main.py); it runs `refresh_all_prices` once on startup, then every 15 min. Tables: `assets` (global catalog), `price_snapshots` (cache), `widgets` (user layout), `users`, `invite_codes`, `refresh_tokens`, `password_reset_tokens`. Auth via JWT (`python-jose`) + `bcrypt`. SMTP for password reset via `aiosmtplib`.
- [frontend/](frontend/) — Vite + React 19 + TypeScript + Tailwind v4 + `@tanstack/react-query` + `recharts` + `react-grid-layout` + `react-router-dom` + `axios`. Routes: `/` (landing), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard` (protected), `/admin` (admin-only). `usePrices` polls `/prices` every 60 s. Dark mode only.

The contract between halves is [API.md](API.md). If a shape changes, update `API.md`, then both sides. The frontend must never call yfinance/RSS directly — everything goes through the backend.

## Key conventions

- **Widget system**: The dashboard is a grid of widgets (`react-grid-layout`, 6 cols). Two widget types: `asset` (price card) and `time` (live clock). Each widget has position/size (`layout_x/y/w/h`) and type-specific `config` (jsonb).
- **Assets are a shared catalog**: `assets` table stores canonical Yahoo Finance metadata. Widgets reference assets via `config.asset_id`. Display names are widget-owned (`config.label`), not asset-owned.
- **Orphan cleanup**: Deleting the last widget referencing an asset also deletes the asset and its snapshots — except for protected default assets (AAPL, MSFT, BTC-USD) which are preserved so new users get price data immediately.
- `price_snapshots` is a **cache** (one row per asset, overwritten via `ON CONFLICT DO UPDATE`) — not a history table.
- **Auth**: JWT access tokens (30 min) in memory, refresh tokens (7 days) as `httpOnly` cookies. First admin created via `poetry run python -m app.cli create-admin`. Registration requires an invite code created by an admin.
- **Default widgets**: On registration, new users get 4 widgets (AAPL, MSFT, BTC-USD asset widgets + New York time widget). Default assets are also ensured on backend startup.
- Sparkline = last 30 daily closes, stored as jsonb (`{date, price}[]`). May be shorter; don't pad.
- Korean ETF symbols (`379800.KS`, `133690.KS`) sometimes return empty from Yahoo. `fetch_price_data` wraps each symbol in try/except and logs failures — one bad ticker must not break the batch.
- CORS origins come from the `CORS_ORIGINS` env var (default `http://localhost:5173`). Frontend base URL comes from `VITE_API_BASE` (default `http://localhost:8000`).
- Postgres host-mapped to `5433` in [backend/docker-compose.yml](backend/docker-compose.yml).

## Commands

Backend (from `backend/`):

```bash
docker compose up -d                    # Postgres on :5433 (user/pass: macro/macro)
poetry install
poetry run alembic upgrade head         # apply migrations
poetry run python -m app.cli create-admin --email <email> --password <pass>  # first-time setup
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

The user runs the backend and frontend themselves (`poetry run uvicorn app.main:app --reload` and `npm run dev`). Do not start or restart these servers — just `curl` against `:8000` / `:5173` to test.

No test suite exists yet. `pytest` is listed as a dev dep in `pyproject.toml` but there is no `tests/` directory; don't claim to have run tests without adding them.

## Alembic notes

Migrations live in `backend/migrations/versions/`. The `env.py` overrides the URL from `alembic.ini` with `settings.DATABASE_URL`, so the dummy URL in `alembic.ini` (`driver://user:pass@localhost/dbname`) is unused — don't change it expecting it to take effect. All model classes must inherit from `app.models.Base` for autogenerate to detect them.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
