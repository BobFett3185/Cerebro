from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import PyMongoError

from config import EVENTS_COLLECTION, USERS_COLLECTION, get_database
from models.schemas import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    QuestionOption,
    QuestionResponse,
)
from services.gemini_service import generate_explanation, generate_question

router = APIRouter(prefix="/questions", tags=["questions"])


def _make_question_id(topic: str, text: str) -> str:
    return hashlib.sha256(f"{topic}:{text}".encode()).hexdigest()[:16]


def _normalize_mcq(mcq: dict, topic: str) -> dict:
    """Normalize MCQ format to ensure consistent structure."""
    # Normalize question key
    if "question" in mcq and "question_text" not in mcq:
        mcq["question_text"] = mcq.pop("question")

    # Ensure topic exists
    if "topic" not in mcq:
        mcq["topic"] = topic

    # Convert plain string options to {id, text} format
    if "options" in mcq and isinstance(mcq["options"], list):
        if len(mcq["options"]) > 0 and isinstance(mcq["options"][0], str):
            mcq["options"] = [
                {"id": chr(97 + i), "text": opt}
                for i, opt in enumerate(mcq["options"])
            ]

    return mcq


# ---------------------------------------------------------------------------
# New adaptive endpoints (email-based, uses question_history)
# ---------------------------------------------------------------------------

@router.get("/generate")
async def generate_adaptive_question(email: str = Query(..., min_length=1)) -> dict:
    """Fetch user's current_skill + question_history from DB, then generate adaptive question."""
    try:
        db = get_database()
        user = await db[USERS_COLLECTION].find_one({"email": email})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not user:
        raise HTTPException(status_code=404, detail=f"User '{email}' not found.")

    # Prefer current_skill, fall back to first selected_skill
    topic = user.get("current_skill", "")
    if not topic:
        skills = user.get("selected_skills", [])
        if skills:
            topic = skills[0]
    if not topic:
        raise HTTPException(status_code=400, detail="No topic found. Please select a skill first.")

    question_history = user.get("question_history", [])
    result = await generate_question(topic, question_history)

    return {"success": True, "question": result, "topic": topic}


@router.post("/submit-answer")
async def submit_answer_adaptive(
    email: str = Query(..., min_length=1),
    question: str = Query(..., min_length=1),
    selected_answer: str = Query(..., min_length=1),
    correct_answer: str = Query(..., min_length=1),
    was_correct: bool = Query(...),
) -> dict:
    """Append a question result to the user's question_history in MongoDB."""
    try:
        db = get_database()
        entry = {
            "question": question,
            "selected_answer": selected_answer,
            "correct_answer": correct_answer,
            "was_correct": was_correct,
            "answered_at": datetime.now(timezone.utc),
        }
        result = await db[USERS_COLLECTION].update_one(
            {"email": email},
            {"$push": {"question_history": entry}},
        )
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"User '{email}' not found.")

    return {"success": True}


@router.get("/next", response_model=QuestionResponse)
async def next_question(
    wallet_address: str = Query(..., min_length=1),
    topic: str = Query(..., min_length=1),
    difficulty: str = Query("medium"),
    game_type: str = Query("default"),
) -> QuestionResponse:
    # Fetch user's question history from MongoDB
    try:
        db = get_database()
        user = await db[USERS_COLLECTION].find_one({"wallet_address": wallet_address})
        question_history = user.get("question_history", []) if user else []
    except PyMongoError:
        question_history = []

    # Generate adaptive question
    mcq = await generate_question(topic, question_history)

    # Normalize format
    mcq = _normalize_mcq(mcq, topic)

    # Validate we have required fields before proceeding
    if "question_text" not in mcq or "options" not in mcq or "correct_answer" not in mcq:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate a valid question. Please try again."
        )

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

    # Log event and update user in MongoDB
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

        await db[USERS_COLLECTION].update_one(
            {"wallet_address": body.wallet_address},
            {
                "$push": {"question_history": {
                    "question": body.question_text,
                    "topic": body.skill_topic,
                    "was_correct": answered_correctly,
                    "answered_at": datetime.now(timezone.utc)
                }},
                "$inc": {"points": points_awarded}
            }
        )

    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    return AnswerSubmitResponse(
        answered_correctly=answered_correctly,
        explanation=explanation,
        points_awarded=points_awarded,
    )