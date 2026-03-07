from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from config import EVENTS_COLLECTION, get_database
from models.schemas import (
    GameEventRequest,
    GameEventResponse,
    GameResultRequest,
    GameResultResponse,
)
from services.solana_service import reward_game_win

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/event", response_model=GameEventResponse)
async def game_event(body: GameEventRequest) -> GameEventResponse:
    db = get_database()
    event_id = uuid.uuid4().hex[:16]

    await db[EVENTS_COLLECTION].insert_one({
        "event_id": event_id,
        "wallet_address": body.wallet_address,
        "game_type": body.game_type,
        "event_type": body.event_type,
        "skill_topic": body.skill_topic,
        "metadata": body.metadata,
        "timestamp": datetime.now(timezone.utc),
    })

    return GameEventResponse(event_id=event_id)


@router.post("/result", response_model=GameResultResponse)
async def game_result(body: GameResultRequest) -> GameResultResponse:
    db = get_database()
    result_id = uuid.uuid4().hex[:16]
    now = datetime.now(timezone.utc)

    # Log result for both players
    await db[EVENTS_COLLECTION].insert_one({
        "event_id": result_id,
        "event_type": "game_result",
        "game_type": body.game_type,
        "skill_topic": body.skill_topic,
        "winner_wallet": body.winner_wallet,
        "loser_wallet": body.loser_wallet,
        "timestamp": now,
    })

    # Reward the winner
    reward = await reward_game_win(body.winner_wallet)

    return GameResultResponse(
        result_id=result_id,
        winner_wallet=body.winner_wallet,
        loser_wallet=body.loser_wallet,
        game_type=body.game_type,
        reward=reward,
    )
