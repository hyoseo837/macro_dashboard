import re
import asyncio
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..db import get_db, SessionLocal
from ..models import Asset
from ..schemas import AssetSchema, AssetCreateSchema, AssetUpdateSchema
from ..services.prices import refresh_single_price

QUOTE_TYPE_MAP = {
    "EQUITY": "equity",
    "ETF": "etf",
    "CRYPTOCURRENCY": "crypto",
    "CURRENCY": "fx",
    "FUTURE": "commodity",
    "MUTUALFUND": "etf",
    "INDEX": "equity",
}

router = APIRouter()

@router.get("/assets", response_model=List[AssetSchema])
async def list_assets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Asset))
    return result.scalars().all()

@router.get("/assets/search")
async def search_symbols(q: str = Query(..., min_length=1)):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://query2.finance.yahoo.com/v1/finance/search",
            params={"q": q, "quotesCount": 8, "newsCount": 0, "enableFuzzyQuery": False},
            headers={"User-Agent": "Mozilla/5.0"},
        )
    if resp.status_code != 200:
        return []
    quotes = resp.json().get("quotes", [])
    results = []
    for quote in quotes:
        quote_type = quote.get("quoteType", "")
        category = QUOTE_TYPE_MAP.get(quote_type)
        if not category:
            continue
        results.append({
            "symbol": quote.get("symbol", ""),
            "name": quote.get("shortname") or quote.get("longname") or "",
            "category": category,
            "exchange": quote.get("exchange") or "",
        })
    return results

def _lookup_currency_sync(symbol: str) -> str:
    import yfinance as yf
    try:
        return yf.Ticker(symbol).fast_info.get("currency", "USD") or "USD"
    except Exception:
        return "USD"

@router.get("/assets/currency")
async def get_currency(symbol: str = Query(..., min_length=1)):
    currency = await asyncio.to_thread(_lookup_currency_sync, symbol)
    return {"currency": currency}

@router.post("/assets", response_model=AssetSchema, status_code=201)
async def create_asset(body: AssetCreateSchema, db: AsyncSession = Depends(get_db)):
    asset_id = re.sub(r'[^a-z0-9]+', '_', body.symbol.lower()).strip('_')
    existing = await db.execute(select(Asset).where(Asset.id == asset_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Asset already exists")

    asset = Asset(
        id=asset_id,
        display_name=body.display_name,
        symbol=body.symbol,
        category=body.category,
        currency=body.currency,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    async def _fetch_in_background():
        async with SessionLocal() as bg_db:
            result = await bg_db.execute(select(Asset).where(Asset.id == asset_id))
            bg_asset = result.scalar_one_or_none()
            if bg_asset:
                await refresh_single_price(bg_db, bg_asset)
                await bg_db.commit()

    asyncio.ensure_future(_fetch_in_background())
    return asset

@router.patch("/assets/{asset_id}", response_model=AssetSchema)
async def update_asset(asset_id: str, body: AssetUpdateSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.display_name = body.display_name
    await db.commit()
    await db.refresh(asset)
    return asset

@router.delete("/assets/{asset_id}", status_code=204)
async def delete_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.delete(asset)
    await db.commit()
