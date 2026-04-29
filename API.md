# API Contract

HTTP contract between `frontend/` and `backend/`. For current system state, read CLAUDE.md instead.

| Domain | File | When to read |
|--------|------|-------------|
| Overview | [overview.md](docs/api/overview.md) | base URLs, CORS, JWT auth scheme, error shape, versioning |
| Auth | [auth.md](docs/api/auth.md) | register, login, refresh, logout, forgot/reset password endpoints |
| Data | [data.md](docs/api/data.md) | assets, prices, sparklines, widgets CRUD, layout batch update, timezones |
| Admin | [admin.md](docs/api/admin.md) | invite code CRUD, user list endpoint |
| News | [news.md](docs/api/news.md) | feed catalog, articles endpoint, news widget config shape |
