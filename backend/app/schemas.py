from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from .models import WidgetType

class AssetSchema(BaseModel):
    id: str
    display_name: str
    symbol: str
    category: str
    currency: str

    class Config:
        from_attributes = True

class AssetCreateSchema(BaseModel):
    display_name: str
    symbol: str
    category: str
    currency: str

class WidgetSchema(BaseModel):
    id: int
    type: WidgetType
    config: Dict[str, Any]
    layout_x: int
    layout_y: int
    layout_w: int
    layout_h: int

    class Config:
        from_attributes = True

class WidgetCreateSchema(BaseModel):
    type: WidgetType
    config: Dict[str, Any]
    layout_x: int = 0
    layout_y: int = 0
    layout_w: int = 1
    layout_h: int = 1

class WidgetUpdateSchema(BaseModel):
    config: Optional[Dict[str, Any]] = None
    layout_x: Optional[int] = None
    layout_y: Optional[int] = None
    layout_w: Optional[int] = None
    layout_h: Optional[int] = None

class LayoutItemSchema(BaseModel):
    id: int
    layout_x: int
    layout_y: int
    layout_w: int
    layout_h: int

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
