from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AssetSchema(BaseModel):
    id: str
    display_name: str
    symbol: str
    category: str
    currency: str

    class Config:
        from_attributes = True

class PriceSnapshotSchema(BaseModel):
    id: str  # maps to asset_id
    symbol: str
    price: float
    currency: str
    change_abs: float
    change_pct: float
    as_of: datetime  # maps to fetched_at
    sparkline: List[float]

    class Config:
        from_attributes = True
