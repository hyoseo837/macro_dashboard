# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

v4B (AI news) is in progress. Deployed to **https://macro.hyoseo.dev** (DigitalOcean droplet). Local dev: backend on `:8000`, frontend on `:5173`, Postgres in Docker on **host port 5433**, `price_snapshots` refreshed every 15 min, `news_feeds` refreshed every 60 min, AI pipeline runs every 30 min (5 min after startup). [PLAN_future.md](PLAN_future.md) and [API.md](API.md) are design docs — trust the shipped code when they disagree.

## Scope discipline

v4B (AI-powered news) is in progress. AI event clustering with briefing summaries implemented using Gemini 3 Flash via `google-genai`.

## Architecture

Two independent halves:

- [backend/](backend/) — FastAPI + SQLAlchemy 2.x (async, `psycopg` v3) + PostgreSQL 16 (Docker) + APScheduler + yfinance + feedparser + google-genai. Poetry for packaging. The scheduler is wired inline in [backend/app/main.py](backend/app/main.py); it runs `refresh_all_prices` once on startup then every 15 min, `refresh_all_feeds` on startup then every 60 min, `cleanup_old_articles` daily at 3 AM, and `run_ai_pipeline` every 30 min (5 min after startup). Tables: `assets` (global catalog), `price_snapshots` (cache), `widgets` (user layout), `users`, `invite_codes`, `refresh_tokens`, `password_reset_tokens`, `news_feeds` (active RSS feeds), `news_articles` (cached headlines, cluster_id FK, duplicate_of_id self-FK), `article_clusters` (AI-generated event groups with one-liner summaries). Auth via JWT (`python-jose`) + `bcrypt`. SMTP for password reset via `aiosmtplib`.
- [frontend/](frontend/) — Vite + React 19 + TypeScript + Tailwind v4 + `@tanstack/react-query` + `recharts` + `react-grid-layout` + `react-router-dom` + `axios`. Routes: `/` (landing), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard` (protected), `/admin` (admin-only). `usePrices` polls `/prices` every 60 s. Dark mode only.

The contract between halves is [API.md](API.md). If a shape changes, update `API.md`, then both sides. The frontend must never call yfinance/RSS directly — everything goes through the backend.

## Key conventions

- **Widget system**: The dashboard is a grid of widgets (`react-grid-layout`, 6 cols). Three widget types: `asset` (price card), `time` (live clock), and `news` (RSS headlines). Each widget has position/size (`layout_x/y/w/h`) and type-specific `config` (jsonb).
- **Assets are a shared catalog**: `assets` table stores canonical Yahoo Finance metadata. Widgets reference assets via `config.asset_id`. Display names are widget-owned (`config.label`), not asset-owned.
- **Orphan cleanup**: Deleting the last widget referencing an asset also deletes the asset and its snapshots — except for protected default assets (AAPL, MSFT, BTC-USD) which are preserved so new users get price data immediately. News feeds follow the same pattern — orphan feeds and their articles are deleted when no widget references them.
- **News feeds**: Predefined RSS feed catalog in `app/services/news.py` (22 feeds: BBC, CNN, Reuters, NYT, HN, Korea Herald, CBC). Feeds are activated on-demand when a news widget is created. Articles cached for 7 days, cleaned up daily. Minimum widget size 2x1.
- **News widget modes**: Three modes via `config.mode`: `single` (one feed, default/backward-compat), `topic` (cross-source aggregation by topic), `overall` (all feeds). All three modes now use briefing format: short event one-liner + source badges linking to articles. Single mode uses `/news/articles/feed/clustered` endpoint. Topic/overall modes activate all relevant feeds on creation.
- **AI features** (`app/services/ai.py`): Gemini 3 Flash (`gemini-3-flash-preview`) via `google-genai`. Two pipeline stages: (1) `cluster_articles` groups headlines by event and generates a short one-liner summary per cluster (stored in `ArticleCluster.summary`); (2) `generate_price_summaries` creates one-liner explanations for weekly price movements using news context (stored in `PriceSnapshot.summary`, refreshed hourly). Priority queue: no-summary assets first, then oldest. Stops on rate limit (429). All optional — disabled when `GEMINI_API_KEY` is empty. Rate-limited at 5s between calls. Grounding (Google Search) deferred for future scale.
- `price_snapshots` is a **cache** (one row per asset, overwritten via `ON CONFLICT DO UPDATE`) — not a history table. Also stores AI-generated `summary` and `summary_updated_at`.
- **Auth**: JWT access tokens (30 min) in memory, refresh tokens (7 days) as `httpOnly` cookies. First admin created via `poetry run python -m app.cli create-admin`. Password reset via `poetry run python -m app.cli reset-password`. Registration requires an invite code created by an admin.
- **Default widgets**: On registration, new users get 4 widgets (AAPL, MSFT, BTC-USD asset widgets + New York time widget). Default assets are also ensured on backend startup.
- Sparkline = last 30 daily closes, stored as jsonb (`{date, price}[]`). May be shorter; don't pad.
- Korean ETF symbols (`379800.KS`, `133690.KS`) sometimes return empty from Yahoo. `fetch_price_data` wraps each symbol in try/except and logs failures — one bad ticker must not break the batch.
- CORS origins come from the `CORS_ORIGINS` env var (default `http://localhost:5173`). Frontend base URL comes from `VITE_API_BASE` (default `http://localhost:8000`). Uses `??` (not `||`) so empty string works for same-origin in production.
- Postgres host-mapped to `5433` in [backend/docker-compose.yml](backend/docker-compose.yml).
- **New widget placement**: `findFreePosition()` scans the grid for the first open cell — new widgets no longer overlap existing ones.

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

## Deployment

Production runs on a DigitalOcean droplet at **https://macro.hyoseo.dev** (IP: `165.245.235.8`). DNS managed via Cloudflare (A record, DNS-only / grey cloud — Caddy handles HTTPS).

**Production stack** (`docker-compose.prod.yml`):

- `db` — Postgres 16 Alpine, data in Docker volume
- `backend` — FastAPI (same Dockerfile as dev, runs migrations on startup)
- `caddy` — Multi-stage build: Node 22 builds Vite app → Caddy 2 serves static files + reverse proxies API routes to backend

**Config**: `.env.production` on the droplet (not in git). Required vars: `DOMAIN`, `POSTGRES_PASSWORD`, `SECRET_KEY`. Optional: `SMTP_*` for password reset emails.

**Droplet aliases** (in `/root/.bashrc`):

```bash
macro-deploy    # git pull + rebuild all containers
macro-logs      # tail backend logs
macro-backup    # pg_dump to ~/backups/
macro-status    # show container status
macro-restart   # restart without rebuilding
```

**Deploy workflow**: develop locally → commit & push → SSH into droplet → `macro-deploy`.

## Alembic notes

Migrations live in `backend/migrations/versions/`. The `env.py` overrides the URL from `alembic.ini` with `settings.DATABASE_URL`, so the dummy URL in `alembic.ini` (`driver://user:pass@localhost/dbname`) is unused — don't change it expecting it to take effect. All model classes must inherit from `app.models.Base` for autogenerate to detect them.

## Documentation conventions

Docs are split into small, focused files (<150 lines each) under `docs/`. Three top-level index files (`HISTORY.md`, `PLAN_future.md`, `API.md`) point to them. Follow these rules when reading or writing docs:

**Reading docs:**
- Always read the index file first. Each entry has a "When to read" column with keywords — only load the sub-file if your task matches those keywords.
- `CLAUDE.md` describes the current system state. `docs/plan/` explains WHY design decisions were made. `docs/history/` records WHAT happened and WHEN. `docs/api/` defines the HTTP contract. Don't load plan/history files to understand current behavior — read `CLAUDE.md` or the code.

**Writing/updating docs:**
- Keep each sub-file under 150 lines. If a file grows past that, split it.
- When adding an entry to an index file, always include a "When to read" hint — a comma-separated list of keywords an agent would search for. Be specific: `news widgets, RSS feeds, feedparser` beats `v4 features`.
- Current system state goes in `CLAUDE.md`, not in plan or history files. Plan files are design rationale (WHY). History files are changelogs (WHAT/WHEN).
- When you finish a version or feature, update `CLAUDE.md` to reflect the new current state. Don't leave agents to piece it together from plan/history files.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
