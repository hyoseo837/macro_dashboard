from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import logging

from .config import settings
from .db import SessionLocal
from .routers import assets, prices
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
app.include_router(assets.router, tags=["assets"])
app.include_router(prices.router, tags=["prices"])

@app.on_event("startup")
async def startup_event():
    scheduler = AsyncIOScheduler()

    async def scheduled_refresh():
        async with SessionLocal() as db:
            await refresh_all_prices(db)

    # Refresh immediately on startup
    asyncio.create_task(scheduled_refresh())

    # Schedule every 15 minutes
    scheduler.add_job(scheduled_refresh, 'interval', minutes=15)
    scheduler.start()
    logger.info("Scheduler started")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
