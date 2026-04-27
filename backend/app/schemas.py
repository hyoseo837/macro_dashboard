from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime
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
    sparkline: List[Dict[str, Any]]
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    volume: Optional[int] = None

    class Config:
        from_attributes = True


# ── Auth schemas ──

class RegisterSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    birth_date: Optional[date] = None
    invite_code: str

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserSchema(BaseModel):
    id: int
    email: str
    birth_date: Optional[date] = None
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class InviteCodeCreateSchema(BaseModel):
    code: str
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None

class InviteCodeSchema(BaseModel):
    id: int
    code: str
    created_by: int
    max_uses: Optional[int] = None
    use_count: int
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserAdminSchema(BaseModel):
    id: int
    email: str
    birth_date: Optional[date] = None
    is_admin: bool
    created_at: datetime
    widget_count: int

    class Config:
        from_attributes = True
