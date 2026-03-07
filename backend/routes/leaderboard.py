from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/")
async def get_leaderboard() -> dict:
    return {
        "leaderboard": [
            {"rank": 1, "user_id": "user-a", "username": "alice", "score": 420},
            {"rank": 2, "user_id": "user-b", "username": "bob", "score": 350},
            {"rank": 3, "user_id": "user-c", "username": "charlie", "score": 280},
        ],
    }
