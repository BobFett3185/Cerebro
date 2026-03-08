from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import PyMongoError

from config import USERS_COLLECTION, EVENTS_COLLECTION, get_database
from services.solana_service import get_top_holders, get_wallet_token_balance

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def _short_wallet(address: str | None) -> str:
    """Return a human-friendly truncated wallet address."""
    if not address:
        return "unknown"
    if len(address) > 8:
        return f"{address[:4]}...{address[-4:]}"
    return address


@router.get("/")
async def get_leaderboard(limit: int = Query(20, ge=1, le=100)) -> dict:
    try:
        db = get_database()
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    # 1. Try on-chain top holders
    chain_data = await get_top_holders(limit)
    holders: list[dict] = chain_data.get("holders", [])

    # 2. If chain returned nothing (mock mode), aggregate from events
    if not holders:
        pipeline = [
            {"$group": {
                "_id": "$wallet_address",
                "total_points": {"$sum": "$points_awarded"},
                "total_correct": {"$sum": {"$cond": ["$answered_correctly", 1, 0]}},
                "total_answered": {"$sum": 1},
            }},
            {"$sort": {"total_points": -1}},
            {"$limit": limit},
        ]
        try:
            cursor = db[EVENTS_COLLECTION].aggregate(pipeline)
            agg_results = await cursor.to_list(length=limit)
        except PyMongoError:
            raise HTTPException(status_code=503, detail="Database temporarily unavailable")
        for doc in agg_results:
            wallet = doc.get("_id")
            if wallet is None:
                continue
            bal = await get_wallet_token_balance(wallet)
            holders.append({
                "wallet_address": wallet,
                "token_balance": bal.get("balance", 0.0),
                "total_points": doc.get("total_points", 0),
                "total_correct": doc.get("total_correct", 0),
                "total_answered": doc.get("total_answered", 0),
            })

    # 3. Map wallet addresses to usernames
    wallet_addresses = [h["wallet_address"] for h in holders]
    try:
        users_cursor = db[USERS_COLLECTION].find(
            {"wallet_address": {"$in": wallet_addresses}},
            {"_id": 0, "wallet_address": 1, "username": 1},
        )
        username_map: dict[str, str] = {}
        async for user in users_cursor:
            name = user.get("username", "")
            if name:
                username_map[user["wallet_address"]] = name
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    # 4. Build ranked response
    # Sort by total_points (from events) then token_balance as tiebreaker
    holders.sort(
        key=lambda h: (h.get("total_points", 0), h.get("token_balance", 0.0)),
        reverse=True,
    )

    leaderboard = []
    for rank, h in enumerate(holders[:limit], start=1):
        wallet = h.get("wallet_address") or "unknown"
        leaderboard.append({
            "rank": rank,
            "wallet_address": wallet,
            "username": username_map.get(wallet, ""),
            "display_name": username_map.get(wallet) or _short_wallet(wallet),
            "token_balance": h.get("token_balance", 0.0),
            "total_points": h.get("total_points", 0),
            "total_correct": h.get("total_correct", 0),
            "total_answered": h.get("total_answered", 0),
        })

    return {"leaderboard": leaderboard, "total": len(leaderboard)}
