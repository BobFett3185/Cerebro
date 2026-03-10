from __future__ import annotations

import json
import logging
import re
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException, Query # type: ignore[import]
from fastapi.middleware.cors import CORSMiddleware
from google import genai # type: ignore[import]
from pydantic import BaseModel, Field # type: ignore[import]
from pymongo.errors import PyMongoError # type: ignore[import]

from config import (
    GEMINI_API_KEY, # type: ignore[import]
    GEMINI_MODEL, # type: ignore[import]
    USERS_COLLECTION, # type: ignore[import]
    close_mongo_connection, # type: ignore[import]
    get_database, # type: ignore[import]
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


#lifespan

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    try:
        db = get_database()
        await db.command("ping")
    except Exception as e:
        logger.warning("MongoDB not available at startup: %s", e)
    yield
    await close_mongo_connection()


#app

app = FastAPI(title="Cerebro Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models

class HealthResponse(BaseModel):
    status: str = "ok"


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=1)


class UserLoginResponse(BaseModel):
    success: bool = True
    user: dict[str, Any]


class UpdateSkillsRequest(BaseModel):
    email: str = Field(..., min_length=1)
    selected_skills: list[str]


class UpdateSkillsResponse(BaseModel):
    success: bool = True
    user: dict[str, Any]


class SetCurrentSkillRequest(BaseModel):
    email: str = Field(..., min_length=1)
    current_skill: str = Field(..., min_length=1)


class SetCurrentSkillResponse(BaseModel):
    success: bool = True
    user: dict[str, Any]


#gemini helper functions
_gemini_client: genai.Client | None = None

def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client


def _extract_json(text: str) -> dict | list | None:
    """Best-effort extraction of the first JSON object/array from LLM output."""
    text = re.sub(r"```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])  # type: ignore[index]
        except json.JSONDecodeError:
            pass
    start, end = text.find("["), text.rfind("]")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])  # type: ignore[index]
        except json.JSONDecodeError:
            pass
    return None


def _validate_mcq(data: Any) -> dict | None:
    if not isinstance(data, dict):
        return None
    if "question" in data and "question_text" not in data:
        data["question_text"] = data.pop("question")
    for key in ("question_text", "options", "correct_answer"):
        if key not in data:
            return None
    if not isinstance(data["options"], list) or len(data["options"]) < 2:
        return None
    data.setdefault("topic", "General")
    data.setdefault("difficulty", "intermediate")
    data.setdefault("explanation", "")
    return data


def _fallback_mcq(topic: str) -> dict:
    return {
        "topic": topic,
        "difficulty": "beginner",
        "question_text": f"What is a fundamental concept in {topic}?",
        "options": [
            {"id": "a", "text": "Concept A"},
            {"id": "b", "text": "Concept B"},
            {"id": "c", "text": "Concept C"},
            {"id": "d", "text": "Concept D"},
        ],
        "correct_answer": "a",
        "explanation": f"Placeholder question for {topic} — Gemini was unavailable.",
    }


async def _generate_adaptive_question(topic: str, question_history: list) -> dict:
    """Generate an adaptive MCQ via Gemini based on the user's history."""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — returning fallback MCQ")
        return _fallback_mcq(topic)

    history_summary = question_history[-10:] if question_history else []  # type: ignore[index]
    prompt = (
        f"You are a smart adaptive learning assistant. "
        f"Generate a multiple choice question for a user learning about {topic}. "
        f"Here is the user's question history: {history_summary}. "
        "If they are getting questions correct make it harder, if wrong make it easier. "
        "Return JSON with these exact keys: topic, difficulty, question_text, "
        "options (array of {id, text} objects with ids a/b/c/d), "
        "correct_answer (must be a/b/c/d), explanation. "
        "Return nothing else."
    )
    try:
        client = _get_gemini_client()
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "temperature": 0.7,
                "max_output_tokens": 2048,
                "response_mime_type": "application/json",
            },
        )
        validated = _validate_mcq(_extract_json(response.text))
        if validated:
            return validated
    except Exception:
        logger.exception("Gemini adaptive question error for topic=%s", topic)

    return _fallback_mcq(topic)


#routes

@app.get("/")
async def root() -> dict:
    return {
        "name": "Cerebro Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": "/auth/users/login",
            "skills": "/skills/profile, /skills/update-skills, /skills/set-current-skill",
            "questions": "/questions/generate, /questions/submit-answer",
        },
    }


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse()


# -- Auth

@app.post("/auth/users/login", response_model=UserLoginResponse)
async def users_login(body: UserLoginRequest) -> UserLoginResponse:
    """Find or create a user by email (Auth0 flow)."""
    db = get_database()
    existing = await db[USERS_COLLECTION].find_one({"email": body.email})

    if existing is None:
        now = datetime.now(timezone.utc)
        new_user = {
            "email": body.email,
            "selected_skills": [],
            "points": 0,
            "wallet_address": "",
            "created_at": now,
        }
        result = await db[USERS_COLLECTION].insert_one(new_user)
        new_user["_id"] = str(result.inserted_id)
        user_doc = new_user
    else:
        existing["_id"] = str(existing["_id"]) # type: ignore[index]
        user_doc = existing

    return UserLoginResponse(success=True, user=user_doc) # type: ignore[arg-type]


# skills

@app.get("/skills/profile")
async def get_user_profile(email: str = Query(..., min_length=1)) -> dict:
    """Return the full user document for the given email."""
    try:
        db = get_database()
        user = await db[USERS_COLLECTION].find_one({"email": email})  # type: ignore[misc]
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not user:
        raise HTTPException(status_code=404, detail=f"User '{email}' not found.")

    user["_id"] = str(user["_id"])  # type: ignore[index]
    return {"success": True, "user": user}


@app.post("/skills/update-skills", response_model=UpdateSkillsResponse)
async def update_skills(body: UpdateSkillsRequest) -> UpdateSkillsResponse:
    """Update selected_skills for a user identified by email."""
    try:
        db = get_database()
        result = await db[USERS_COLLECTION].update_one(
            {"email": body.email},
            {"$set": {"selected_skills": body.selected_skills}},
        )
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"User '{body.email}' not found.")

    updated = await db[USERS_COLLECTION].find_one({"email": body.email})  # type: ignore[misc]
    if updated:
        updated["_id"] = str(updated["_id"])  # type: ignore[index]

    return UpdateSkillsResponse(success=True, user=updated or {})  # type: ignore[arg-type]


@app.post("/skills/set-current-skill", response_model=SetCurrentSkillResponse)
async def set_current_skill(body: SetCurrentSkillRequest) -> SetCurrentSkillResponse:
    """Set the user's currently active skill topic."""
    try:
        db = get_database()
        result = await db[USERS_COLLECTION].update_one(
            {"email": body.email},
            {"$set": {"current_skill": body.current_skill}},
        )
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"User '{body.email}' not found.")

    updated = await db[USERS_COLLECTION].find_one({"email": body.email})  # type: ignore[misc]
    if updated:
        updated["_id"] = str(updated["_id"])  # type: ignore[index]

    return SetCurrentSkillResponse(success=True, user=updated or {})  # type: ignore[arg-type]


# -- Questions ---------------------------------------------------------------

@app.get("/questions/generate")
async def generate_question(email: str = Query(..., min_length=1)) -> dict:
    """Fetch the user's current_skill + question_history, then generate an adaptive question."""
    try:
        db = get_database()
        user = await db[USERS_COLLECTION].find_one({"email": email})
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not user:
        raise HTTPException(status_code=404, detail=f"User '{email}' not found.")

    topic = user.get("current_skill", "")
    if not topic:
        skills = user.get("selected_skills", [])
        if skills:
            topic = skills[0]
    if not topic:
        raise HTTPException(status_code=400, detail="No topic found. Please select a skill first.")

    question_history = user.get("question_history", [])
    question = await _generate_adaptive_question(topic, question_history)
    return {"success": True, "question": question, "topic": topic}


@app.post("/questions/submit-answer")
async def submit_answer(
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


#entry point

if __name__ == "__main__":
    import uvicorn # type: ignore[import]
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
