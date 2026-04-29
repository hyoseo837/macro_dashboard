from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from typing import List, Optional

from ..db import get_db
from ..models import NewsArticle
from ..schemas import NewsFeedCatalogSchema, NewsArticleSchema
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


@router.get("/articles", response_model=List[NewsArticleSchema])
async def list_articles(
    feed_id: str = Query(..., description="Feed key from catalog"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    from ..models import NewsFeed

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
