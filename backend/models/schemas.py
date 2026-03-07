from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "ok"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=8)


class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    skills: list[str] = []
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# Skill selection
# ---------------------------------------------------------------------------
class SkillSelectionRequest(BaseModel):
    user_id: str
    skills: list[str] = Field(..., min_length=1)


class SkillSelectionResponse(BaseModel):
    user_id: str
    skills: list[str]
    updated: bool = True


# ---------------------------------------------------------------------------
# Questions / quiz
# ---------------------------------------------------------------------------
class QuestionOption(BaseModel):
    id: str
    text: str


class QuestionResponse(BaseModel):
    question_id: str
    question_text: str
    options: list[QuestionOption]
    difficulty: str | None = None
    metadata: dict[str, Any] = {}


class AnswerSubmitRequest(BaseModel):
    user_id: str
    question_id: str
    selected_option_id: str


class AnswerSubmitResponse(BaseModel):
    correct: bool
    correct_option_id: str
    explanation: str = ""
    score_delta: int = 0
