from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String)
    symbol: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    currency: Mapped[str] = mapped_column(String)

    snapshot: Mapped["PriceSnapshot"] = relationship(back_populates="asset", cascade="all, delete-orphan", uselist=False)

class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"

    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), primary_key=True)
    price: Mapped[float] = mapped_column(Numeric)
    change_abs: Mapped[float] = mapped_column(Numeric)
    change_pct: Mapped[float] = mapped_column(Numeric)
    previous_close: Mapped[float] = mapped_column(Numeric)
    sparkline: Mapped[List[float]] = mapped_column(JSONB)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    asset: Mapped["Asset"] = relationship(back_populates="snapshot")
