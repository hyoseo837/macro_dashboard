# AI Pipeline — Gemini Integration

Backend service: `backend/app/services/ai.py`

## Overview

Two-stage pipeline using Gemini 2.5 Flash via `google-genai`. Runs every 30 min (5 min after startup). Disabled when `GEMINI_API_KEY` is empty.

## Stage 1: Article Clustering (`cluster_articles`)

- Groups recent headlines by event (single Gemini call, up to 100 articles)
- Generates a short one-liner summary per cluster (under 15 words)
- Stored in `ArticleCluster.summary`
- Only processes unclustered articles from the last 48 hours
- If rate-limited (429), re-raises to abort the entire pipeline run

## Stage 2: Price Summaries (`generate_price_summaries`)

- Processes all eligible assets in a priority queue (no batch cap)
- Generates one-liner explaining the weekly price movement using recent news context
- Stored in `PriceSnapshot.summary` + `summary_updated_at`
- Stops immediately on rate limit (429/RESOURCE_EXHAUSTED), remaining assets deferred to next run

### Priority queue order

1. Assets with no summary (NULL `summary_updated_at`) — first
2. Assets with oldest summaries — next
3. Fresh assets (summary < 1hr old) — skipped

### Conditions for an asset to be queued

1. Has a `price_snapshot` row (fetched at least once)
2. `sparkline` has >= 2 data points
3. Existing summary is older than 1 hour or doesn't exist

### Prompt construction (`_build_price_summary_prompt`)

- Calculates % change from first to last sparkline price
- Includes up to 30 recent headlines (from last 48h) as context
- Asks for ONE sentence under 20 words explaining the price movement
- Falls back to "brief market context" if change is tiny (<1%) or no clear cause

## Rate Limiting

- 5-second delay (`_RATE_LIMIT_DELAY`) between each Gemini call (~12 RPM)
- On 429/RESOURCE_EXHAUSTED: clustering aborts run, price summaries stop batch
- Deferred assets retry on the next 30-min cycle

## Free Tier Capacity

Gemini 2.5 Flash free tier: 15 RPM, 1,500 RPD.

- Clustering: 1 call/run × 48 runs/day = 48 RPD
- Price summaries: 1 call/asset/hour × 24 hours = 24 RPD per asset
- **Max assets: (1,500 − 48) / 24 ≈ 60 assets**
- RPM and processing time are not binding constraints at this scale
