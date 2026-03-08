from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import PyMongoError

from config import EVENTS_COLLECTION, get_database
from models.schemas import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    QuestionOption,
    QuestionResponse,
)
from services.gemini_service import generate_explanation, generate_mcq

router = APIRouter(prefix="/questions", tags=["questions"])


def _make_question_id(topic: str, text: str) -> str:
    return hashlib.sha256(f"{topic}:{text}".encode()).hexdigest()[:16]


@router.get("/next", response_model=QuestionResponse)
async def next_question(
    wallet_address: str = Query(..., min_length=1),
    topic: str = Query(..., min_length=1),
    difficulty: str = Query("medium"),
    game_type: str = Query("default"),
) -> QuestionResponse:
    mcq = await generate_mcq(topic, difficulty)

    question_id = _make_question_id(mcq["topic"], mcq["question_text"])

    options = [
        QuestionOption(id=opt["id"], text=opt["text"])
        for opt in mcq["options"]
    ]

    return QuestionResponse(
        question_id=question_id,
        topic=mcq["topic"],
        question_text=mcq["question_text"],
        options=options,
        correct_answer=mcq["correct_answer"],
        difficulty=mcq.get("difficulty", difficulty),
    )


@router.post("/submit", response_model=AnswerSubmitResponse)
async def submit_answer(body: AnswerSubmitRequest) -> AnswerSubmitResponse:
    answered_correctly = body.selected_answer == body.correct_answer

    # Points: 10 base, bonus for speed (under 10s)
    points_awarded = 0
    if answered_correctly:
        points_awarded = 10
        if body.time_to_answer < 10:
            points_awarded += max(0, int(5 - body.time_to_answer))

    explanation = ""
    if not answered_correctly:
        explanation = await generate_explanation(
            question_text=body.question_text,
            correct_answer=body.correct_answer,
            user_answer=body.selected_answer,
        )

    # Log event to MongoDB (optional if DB unavailable)
    try:
        db = get_database()
        question_id = _make_question_id(body.skill_topic, body.question_text)
        await db[EVENTS_COLLECTION].insert_one({
            "wallet_address": body.wallet_address,
            "skill_topic": body.skill_topic,
            "question_id": question_id,
            "answered_correctly": answered_correctly,
            "selected_answer": body.selected_answer,
            "correct_answer": body.correct_answer,
            "time_to_answer": body.time_to_answer,
            "game_type": body.game_type,
            "points_awarded": points_awarded,
            "timestamp": datetime.now(timezone.utc),
        })
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    return AnswerSubmitResponse(
        answered_correctly=answered_correctly,
        explanation=explanation,
        points_awarded=points_awarded,
    )
