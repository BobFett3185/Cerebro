from __future__ import annotations

from fastapi import APIRouter

from models.schemas import SkillSelectionRequest, SkillSelectionResponse

router = APIRouter(prefix="/skills", tags=["skills"])

AVAILABLE_SKILLS: list[str] = [
    "Python",
    "JavaScript",
    "Rust",
    "Solidity",
    "Machine Learning",
    "Data Structures",
    "Algorithms",
    "Web3",
]


@router.get("/")
async def list_skills() -> dict:
    return {"skills": AVAILABLE_SKILLS}


@router.post("/select", response_model=SkillSelectionResponse)
async def select_skills(body: SkillSelectionRequest) -> SkillSelectionResponse:
    return SkillSelectionResponse(
        user_id=body.user_id,
        skills=body.skills,
        updated=True,
    )


@router.put("/update", response_model=SkillSelectionResponse)
async def update_skills(body: SkillSelectionRequest) -> SkillSelectionResponse:
    return SkillSelectionResponse(
        user_id=body.user_id,
        skills=body.skills,
        updated=True,
    )
