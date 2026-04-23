# GEMINI.md

## Project Overview
`macro_dashboard` is a single-screen financial dashboard designed to build a habit of "looking around" by centralizing societal and financial information. It prioritizes zero-friction data consumption through a high-density, single-page layout.

- **Status**: Planning Phase (v1 Scope: Prices only; v2 Scope: AI News summaries - DEFERRED).
- **Architecture**: Decoupled FastAPI backend and Vite+React frontend.
- **Source of Truth**: `API.md` defines the definitive HTTP contract between systems.

## Project Structure
- `backend/`: FastAPI service, database models, and price ingestion.
- `frontend/`: Vite + React SPA for the dashboard UI.
- `API.md`: HTTP API specification (source of truth).
- `CLAUDE.md`: Strategic guidance and scope discipline.
- `README.md`: High-level overview and hardcoded asset list.

## Core Mandates & Scope Discipline
- **v1 Focus**: Strictly limited to asset prices. The asset list is **hardcoded** for v1, but the architecture must remain flexible to support high customizability in future versions.
- **v2 Focus (Deferred)**: News ingestion and AI summarization (Anthropic). Do not implement news-related logic or dependencies (e.g., `feedparser`, `anthropic`).
- **Independent Development**: Systems should be built independently using their respective `PLAN.md` files as roadmaps.

## Development Workflows

### Backend Development
- **Robust Structure**: Prioritize a clean, scalable server architecture and environment variable hygiene.
- **Database**: PostgreSQL 16 (Docker) with Alembic for migrations.
- **Price Fetching**: `yfinance` fetches every 15 minutes via APScheduler.
- **Commands (Expected)**:
  - Start DB: `docker compose up -d`
  - Migrations: `alembic upgrade head`
  - Start Server: `uvicorn app.main:app --reload`

### Frontend Development
- **UX Goal**: High-density information display requiring minimal user interaction.
- **Styling**: Tailwind CSS (Dark mode by default).
- **State**: `@tanstack/react-query` with a 60s polling interval for `/prices`.
- **Commands (Expected)**:
  - Install: `npm install`
  - Dev: `npm run dev`
  - Build: `npm run build`

## Key Conventions
- **Asset IDs**: Unique identifiers (e.g., `tsla`, `btc`) act as primary keys across both systems.
- **Currency**: All monetary values are numbers. Use `Intl.NumberFormat` for locale-aware UI formatting.
- **Error Resilience**: Log and handle per-symbol fetch failures gracefully; ensure a single bad ticker never breaks the batch process.
- **Security**: Strict CORS origin validation via `CORS_ORIGINS` env var.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
