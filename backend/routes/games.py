from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/event")
async def game_event() -> dict:
    return {
        "event_id": "stub-event-1",
        "status": "registered",
        "message": "Game event recorded.",
    }


@router.post("/result")
async def game_result() -> dict:
    return {
        "result_id": "stub-result-1",
        "score": 0,
        "rewards": [],
        "message": "Game result saved.",
    }
