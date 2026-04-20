from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..db import get_db
from ..models import Asset
from ..schemas import AssetSchema

router = APIRouter()

@router.get("/assets", response_model=List[AssetSchema])
async def list_assets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Asset))
    return result.scalars().all()
