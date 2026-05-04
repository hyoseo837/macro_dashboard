import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from google import genai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import NewsArticle, ArticleCluster, NewsFeed, PriceSnapshot, Asset

logger = logging.getLogger(__name__)

_RATE_LIMIT_DELAY = 5.0


def is_ai_enabled() -> bool:
    return bool(settings.GEMINI_API_KEY)


def _get_client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def _build_cluster_prompt(articles: list[NewsArticle]) -> str:
    lines = []
    for i, a in enumerate(articles):
        lines.append(f'{i}: "{a.title}" ({a.source_name})')
    headlines = "\n".join(lines)
    return (
        "Group these headlines by event. For each group, write a SHORT summary (under 15 words). "
        "Focus only on what happened and why. No background, no impact, no elaboration.\n\n"
        "Good: \"Oil prices surge as US strikes Iranian refineries\"\n"
        "Bad: \"The ongoing war in Iran is significantly impacting global oil prices, the US economy, and congressional actions\"\n\n"
        "Rules:\n"
        "- Group headlines covering the SAME event\n"
        "- Single headlines that don't match others get their own group\n"
        "- Return JSON: [{\"summary\": \"...\", \"indices\": [0, 3, 7]}, ...]\n"
        "- Return ONLY the JSON array\n\n"
        f"Headlines:\n{headlines}"
    )


async def cluster_articles(db: AsyncSession) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    result = await db.execute(
        select(NewsArticle)
        .where(
            NewsArticle.fetched_at >= cutoff,
            NewsArticle.cluster_id.is_(None),
        )
        .order_by(NewsArticle.published_at.desc().nullslast())
        .limit(100)
    )
    articles = list(result.scalars().all())
    if not articles:
        return 0

    client = _get_client()
    count = 0

    prompt = _build_cluster_prompt(articles)
    try:
        response = await asyncio.to_thread(
            client.models.generate_content, model="gemini-2.5-flash", contents=prompt
        )
        text = _strip_code_fence(response.text)
        groups = json.loads(text)
        if not isinstance(groups, list):
            logger.warning("Gemini returned non-list for clustering")
            return 0

        for group in groups:
            if not isinstance(group, dict):
                continue
            summary = group.get("summary", "")
            indices = group.get("indices", [])
            valid_indices = [i for i in indices if isinstance(i, int) and 0 <= i < len(articles)]
            if not valid_indices or not summary:
                continue

            first_article = articles[valid_indices[0]]
            feed_result = await db.execute(
                select(NewsFeed.topic).where(NewsFeed.id == first_article.feed_id)
            )
            topic = feed_result.scalar_one_or_none()

            cluster = ArticleCluster(
                label=summary[:200],
                summary=summary[:500],
                topic=topic,
                article_count=len(valid_indices),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
            db.add(cluster)
            await db.flush()

            for idx in valid_indices:
                articles[idx].cluster_id = cluster.id
                count += 1
    except Exception as e:
        logger.warning("Gemini clustering failed: %s", e)
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise

    await db.flush()
    logger.info("Clustered %d articles into events", count)
    return count


def _build_price_summary_prompt(
    asset_name: str,
    symbol: str,
    sparkline: list,
    recent_headlines: list[str],
) -> str:
    if not sparkline or len(sparkline) < 2:
        return ""

    prices = [p["price"] if isinstance(p, dict) else p for p in sparkline]
    week_ago = prices[0] if len(prices) >= 5 else prices[0]
    current = prices[-1]
    change_pct = ((current - week_ago) / week_ago) * 100 if week_ago else 0
    direction = "rose" if change_pct > 0 else "fell" if change_pct < 0 else "flat"

    headlines_text = "\n".join(f"- {h}" for h in recent_headlines[:30]) if recent_headlines else "(no recent headlines)"

    return (
        f"Asset: {asset_name} ({symbol})\n"
        f"Price {direction} {abs(change_pct):.1f}% over the past week "
        f"(from {week_ago:.2f} to {current:.2f}).\n\n"
        f"Recent news headlines:\n{headlines_text}\n\n"
        "Write ONE sentence (under 20 words) explaining why this price moved. "
        "Reference specific events if relevant (e.g. 'Fed rate hike', 'Iran strikes', 'Trump tariff announcement'). "
        "If the change is tiny (<1%) or no clear cause exists, write a brief market context instead.\n"
        "Return ONLY the sentence, no quotes, no prefix."
    )


async def generate_price_summaries(db: AsyncSession) -> int:
    from sqlalchemy.orm import joinedload

    result = await db.execute(
        select(PriceSnapshot).options(joinedload(PriceSnapshot.asset))
    )
    snapshots = list(result.scalars().all())
    if not snapshots:
        return 0

    now = datetime.now(timezone.utc)
    cutoff_48h = now - timedelta(hours=48)

    # Queue: no summary first, then oldest summary first, skip fresh (<1hr)
    queue = []
    for snap in snapshots:
        if snap.summary_updated_at and (now - snap.summary_updated_at).total_seconds() < 3600:
            continue
        if not snap.sparkline or len(snap.sparkline) < 2:
            continue
        queue.append(snap)

    queue.sort(key=lambda s: (
        s.summary_updated_at is not None,
        s.summary_updated_at or datetime.min.replace(tzinfo=timezone.utc),
    ))

    if not queue:
        return 0

    headline_result = await db.execute(
        select(NewsArticle.title)
        .where(NewsArticle.fetched_at >= cutoff_48h)
        .order_by(NewsArticle.published_at.desc().nullslast())
        .limit(60)
    )
    recent_headlines = [row[0] for row in headline_result.all()]

    client = _get_client()
    count = 0

    for snap in queue:
        prompt = _build_price_summary_prompt(
            snap.asset.display_name,
            snap.asset.symbol,
            snap.sparkline or [],
            recent_headlines,
        )

        try:
            await asyncio.sleep(_RATE_LIMIT_DELAY)
            response = await asyncio.to_thread(
                client.models.generate_content, model="gemini-2.5-flash", contents=prompt
            )
            summary = response.text.strip().strip('"').strip("'")
            if summary:
                snap.summary = summary[:500]
                snap.summary_updated_at = now
                count += 1
        except Exception as e:
            logger.warning("Gemini price summary failed for %s: %s", snap.asset_id, e)
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                logger.info("Rate limit hit after %d summaries, %d remaining in queue", count, len(queue) - count - 1)
                break

    await db.flush()
    logger.info("Price summaries: %d generated, %d in queue", count, len(queue))
    return count


async def run_ai_pipeline(db: AsyncSession) -> None:
    if not is_ai_enabled():
        logger.info("AI features disabled (no GEMINI_API_KEY)")
        return

    try:
        cluster_count = await cluster_articles(db)
        await db.commit()
    except Exception:
        logger.info("Clustering hit rate limit, skipping price summaries this run")
        return

    summary_count = await generate_price_summaries(db)
    await db.commit()

    logger.info("AI pipeline complete: %d articles clustered, %d price summaries", cluster_count, summary_count)
