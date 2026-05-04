# AI Pipeline — Gemini Integration

Backend service: `backend/app/services/ai.py`

## Overview

Two-stage pipeline using Gemini 3 Flash via `google-genai`. Runs every 30 min (5 min after startup). Disabled when `GEMINI_API_KEY` is empty.

## Model Choice

**Current: Gemini 3 Flash** (`gemini-3-flash-preview`)

Evaluated 2026-05-04. Considered models:

| Model | Input/M | Output/M | Notes |
|-------|---------|----------|-------|
| Gemini 2.5 Flash | $0.15 | $0.60 | Previous model. Cheapest, fast, adequate quality |
| Gemini 2.5 Pro | $1.25 | $10.00 | Overkill for one-liners, deep reasoning unnecessary |
| Gemini 3 Flash | $0.50 | $3.00 | Better causal reasoning than 2.5 Flash, same speed class |
| GPT-4o-mini | $0.15 | $0.60 | Would require rewrite to OpenAI SDK |
| DeepSeek V3 | $0.14 | $0.28 | Cheapest but inconsistent on short-form, China-hosted latency |

**Why 3 Flash**: The task is short causal summarization ("why did gold go up?"). All budget models perform similarly on simple tasks, but 3 Flash has noticeably better reasoning for connecting news events to price movements. Cost difference is negligible at our scale (~$0.15/mo for 7 assets vs ~$0.05/mo with 2.5 Flash).

## Grounding (Google Search) — Deferred

Gemini supports a grounding tool that lets the model search the web mid-request ($14/1,000 searches, 5,000 free/month).

**Why not now**: With 7 assets × 24/day = ~5,040 searches/month — barely fits free tier. At scale (60 assets = 43,200/month), grounding costs ~$535/mo. Not worth it yet.

**When to add**: When the service expands and revenue justifies it. The model currently relies on headlines from the `news_articles` table (last 48h) as context. If summaries become noticeably wrong due to missing news coverage, grounding is the fix.

**Implementation when ready**: Add `tools=[types.Tool(google_search=types.GoogleSearch())]` to the `generate_content` config for price summaries only (clustering doesn't need it).

## Stage 1: Article Clustering (`cluster_articles`)

- Groups recent headlines by event (single Gemini call, up to 100 articles)
- Generates a short one-liner summary per cluster (under 15 words)
- Stored in `ArticleCluster.summary`
- Only processes unclustered articles from the last 48 hours
- If rate-limited (429), re-raises to abort the entire pipeline run
- Does NOT need grounding — works with existing headlines

## Stage 2: Price Summaries (`generate_price_summaries`)

- Processes all eligible assets in a priority queue (no batch cap)
- Generates one-liner explaining the weekly price movement using news context
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

## Capacity (Paid Tier)

Paid Tier 1: 2,000 RPM, 10,000 RPD — effectively unlimited for our use case.

- Clustering: 1 call/run × 48 runs/day = 48 RPD
- Price summaries: 1 call/asset/hour × 24 hours = 24 RPD per asset
- At 60 assets: 48 + 1,440 = 1,488 RPD, well within limits
- Monthly cost at 60 assets: ~$2/mo (model tokens only)
