from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List

from ..db import get_db
from ..models import Asset, PriceSnapshot
from ..schemas import PriceSnapshotSchema

router = APIRouter()

@router.get("/prices", response_model=List[PriceSnapshotSchema])
async def list_prices(db: AsyncSession = Depends(get_db)):
    # Join Asset and PriceSnapshot to get all required fields
    result = await db.execute(
        select(PriceSnapshot).options(joinedload(PriceSnapshot.asset))
    )
    snapshots = result.scalars().all()
    
    # Map to schema shape expected by API.md
    return [
        {
            "id": s.asset_id,
            "symbol": s.asset.symbol,
            "price": float(s.price),
            "currency": s.asset.currency,
            "change_abs": float(s.change_abs),
            "change_pct": float(s.change_pct),
            "as_of": s.fetched_at,
            "sparkline": s.sparkline,
            "day_high": float(s.day_high) if s.day_high is not None else None,
            "day_low": float(s.day_low) if s.day_low is not None else None,
            "volume": s.volume,
        }
        for s in snapshots
    ]
