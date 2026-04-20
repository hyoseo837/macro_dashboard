import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://macro:macro@localhost:5433/macro_dashboard"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    ASSETS: List[dict] = [
        {"id": "kodex_sp500", "display_name": "KODEX 미국S&P500", "symbol": "379800.KS", "category": "etf", "currency": "KRW"},
        {"id": "tiger_nasdaq100", "display_name": "TIGER 미국나스닥100", "symbol": "133690.KS", "category": "etf", "currency": "KRW"},
        {"id": "tsla", "display_name": "Tesla", "symbol": "TSLA", "category": "equity", "currency": "USD"},
        {"id": "pltr", "display_name": "Palantir", "symbol": "PLTR", "category": "equity", "currency": "USD"},
        {"id": "btc", "display_name": "Bitcoin", "symbol": "BTC-USD", "category": "crypto", "currency": "USD"},
        {"id": "cadkrw", "display_name": "CAD / KRW", "symbol": "CADKRW=X", "category": "fx", "currency": "KRW"},
        {"id": "gold", "display_name": "Gold", "symbol": "GC=F", "category": "commodity", "currency": "USD"},
        {"id": "silver", "display_name": "Silver", "symbol": "SI=F", "category": "commodity", "currency": "USD"},
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
