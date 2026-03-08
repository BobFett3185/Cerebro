from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# Load .env from project root first, then backend/.env (with override) so backend can force local DB
_env_root = Path(__file__).resolve().parent.parent / ".env"
_env_backend = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_root)
load_dotenv(_env_backend, override=True)  # backend/.env overrides (e.g. local MongoDB)

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------
MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "Cerebro")

_motor_client: AsyncIOMotorClient | None = None


def get_motor_client() -> AsyncIOMotorClient:
    global _motor_client
    if _motor_client is None:
        # TLS only for Atlas (mongodb+srv); local MongoDB uses plain connection
        if MONGODB_URI.startswith("mongodb+srv://"):
            import certifi
            _motor_client = AsyncIOMotorClient(MONGODB_URI, tlsCAFile=certifi.where())
        else:
            _motor_client = AsyncIOMotorClient(MONGODB_URI)
    return _motor_client


def get_database() -> AsyncIOMotorDatabase:
    return get_motor_client()[MONGODB_DB_NAME]


async def close_mongo_connection() -> None:
    global _motor_client
    if _motor_client is not None:
        _motor_client.close()
        _motor_client = None


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

# ---------------------------------------------------------------------------
# Gemini AI  (placeholder – fill in .env when ready)
# ---------------------------------------------------------------------------
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ---------------------------------------------------------------------------
# Solana  (fill in .env for live devnet rewards)
# ---------------------------------------------------------------------------
SOLANA_RPC_URL: str = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
SOLANA_PRIVATE_KEY: str = os.getenv("SOLANA_PRIVATE_KEY", "")
SOLANA_MINT_ADDRESS: str = os.getenv("SOLANA_MINT_ADDRESS", "")
SOLANA_REWARDS_ENABLED: bool = os.getenv("SOLANA_REWARDS_ENABLED", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Collection names (single source of truth)
# ---------------------------------------------------------------------------
USERS_COLLECTION: str = "users"
EVENTS_COLLECTION: str = "events"
