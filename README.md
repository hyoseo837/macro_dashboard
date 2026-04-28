# Macro Dashboard

A single-screen financial dashboard. Asset prices on one page, no tab-switching.

Built and used by Hyoseo Lee.

## Current state — v3 (complete)

- **Multi-user auth**: Email/password registration with invite codes, JWT access + refresh tokens
- **Password reset**: Email-based reset flow via SMTP (falls back to console logging)
- **Admin panel**: Invite code management + user list
- **User-scoped widgets**: Each user has their own dashboard layout
- **Default experience**: New users get AAPL, MSFT, BTC-USD asset widgets + a New York time widget
- **Widget grid**: Drag-and-drop, resizable widgets via `react-grid-layout` (6-column grid)
- **Asset widgets**: Live prices, sparklines, change badges — responsive at 1x1, 2x1, 1x2, 2x2
- **Time widgets**: Analog or digital clocks for any IANA timezone — responsive at all sizes
- **Add/edit/delete widgets** via modals in edit mode
- **Yahoo Finance autocomplete** for adding new assets
- Backend scheduler refreshes prices every 15 min; frontend polls every 60s
- Dark mode only

## Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 + React Query + Recharts + react-grid-layout + react-router-dom
- **Backend**: FastAPI + SQLAlchemy 2.x (async) + PostgreSQL 16 (Docker) + APScheduler + yfinance + python-jose (JWT) + bcrypt + aiosmtplib
- **Packaging**: Poetry (backend), npm (frontend)

## Quick start

**Backend** (from `backend/`):

```bash
docker compose up -d          # Postgres on :5433 (user/pass: macro/macro)
poetry install
poetry run alembic upgrade head
poetry run python -m app.cli create-admin --email admin@example.com --password yourpassword
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
  CLAUDE.md           AI assistant instructions
  backend/            FastAPI service
  frontend/           Vite + React SPA
```

## How to work on this

The two halves are independent. The contract between them is [API.md](API.md). If a shape changes, update `API.md` first, then update both sides.

## Roadmap

See [PLAN_future.md](PLAN_future.md) for full details.

| Version | Theme | Status |
|---------|-------|--------|
| **v1** | Price Dashboard | done |
| **v2** | Widget System & Grid | done |
| **v3** | Multi-User | done |
| **v4** | News & Media | planned |
