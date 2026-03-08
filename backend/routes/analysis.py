from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError

from services.ml_service import build_skill_profile, get_cached_profile

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalysisInitRequest(BaseModel):
    wallet_address: str = Field(..., min_length=1)
    selected_skills: list[str] = Field(default_factory=list)


@router.post("/init")
async def init_analysis(body: AnalysisInitRequest) -> dict:
    """Compute (or recompute) a skill profile for the given wallet."""
    try:
        profile = await build_skill_profile(body.wallet_address, body.selected_skills)
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
    return {
        "status": profile["status"],
        "wallet_address": profile["wallet_address"],
        "total_questions": profile["total_questions"],
        "topic_breakdown": profile["topic_breakdown"],
        "strongest_topics": profile["strongest_topics"],
        "weakest_topics": profile["weakest_topics"],
        "recommended_focus_topic": profile["recommended_focus_topic"],
        "confidence_score": profile["confidence_score"],
    }


@router.get("/status")
async def analysis_status(
    wallet_address: str = Query(..., min_length=1),
) -> dict:
    """Return the most recent skill profile. Returns cold-start if none exists."""
    try:
        cached = await get_cached_profile(wallet_address)
        if cached:
            cached.pop("_id", None)
            return cached
        profile = await build_skill_profile(wallet_address, [])
        return profile
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
