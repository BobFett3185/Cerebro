from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "ok"


# ---------------------------------------------------------------------------
# Auth0 User Login (email-based, no passwords)
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Auth – Phantom wallet challenge / verify
# ---------------------------------------------------------------------------
class ChallengeRequest(BaseModel):
    wallet_address: str = Field(..., min_length=32, max_length=44)


class ChallengeResponse(BaseModel):
    wallet_address: str
    challenge: str
    expires_in: int = 300


class VerifyRequest(BaseModel):
    wallet_address: str = Field(..., min_length=32, max_length=44)
    signature: str = Field(..., min_length=1)


class VerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    wallet_address: str
    is_new_user: bool


class AuthMeResponse(BaseModel):
    wallet_address: str
    username: str
    selected_skills: list[str] = []
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# Skill selection
# ---------------------------------------------------------------------------
class SkillSelectionRequest(BaseModel):
    wallet_address: str = Field(..., min_length=1)
    username: str = Field("", max_length=32)
    selected_skills: list[str] = Field(..., min_length=2, max_length=3)


class SkillSelectionResponse(BaseModel):
    wallet_address: str
    selected_skills: list[str]
    updated: bool


class UserSkillsResponse(BaseModel):
    wallet_address: str
    username: str
    selected_skills: list[str]
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# Questions / quiz
# ---------------------------------------------------------------------------
class QuestionOption(BaseModel):
    id: str
    text: str


class QuestionResponse(BaseModel):
    question_id: str
    topic: str
    question_text: str
    options: list[QuestionOption]
    correct_answer: str
    difficulty: str = "medium"


class AnswerSubmitRequest(BaseModel):
    wallet_address: str = Field(..., min_length=1)
    skill_topic: str
    question_text: str
    selected_answer: str
    correct_answer: str
    time_to_answer: float = Field(..., ge=0)
    game_type: str = "default"


class AnswerSubmitResponse(BaseModel):
    answered_correctly: bool
    explanation: str = ""
    points_awarded: int = 0


# ---------------------------------------------------------------------------
# Games
# ---------------------------------------------------------------------------
class GameEventRequest(BaseModel):
    wallet_address: str = Field(..., min_length=1)
    game_type: str
    event_type: str
    skill_topic: str = ""
    metadata: dict[str, Any] = {}


class GameEventResponse(BaseModel):
    event_id: str
    status: str = "recorded"


class GameResultRequest(BaseModel):
    winner_wallet: str = Field(..., min_length=1)
    loser_wallet: str = Field(..., min_length=1)
    game_type: str
    skill_topic: str = ""


class GameResultResponse(BaseModel):
    result_id: str
    winner_wallet: str
    loser_wallet: str
    game_type: str
    reward: dict[str, Any] = {}
