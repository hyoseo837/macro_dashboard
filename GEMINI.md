# GEMINI.md

## Project Overview
`macro_dashboard` is a single-screen financial dashboard designed to build a habit of "looking around" by centralizing societal and financial information. It prioritizes zero-friction data consumption through a high-density, single-page layout.

- **Status**: v3 (multi-user) complete. v1 (prices) and v2 (widget system) also complete.
- **Architecture**: Decoupled FastAPI backend and Vite+React frontend.
- **Source of Truth**: `API.md` defines the definitive HTTP contract between systems.

## Project Structure
- `backend/`: FastAPI service, database models, auth, admin, price ingestion.
- `frontend/`: Vite + React SPA with react-router-dom for routing.
- `API.md`: HTTP API specification (source of truth).
- `CLAUDE.md`: Strategic guidance and scope discipline.
- `PLAN_future.md`: Full roadmap (v1–v4) with implementation details.
- `HISTORY.md`: Development log.

## Core Mandates & Scope Discipline
- **v3 Focus**: Multi-user auth (email/password + JWT), invite-only registration, admin panel, user-scoped widgets, password reset via SMTP.
- **v4 Focus (Deferred)**: News ingestion and AI summarization (Anthropic). Do not implement news-related logic or dependencies (e.g., `feedparser`, `anthropic`).

## Development Workflows

### Backend Development
- **Database**: PostgreSQL 16 (Docker on port 5433) with Alembic for migrations. 7 tables: `users`, `invite_codes`, `refresh_tokens`, `password_reset_tokens`, `assets`, `price_snapshots`, `widgets`.
- **Auth**: JWT access tokens (30 min) + refresh tokens (7 days, httpOnly cookie). First admin via CLI.
- **Price Fetching**: `yfinance` fetches every 15 minutes via APScheduler.
- **Commands**:
  - Start DB: `docker compose up -d`
  - Migrations: `alembic upgrade head`
  - Seed admin: `poetry run python -m app.cli create-admin --email <email> --password <pass>`
  - Start Server: `poetry run uvicorn app.main:app --reload`

### Frontend Development
- **UX Goal**: High-density information display requiring minimal user interaction.
- **Styling**: Tailwind CSS v4 (dark mode only).
- **Routing**: `react-router-dom` — landing, login, register, forgot/reset password, dashboard (protected), admin (admin-only).
- **State**: `@tanstack/react-query` with 60s polling for `/prices`. Auth state in `AuthContext` (token in memory, refresh via cookie).
- **Commands**:
  - Install: `npm install`
  - Dev: `npm run dev`
  - Build: `npm run build`

## Key Conventions
- **Widget system**: Dashboard is a grid of widgets (`react-grid-layout`, 6 cols). Types: `asset` (price card) and `time` (clock). User-scoped since v3.
- **Assets are a shared catalog**: `assets` table stores Yahoo Finance metadata. Widgets reference assets via `config.asset_id`. Default assets (AAPL, MSFT, BTC-USD) are protected from orphan cleanup.
- **Currency**: All monetary values are numbers. Use `Intl.NumberFormat` for locale-aware UI formatting.
- **Error Resilience**: Log and handle per-symbol fetch failures gracefully; a single bad ticker must not break the batch.
- **Security**: CORS via `CORS_ORIGINS` env var. JWT auth on protected endpoints. Invite-only registration.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
