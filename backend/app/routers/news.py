from datetime import datetime, timezone

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from typing import List

from ..db import get_db
from ..models import NewsArticle, NewsFeed, ArticleCluster
from ..schemas import NewsFeedCatalogSchema, NewsArticleSchema, ClusteredArticleSchema
from ..services.news import FEED_CATALOG

router = APIRouter(prefix="/news", tags=["news"])


@router.get("/catalog", response_model=List[NewsFeedCatalogSchema])
async def list_catalog():
    return [
        NewsFeedCatalogSchema(
            feed_key=key,
            source_name=entry["source_name"],
            topic=entry["topic"],
            country=entry.get("country"),
        )
        for key, entry in FEED_CATALOG.items()
    ]


@router.get("/ai-status")
async def ai_status():
    from ..services.ai import is_ai_enabled
    return {"ai_enabled": is_ai_enabled()}


@router.get("/topics")
async def list_topics():
    topics = sorted(set(entry["topic"] for entry in FEED_CATALOG.values()))
    return topics


@router.get("/articles", response_model=List[NewsArticleSchema])
async def list_articles(
    feed_id: str = Query(..., description="Feed key from catalog"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NewsFeed).where(NewsFeed.feed_key == feed_id)
    )
    feed = result.scalar_one_or_none()
    if not feed:
        return []

    result = await db.execute(
        select(NewsArticle)
        .where(NewsArticle.feed_id == feed.id)
        .order_by(NewsArticle.published_at.desc().nullslast())
        .limit(limit)
    )
    return result.scalars().all()


async def _build_clustered_response(
    db: AsyncSession,
    topic_filter: str | None,
    limit: int,
) -> list[ClusteredArticleSchema]:
    now = datetime.now(timezone.utc)

    cluster_query = (
        select(ArticleCluster)
        .where(ArticleCluster.expires_at > now)
    )
    if topic_filter:
        cluster_query = cluster_query.where(ArticleCluster.topic == topic_filter)
    cluster_query = cluster_query.order_by(
        ArticleCluster.article_count.desc(),
        ArticleCluster.created_at.desc(),
    ).limit(limit)

    clusters_result = await db.execute(cluster_query)
    clusters = clusters_result.scalars().all()

    result = []
    seen_ids: set[int] = set()

    for cluster in clusters:
        articles_result = await db.execute(
            select(NewsArticle)
            .where(NewsArticle.cluster_id == cluster.id)
            .order_by(NewsArticle.published_at.desc().nullslast())
        )
        articles = articles_result.scalars().all()
        if articles:
            result.append(ClusteredArticleSchema(
                cluster_id=cluster.id,
                cluster_label=cluster.label,
                summary=cluster.summary,
                articles=articles,
            ))
            seen_ids.update(a.id for a in articles)

    remaining = limit - len(result)
    if remaining > 0:
        unclustered_query = select(NewsArticle).where(
            NewsArticle.cluster_id.is_(None),
        )
        if topic_filter:
            unclustered_query = unclustered_query.join(
                NewsFeed, NewsArticle.feed_id == NewsFeed.id
            ).where(NewsFeed.topic == topic_filter)
        if seen_ids:
            unclustered_query = unclustered_query.where(~NewsArticle.id.in_(seen_ids))
        unclustered_query = (
            unclustered_query
            .order_by(NewsArticle.published_at.desc().nullslast())
            .limit(remaining)
        )
        unclustered_result = await db.execute(unclustered_query)
        for article in unclustered_result.scalars().all():
            result.append(ClusteredArticleSchema(
                cluster_id=None,
                cluster_label=None,
                summary=None,
                articles=[article],
            ))

    return result


@router.get("/articles/topic", response_model=List[ClusteredArticleSchema])
async def list_topic_articles(
    topic: str = Query(..., description="Topic from catalog"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await _build_clustered_response(db, topic_filter=topic, limit=limit)


@router.get("/articles/clustered", response_model=List[ClusteredArticleSchema])
async def list_clustered_articles(
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await _build_clustered_response(db, topic_filter=None, limit=limit)
