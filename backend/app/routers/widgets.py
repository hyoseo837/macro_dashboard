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

VALID_TIMEZONES = available_timezones()

router = APIRouter()


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
