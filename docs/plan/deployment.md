# Deployment Plan (Complete)

DigitalOcean droplet + Docker Compose. Full control, ~$6/month.

## Infrastructure

- **VPS**: DigitalOcean $6/month (1 vCPU, 1 GB RAM, 25 GB SSD)
- **Domain**: `macro.hyoseo.dev` — Cloudflare DNS A record (DNS-only, grey cloud)
- **HTTPS**: Caddy auto-provisions via Let's Encrypt

## Docker Compose (`docker-compose.prod.yml`)

- `db` — Postgres 16 Alpine, data volume, healthcheck
- `backend` — Python 3.12, Poetry, runs migrations then uvicorn
- `caddy` — Multi-stage: Node 22 builds Vite → Caddy 2 serves + reverse proxies

## Production Config (`.env.production`, not in git)

- `DOMAIN` — `macro.hyoseo.dev`
- `POSTGRES_PASSWORD` — database password
- `SECRET_KEY` — JWT signing secret
- `SMTP_*` — optional, for password reset emails

## Caddyfile Routing

- API routes (`/auth/*`, `/admin/*`, `/prices/*`, `/widgets/*`, `/timezones/*`, `/news/*`, `/health`) → backend
- Asset API (`/assets`, `/assets/search`, `/assets/currency`) → backend (exact paths)
- Everything else → static files with SPA fallback

## Droplet Aliases (`/root/.bashrc`)

- `macro-deploy` — pull + rebuild all containers
- `macro-logs` — tail backend logs
- `macro-backup` — pg_dump to `~/backups/`
- `macro-status` — show container status
- `macro-restart` — restart without rebuilding

## Workflow

Develop locally → commit & push → SSH → `macro-deploy`

## Future

- Automated backups via cron to object storage
- CI/CD via GitHub Actions (optional)
