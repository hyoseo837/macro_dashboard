import enum
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import String, Integer, BigInteger, Boolean, Date, Numeric, ForeignKey, DateTime, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    widgets: Mapped[List["Widget"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    max_uses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    use_count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator: Mapped["User"] = relationship()


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship()


class WidgetType(str, enum.Enum):
    asset = "asset"
    time = "time"
    news = "news"

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
    day_high: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    day_low: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    volume: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    summary: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    summary_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    asset: Mapped["Asset"] = relationship(back_populates="snapshot")

class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    type: Mapped[WidgetType] = mapped_column(SQLEnum(WidgetType, name="widget_type"))
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    layout_x: Mapped[int] = mapped_column(Integer, default=0)
    layout_y: Mapped[int] = mapped_column(Integer, default=0)
    layout_w: Mapped[int] = mapped_column(Integer, default=1)
    layout_h: Mapped[int] = mapped_column(Integer, default=1)

    owner: Mapped["User"] = relationship(back_populates="widgets")


class NewsFeed(Base):
    __tablename__ = "news_feeds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    feed_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    source_name: Mapped[str] = mapped_column(String)
    topic: Mapped[str] = mapped_column(String)
    country: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    feed_url: Mapped[str] = mapped_column(String)
    last_fetched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    articles: Mapped[List["NewsArticle"]] = relationship(back_populates="feed", cascade="all, delete-orphan")


class ArticleCluster(Base):
    __tablename__ = "article_clusters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String)
    summary: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    topic: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    article_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    articles: Mapped[List["NewsArticle"]] = relationship(back_populates="cluster")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    feed_id: Mapped[int] = mapped_column(ForeignKey("news_feeds.id"))
    title: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String, unique=True, index=True)
    source_name: Mapped[str] = mapped_column(String)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cluster_id: Mapped[Optional[int]] = mapped_column(ForeignKey("article_clusters.id", ondelete="SET NULL"), nullable=True, index=True)
    duplicate_of_id: Mapped[Optional[int]] = mapped_column(ForeignKey("news_articles.id", ondelete="SET NULL"), nullable=True, index=True)

    feed: Mapped["NewsFeed"] = relationship(back_populates="articles")
    cluster: Mapped[Optional["ArticleCluster"]] = relationship(back_populates="articles")
    duplicate_of: Mapped[Optional["NewsArticle"]] = relationship(remote_side=[id])
