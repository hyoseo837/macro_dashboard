from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Asset, Widget, WidgetType

DEFAULT_ASSETS = [
    {"id": "AAPL", "display_name": "Apple Inc.", "symbol": "AAPL", "category": "equity", "currency": "USD"},
    {"id": "MSFT", "display_name": "Microsoft Corporation", "symbol": "MSFT", "category": "equity", "currency": "USD"},
    {"id": "BTC-USD", "display_name": "Bitcoin USD", "symbol": "BTC-USD", "category": "crypto", "currency": "USD"},
]

DEFAULT_WIDGETS = [
    {"type": WidgetType.time, "config": {"timezone": "America/New_York", "label": "New York"}, "x": 0},
    {"type": WidgetType.asset, "config": {"asset_id": "AAPL", "label": "Apple"}, "x": 1},
    {"type": WidgetType.asset, "config": {"asset_id": "MSFT", "label": "Microsoft"}, "x": 2},
    {"type": WidgetType.asset, "config": {"asset_id": "BTC-USD", "label": "Bitcoin"}, "x": 3},
]


async def seed_default_widgets(db: AsyncSession, user_id: int) -> None:
    for asset_data in DEFAULT_ASSETS:
        result = await db.execute(select(Asset).where(Asset.id == asset_data["id"]))
        if not result.scalar_one_or_none():
            db.add(Asset(**asset_data))

    for w in DEFAULT_WIDGETS:
        db.add(Widget(
            user_id=user_id,
            type=w["type"],
            config=w["config"],
            layout_x=w["x"],
            layout_y=0,
            layout_w=1,
            layout_h=1,
        ))

    await db.flush()
