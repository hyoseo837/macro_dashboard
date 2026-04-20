# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Planning phase. Only Markdown specs exist (`README.md`, `API.md`, `backend/PLAN.md`, `frontend/PLAN.md`) - no source code, no `package.json`, no `pyproject.toml` yet. Any implementation work starts from the build-order sections inside the two `PLAN.md` files.

## Scope discipline: v1 vs v2

The plans deliberately describe both versions. **Only v1 is in scope.** Anything tagged `[v2 - deferred]` (news ingestion, RSS, Anthropic summarization, `/news` endpoint, `NewsCard`, `news_articles` table) must be preserved in the docs but **not implemented**. Do not add `feedparser`, `anthropic`, or news-related files during v1 work.

v1 = prices only (yfinance + Postgres cache + one `/prices` endpoint + a grid of asset cards).

## Architecture

Two independent halves in one repo:

- [backend/](backend/) - FastAPI + SQLAlchemy 2.x (async) + PostgreSQL 16 (Docker) + APScheduler + yfinance. In-process scheduler refreshes `price_snapshots` every 15 minutes; `/prices` reads from the cache.
- [frontend/](frontend/) - Vite + React + TypeScript + Tailwind + `@tanstack/react-query` + `recharts`. Single page, no router. Polls `/prices` every 60s. Dark mode only.

They are wired together only by [API.md](API.md), which is the **source of truth** for HTTP shapes. If a shape changes, update `API.md` first, then both sides. The frontend must never call yfinance/RSS directly - everything goes through the backend.

## Key conventions from the plans

- Asset list is hardcoded in `backend/app/config.py` (see [README.md](README.md) table). Asset `id` values (`tsla`, `kodex_sp500`, `cadkrw`, etc.) are used as primary keys and must match across backend and any frontend references.
- `price_snapshots` is a cache table (one row per asset, overwritten on refresh) - not a history table. A separate `price_history` table would be added later if charts need date ranges.
- Sparkline = last 30 daily closes, stored as jsonb. May be shorter; don't pad.
- Korean ETF symbols (`379800.KS`, `133690.KS`) sometimes return empty from Yahoo - verify on first run and log per-symbol failures; one bad ticker must not break the batch.
- Server-side cache TTL is 15 min; client polls every 60s and mostly hits cache.
- CORS origins come from the `CORS_ORIGINS` env var (comma-separated). Dev frontend runs at `http://localhost:5173`, backend at `http://localhost:8000`.
- Frontend reads base URL from `import.meta.env.VITE_API_BASE`, defaulting to `http://localhost:8000`.

## Commands

None exist yet - nothing is scaffolded. Expected commands once built (from the plans):

- Backend: `docker compose up -d` (Postgres), `alembic upgrade head`, `uvicorn app.main:app --reload`.
- Frontend: `npm install`, `npm run dev`, `npm run build`.

Pick one Python package manager (uv or poetry) when scaffolding the backend - the plan flags this as an open choice.
