# macro_dashboard

A single-screen financial dashboard. Asset prices on one page, no tab-switching. News with AI summaries is planned for v2.

Built and used by Hyoseo Lee. Personal first — multi-user is out of scope for v1.

## Scope

- **v1 (now)**: prices only. No news, no LLM.
- **v2 (later)**: news cards with AI-summarized headlines. Spec is kept in the plan files — don't delete it, just don't build it yet.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (Docker)
- **Data**: `yfinance` for prices. News pipeline (`feedparser` + Anthropic API) is v2.
- **Deploy**: separate. Frontend on Cloudflare Pages, backend on a small VPS / Fly.io / Railway (TBD).

## Layout

```
macro_dashboard/
  README.md         this file
  API.md            HTTP API contract (frontend <-> backend)
  backend/          FastAPI service
    PLAN.md         build plan for backend
  frontend/         Vite + React SPA
    PLAN.md         build plan for frontend
```

## How to work on this

The two halves are independent. An agent or person picking up `backend/` should only need `backend/PLAN.md` and `API.md`. Same for `frontend/`.

If the API contract changes, update `API.md` first, then update both sides.

## Initial asset list (v1, hardcoded)

| Display name              | yfinance symbol |
|---------------------------|-----------------|
| KODEX 미국S&P500          | 379800.KS       |
| TIGER 미국나스닥100       | 133690.KS       |
| Tesla                     | TSLA            |
| Palantir                  | PLTR            |
| Bitcoin                   | BTC-USD         |
| CAD / KRW                 | CADKRW=X        |
| Gold (futures)            | GC=F            |
| Silver (futures)          | SI=F            |

Korean ETF symbols (`379800.KS`, `133690.KS`) should be verified against yfinance on first run; fall back to alternative IDs if Yahoo doesn't return data.

## News sources (v2 — deferred)

Not built in v1. When v2 starts, pick RSS feeds first. Candidates from the spec: Reuters, CNN, JTBC. Do not invent RSS URLs — confirm each before hardcoding.
