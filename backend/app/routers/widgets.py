import asyncio
from zoneinfo import available_timezones

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from ..auth import get_current_user
from ..db import get_db
from ..models import Widget, Asset, WidgetType, User
from ..schemas import WidgetSchema, WidgetCreateSchema, WidgetUpdateSchema, LayoutItemSchema
from ..services.default_widgets import PROTECTED_ASSET_IDS
from ..services.news import FEED_CATALOG, activate_feed, deactivate_orphan_feeds, fetch_feed

VALID_TIMEZONES = available_timezones()

router = APIRouter()


async def _fetch_new_feed(feed_key: str) -> None:
    from ..db import SessionLocal
    from ..models import NewsFeed
    async with SessionLocal() as db:
        result = await db.execute(select(NewsFeed).where(NewsFeed.feed_key == feed_key))
        feed = result.scalar_one_or_none()
        if feed:
            await fetch_feed(db, feed)
            await db.commit()


async def _fetch_all_new_feeds() -> None:
    from ..db import SessionLocal
    from ..models import NewsFeed
    async with SessionLocal() as db:
        result = await db.execute(
            select(NewsFeed).where(NewsFeed.last_fetched_at.is_(None))
        )
        for feed in result.scalars().all():
            await fetch_feed(db, feed)
        await db.commit()


@router.get("/timezones")
async def list_timezones():
    return sorted(VALID_TIMEZONES)


@router.get("/widgets", response_model=List[WidgetSchema])
async def list_widgets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Widget)
        .where(Widget.user_id == user.id)
        .order_by(Widget.layout_y, Widget.layout_x)
    )
    return result.scalars().all()


@router.post("/widgets", response_model=WidgetSchema, status_code=201)
async def create_widget(
    body: WidgetCreateSchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.type == WidgetType.asset:
        asset_id = body.config.get("asset_id")
        if not asset_id:
            raise HTTPException(status_code=422, detail="asset widget requires config.asset_id")
        result = await db.execute(select(Asset).where(Asset.id == asset_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found")

    elif body.type == WidgetType.time:
        tz = body.config.get("timezone")
        if not tz or tz not in VALID_TIMEZONES:
            raise HTTPException(status_code=422, detail="time widget requires a valid config.timezone")

    elif body.type == WidgetType.news:
        mode = body.config.get("mode", "single")
        needs_fetch = False

        if mode == "single" or mode not in ("single", "topic", "overall"):
            feed_id = body.config.get("feed_id")
            if not feed_id or feed_id not in FEED_CATALOG:
                raise HTTPException(status_code=422, detail="news widget requires a valid config.feed_id")
            feed = await activate_feed(db, feed_id)
            needs_fetch = feed is not None and not feed.last_fetched_at

        elif mode == "topic":
            topic = body.config.get("topic")
            valid_topics = set(entry["topic"] for entry in FEED_CATALOG.values())
            if not topic or topic not in valid_topics:
                raise HTTPException(status_code=422, detail="news widget requires a valid config.topic")
            for key, entry in FEED_CATALOG.items():
                if entry["topic"] == topic:
                    feed = await activate_feed(db, key)
                    if feed and not feed.last_fetched_at:
                        needs_fetch = True

        elif mode == "overall":
            for key in FEED_CATALOG:
                feed = await activate_feed(db, key)
                if feed and not feed.last_fetched_at:
                    needs_fetch = True
    else:
        needs_fetch = False

    widget = Widget(
        user_id=user.id,
        type=body.type,
        config=body.config,
        layout_x=body.layout_x,
        layout_y=body.layout_y,
        layout_w=body.layout_w,
        layout_h=body.layout_h,
    )
    db.add(widget)
    await db.commit()
    await db.refresh(widget)

    if needs_fetch:
        mode = body.config.get("mode", "single") if body.type == WidgetType.news else None
        if mode == "single" or mode is None:
            asyncio.create_task(_fetch_new_feed(body.config["feed_id"]))
        elif mode in ("topic", "overall"):
            asyncio.create_task(_fetch_all_new_feeds())

    return widget


@router.patch("/widgets/{widget_id}", response_model=WidgetSchema)
async def update_widget(
    widget_id: int,
    body: WidgetUpdateSchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Widget).where(Widget.id == widget_id, Widget.user_id == user.id)
    )
    widget = result.scalar_one_or_none()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if body.config is not None:
        widget.config = body.config
    if body.layout_x is not None:
        widget.layout_x = body.layout_x
    if body.layout_y is not None:
        widget.layout_y = body.layout_y
    if body.layout_w is not None:
        widget.layout_w = body.layout_w
    if body.layout_h is not None:
        widget.layout_h = body.layout_h

    await db.commit()
    await db.refresh(widget)
    return widget


@router.delete("/widgets/{widget_id}", status_code=204)
async def delete_widget(
    widget_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Widget).where(Widget.id == widget_id, Widget.user_id == user.id)
    )
    widget = result.scalar_one_or_none()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    asset_id = None
    is_news = widget.type == WidgetType.news
    if widget.type == WidgetType.asset:
        asset_id = widget.config.get("asset_id")

    await db.delete(widget)
    await db.flush()

    if asset_id and asset_id not in PROTECTED_ASSET_IDS:
        count_result = await db.execute(
            select(func.count())
            .select_from(Widget)
            .where(Widget.config["asset_id"].astext == asset_id)
        )
        remaining = count_result.scalar()
        if remaining == 0:
            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if asset:
                await db.delete(asset)

    if is_news:
        await deactivate_orphan_feeds(db)

    await db.commit()


@router.put("/widgets/layout")
async def update_layout(
    items: List[LayoutItemSchema],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    widget_ids = [item.id for item in items]
    result = await db.execute(
        select(Widget).where(Widget.id.in_(widget_ids), Widget.user_id == user.id)
    )
    widgets = {w.id: w for w in result.scalars().all()}

    for item in items:
        widget = widgets.get(item.id)
        if not widget:
            continue
        widget.layout_x = item.layout_x
        widget.layout_y = item.layout_y
        widget.layout_w = item.layout_w
        widget.layout_h = item.layout_h

    await db.commit()
    return {"status": "ok"}
