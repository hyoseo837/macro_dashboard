# Production Deployment (2026-04-28)

## Infrastructure

- **VPS**: DigitalOcean $6/month droplet (1 vCPU, 1 GB RAM, 25 GB SSD), IP `165.245.235.8`.
- **Domain**: `macro.hyoseo.dev` — Cloudflare DNS A record, DNS-only (grey cloud).
- **HTTPS**: Caddy auto-provisions via Let's Encrypt.
- **SSH**: Key-based authentication.

## Docker Production Config

- **`docker-compose.prod.yml`**: Postgres 16 (healthcheck) + FastAPI backend + Caddy.
- **`backend/Dockerfile`**: Python 3.12 slim, Poetry `--only main --no-root`, `alembic upgrade head` then uvicorn.
- **`frontend/Dockerfile`**: Multi-stage — Node 22 builds Vite (`VITE_API_BASE=""`), Caddy 2 serves output.
- **`frontend/Caddyfile`**: Reverse proxies API routes, serves static files with SPA fallback.
- **`.env.production`** on droplet (not in git): `DOMAIN`, `POSTGRES_PASSWORD`, `SECRET_KEY`, `SMTP_*`.

## Bug Fixes During Deployment

- Poetry `--no-dev` → `--only main --no-root` (Poetry v2 breaking change).
- Caddyfile `handle /assets*` caught Vite static files → exact path matchers.
- `VITE_API_BASE` `||` → `??` (empty string treated as falsy).
- Added `reset-password` CLI command.

## Widget Overlap Fix

- `findFreePosition()` in `AddWidgetModal.tsx` — scans grid for first free cell.

## Operational Aliases (`/root/.bashrc`)

- `macro-deploy` — `git pull` + `docker compose up -d --build`
- `macro-logs` — tail backend logs
- `macro-backup` — `pg_dump` to `~/backups/`
- `macro-status` — show container status
- `macro-restart` — restart without rebuilding

## Deploy Workflow

Develop locally → commit & push → SSH → `macro-deploy`.
