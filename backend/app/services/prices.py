import yfinance as yf
from datetime import datetime, timedelta
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
import logging

from ..models import Asset, PriceSnapshot
from ..config import settings

logger = logging.getLogger(__name__)

def _fetch_price_data_sync(symbol: str):
    """Synchronous yfinance fetch — run via asyncio.to_thread."""
    ticker = yf.Ticker(symbol)

    info = ticker.fast_info
    current_price = info.last_price
    prev_close = info.previous_close

    change_abs = current_price - prev_close
    change_pct = (change_abs / prev_close) * 100 if prev_close != 0 else 0

    day_high = getattr(info, 'day_high', None)
    day_low = getattr(info, 'day_low', None)
    volume = getattr(info, 'last_volume', None)
    if volume is not None:
        volume = int(volume)

    hist = ticker.history(period="45d", interval="1d")
    last_30 = hist.tail(30)

    sparkline = [
        {"date": index.strftime("%Y-%m-%d"), "price": float(row['Close'])}
        for index, row in last_30.iterrows()
    ]

    return {
        "price": current_price,
        "change_abs": change_abs,
        "change_pct": change_pct,
        "previous_close": prev_close,
        "sparkline": sparkline,
        "day_high": day_high,
        "day_low": day_low,
        "volume": volume,
        "fetched_at": datetime.utcnow()
    }

async def fetch_price_data(symbol: str):
    """Fetch live price and 30-day sparkline with dates from yfinance."""
    try:
        return await asyncio.to_thread(_fetch_price_data_sync, symbol)
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {e}")
        return None

async def refresh_single_price(db: AsyncSession, asset: Asset):
    data = await fetch_price_data(asset.symbol)
    if data:
        stmt = insert(PriceSnapshot).values(
            asset_id=asset.id,
            **data
        ).on_conflict_do_update(
            index_elements=['asset_id'],
            set_=data
        )
        await db.execute(stmt)
        logger.info(f"Refreshed price for {asset.id} ({asset.symbol})")

async def refresh_all_prices(db: AsyncSession):
    """Job to refresh all asset prices in the background."""
    result = await db.execute(select(Asset))
    assets = result.scalars().all()
    
    for asset in assets:
        data = await fetch_price_data(asset.symbol)
        if data:
            stmt = insert(PriceSnapshot).values(
                asset_id=asset.id,
                **data
            ).on_conflict_do_update(
                index_elements=['asset_id'],
                set_=data
            )
            await db.execute(stmt)
            logger.info(f"Refreshed price for {asset.id} ({asset.symbol})")
        
    await db.commit()
