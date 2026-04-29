from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import logging

from .config import settings
from .db import SessionLocal
from .routers import admin, assets, auth, news, prices, widgets
from .services.default_widgets import ensure_default_assets
from .services.news import cleanup_old_articles, refresh_all_feeds
from .services.prices import refresh_all_prices

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="macro_dashboard API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, tags=["auth"])
app.include_router(admin.router, tags=["admin"])
app.include_router(assets.router, tags=["assets"])
app.include_router(prices.router, tags=["prices"])
app.include_router(widgets.router, tags=["widgets"])
app.include_router(news.router)

@app.on_event("startup")
async def startup_event():
    scheduler = AsyncIOScheduler()

    async def scheduled_price_refresh():
        async with SessionLocal() as db:
            await refresh_all_prices(db)

    async def scheduled_news_refresh():
        async with SessionLocal() as db:
            await refresh_all_feeds(db)

    async def scheduled_news_cleanup():
        async with SessionLocal() as db:
            await cleanup_old_articles(db)

    # Ensure default assets exist so they get price data
    async with SessionLocal() as db:
        await ensure_default_assets(db)
        await db.commit()

    # Refresh immediately on startup
    asyncio.create_task(scheduled_price_refresh())
    asyncio.create_task(scheduled_news_refresh())

    # Schedule recurring jobs
    scheduler.add_job(scheduled_price_refresh, 'interval', minutes=15)
    scheduler.add_job(scheduled_news_refresh, 'interval', minutes=60)
    scheduler.add_job(scheduled_news_cleanup, 'cron', hour=3)
    scheduler.start()
    logger.info("Scheduler started")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
