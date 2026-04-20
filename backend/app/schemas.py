from pydantic import BaseModel
from typing import List, Optional, Dict, Any
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
    id: str
    symbol: str
    price: float
    currency: str
    change_abs: float
    change_pct: float
    as_of: datetime
    sparkline: List[Dict[str, Any]] # Changed from List[float] to List[Dict]

    class Config:
        from_attributes = True
