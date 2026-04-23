# Macro Dashboard

A single-screen financial dashboard. Asset prices on one page, no tab-switching.

Built and used by Hyoseo Lee.

## Current state — v1 (complete)

- Asset cards with live prices, sparklines, and change badges
- Add, delete, and rename assets via Yahoo Finance autocomplete
- Backend scheduler refreshes prices every 15 min; frontend polls every 60s
- Dark mode only

## Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 + React Query + Recharts
- **Backend**: FastAPI + SQLAlchemy 2.x (async) + PostgreSQL 16 (Docker) + APScheduler + yfinance
- **Packaging**: Poetry (backend), npm (frontend)

## Quick start

**Backend** (from `backend/`):

```bash
docker compose up -d          # Postgres on :5433 (user/pass: macro/macro)
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload   # :8000
```

**Frontend** (from `frontend/`):

```bash
npm install
npm run dev                   # :5173
```

## Project layout

```
macro_dashboard/
  README.md           this file
  API.md              HTTP API contract (frontend <-> backend)
  PLAN_future.md      roadmap for v2–v4
  HISTORY.md          dev log
  backend/            FastAPI service
    PLAN.md           backend build plan
  frontend/           Vite + React SPA
    PLAN.md           frontend build plan
```

## How to work on this

The two halves are independent. An agent or person picking up `backend/` should only need `backend/PLAN.md` and `API.md`. Same for `frontend/`.

If the API contract changes, update `API.md` first, then update both sides.

## Roadmap

See [PLAN_future.md](PLAN_future.md) for full details.

| Version | Theme | Key features |
|---------|-------|--------------|
| **v1** | Price Dashboard (done) | Asset cards, sparklines, add/delete/rename assets |
| **v2** | Widget System | General-purpose widget grid (`react-grid-layout`), drag & drop, resize, new widget types (time clock), edit mode |
| **v3** | Multi-User | Email/password auth, invite-only beta, per-user widget layouts, shared global asset catalog |
| **v4** | News & Media | News widget type, multi-source RSS (BBC, CNN, NYT, HN), AI summarization via Claude API |
