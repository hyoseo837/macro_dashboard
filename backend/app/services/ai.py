import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from google import genai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import NewsArticle, ArticleCluster, NewsFeed

logger = logging.getLogger(__name__)

_RATE_LIMIT_DELAY = 4.0


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
    except Exception:
        logger.warning("Gemini clustering failed", exc_info=True)

    await db.flush()
    logger.info("Clustered %d articles into events", count)
    return count


async def run_ai_pipeline(db: AsyncSession) -> None:
    if not is_ai_enabled():
        logger.info("AI features disabled (no GEMINI_API_KEY)")
        return

    cluster_count = await cluster_articles(db)
    await db.commit()
    logger.info("AI pipeline complete: %d articles clustered", cluster_count)
