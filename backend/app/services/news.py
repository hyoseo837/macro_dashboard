import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import feedparser
import httpx
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import NewsFeed, NewsArticle, ArticleCluster, Widget, WidgetType

logger = logging.getLogger(__name__)

FEED_CATALOG: dict[str, dict] = {
    # BBC
    "bbc_world": {
        "source_name": "BBC",
        "topic": "global",
        "country": None,
        "feed_url": "https://feeds.bbci.co.uk/news/world/rss.xml",
    },
    "bbc_tech": {
        "source_name": "BBC",
        "topic": "technology",
        "country": None,
        "feed_url": "https://feeds.bbci.co.uk/news/technology/rss.xml",
    },
    "bbc_business": {
        "source_name": "BBC",
        "topic": "business",
        "country": None,
        "feed_url": "https://feeds.bbci.co.uk/news/business/rss.xml",
    },
    "bbc_science": {
        "source_name": "BBC",
        "topic": "science",
        "country": None,
        "feed_url": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    },
    "bbc_sports": {
        "source_name": "BBC",
        "topic": "sports",
        "country": None,
        "feed_url": "https://feeds.bbci.co.uk/news/sport/rss.xml",
    },
    "bbc_entertainment": {
        "source_name": "BBC",
        "topic": "entertainment",
        "country": None,
        "feed_url": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    },
    # CNN
    "cnn_world": {
        "source_name": "CNN",
        "topic": "global",
        "country": None,
        "feed_url": "http://rss.cnn.com/rss/edition_world.rss",
    },
    "cnn_tech": {
        "source_name": "CNN",
        "topic": "technology",
        "country": None,
        "feed_url": "http://rss.cnn.com/rss/edition_technology.rss",
    },
    "cnn_business": {
        "source_name": "CNN",
        "topic": "business",
        "country": None,
        "feed_url": "http://rss.cnn.com/rss/money_news_international.rss",
    },
    "cnn_entertainment": {
        "source_name": "CNN",
        "topic": "entertainment",
        "country": None,
        "feed_url": "http://rss.cnn.com/rss/edition_entertainment.rss",
    },
    "cnn_us": {
        "source_name": "CNN",
        "topic": "global",
        "country": "us",
        "feed_url": "http://rss.cnn.com/rss/edition_us.rss",
    },
    # Reuters
    "reuters_world": {
        "source_name": "Reuters",
        "topic": "global",
        "country": None,
        "feed_url": "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best",
    },
    "reuters_tech": {
        "source_name": "Reuters",
        "topic": "technology",
        "country": None,
        "feed_url": "https://www.reutersagency.com/feed/?best-topics=tech&post_type=best",
    },
    "reuters_business": {
        "source_name": "Reuters",
        "topic": "business",
        "country": None,
        "feed_url": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    },
    # NYT
    "nyt_world": {
        "source_name": "NYT",
        "topic": "global",
        "country": None,
        "feed_url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    },
    "nyt_tech": {
        "source_name": "NYT",
        "topic": "technology",
        "country": None,
        "feed_url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    },
    "nyt_business": {
        "source_name": "NYT",
        "topic": "business",
        "country": None,
        "feed_url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
    },
    "nyt_science": {
        "source_name": "NYT",
        "topic": "science",
        "country": None,
        "feed_url": "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
    },
    "nyt_us": {
        "source_name": "NYT",
        "topic": "global",
        "country": "us",
        "feed_url": "https://rss.nytimes.com/services/xml/rss/nyt/US.xml",
    },
    # Hacker News
    "hn": {
        "source_name": "Hacker News",
        "topic": "technology",
        "country": None,
        "feed_url": "https://hnrss.org/frontpage",
    },
    # Country-specific
    "korea_herald": {
        "source_name": "Korea Herald",
        "topic": "global",
        "country": "kr",
        "feed_url": "http://www.koreaherald.com/common/rss_xml.php?ct=102",
    },
    "cbc_world": {
        "source_name": "CBC",
        "topic": "global",
        "country": "ca",
        "feed_url": "https://www.cbc.ca/webfeed/rss/rss-topstories",
    },
}


async def activate_feed(db: AsyncSession, feed_key: str) -> Optional[NewsFeed]:
    catalog_entry = FEED_CATALOG.get(feed_key)
    if not catalog_entry:
        return None

    result = await db.execute(
        select(NewsFeed).where(NewsFeed.feed_key == feed_key)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    feed = NewsFeed(
        feed_key=feed_key,
        source_name=catalog_entry["source_name"],
        topic=catalog_entry["topic"],
        country=catalog_entry["country"],
        feed_url=catalog_entry["feed_url"],
    )
    db.add(feed)
    await db.flush()
    return feed


async def deactivate_orphan_feeds(db: AsyncSession) -> None:
    overall_result = await db.execute(
        select(Widget).where(
            Widget.type == WidgetType.news,
            Widget.config["mode"].astext == "overall",
        ).limit(1)
    )
    if overall_result.scalar_one_or_none():
        return

    topic_result = await db.execute(
        select(Widget.config["topic"].astext).where(
            Widget.type == WidgetType.news,
            Widget.config["mode"].astext == "topic",
        )
    )
    needed_topics = {row[0] for row in topic_result.all() if row[0]}

    single_result = await db.execute(
        select(Widget.config["feed_id"].astext).where(
            Widget.type == WidgetType.news,
        )
    )
    needed_feed_keys = {row[0] for row in single_result.all() if row[0]}

    for key, entry in FEED_CATALOG.items():
        if entry["topic"] in needed_topics:
            needed_feed_keys.add(key)

    result = await db.execute(select(NewsFeed))
    for feed in result.scalars().all():
        if feed.feed_key not in needed_feed_keys:
            await db.delete(feed)
            logger.info("Deactivated orphan feed: %s", feed.feed_key)


async def fetch_feed(db: AsyncSession, feed: NewsFeed) -> int:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(feed.feed_url, follow_redirects=True)
            resp.raise_for_status()
    except Exception:
        logger.warning("Failed to fetch feed %s: %s", feed.feed_key, feed.feed_url)
        return 0

    parsed = feedparser.parse(resp.text)
    count = 0

    for entry in parsed.entries:
        url = getattr(entry, "link", None)
        title = getattr(entry, "title", None)
        if not url or not title:
            continue

        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            except Exception:
                pass

        stmt = pg_insert(NewsArticle).values(
            feed_id=feed.id,
            title=title.strip(),
            url=url,
            source_name=feed.source_name,
            published_at=published_at,
        ).on_conflict_do_update(
            index_elements=["url"],
            set_={"title": title.strip(), "published_at": published_at},
        )
        await db.execute(stmt)
        count += 1

    feed.last_fetched_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info("Fetched %d articles from %s", count, feed.feed_key)
    return count


async def refresh_all_feeds(db: AsyncSession) -> None:
    result = await db.execute(select(NewsFeed))
    feeds = result.scalars().all()

    for feed in feeds:
        await fetch_feed(db, feed)

    await db.commit()


async def cleanup_old_articles(db: AsyncSession) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        delete(NewsArticle).where(NewsArticle.fetched_at < cutoff)
    )
    cluster_result = await db.execute(
        delete(ArticleCluster).where(ArticleCluster.expires_at < datetime.now(timezone.utc))
    )
    await db.commit()
    logger.info("Cleaned up %d old articles, %d expired clusters", result.rowcount, cluster_result.rowcount)
