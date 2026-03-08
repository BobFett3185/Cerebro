from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import PyMongoError

from config import USERS_COLLECTION, get_database
from models.schemas import (
    SkillSelectionRequest,
    SkillSelectionResponse,
    UserSkillsResponse,
)

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
async def list_skills(
    wallet_address: str | None = Query(None, min_length=1),
) -> dict:
    """Return available skills. If wallet_address is provided, also return
    the user's currently selected skills."""
    payload: dict = {"available_skills": AVAILABLE_SKILLS}

    if wallet_address:
        try:
            db = get_database()
            user = await db[USERS_COLLECTION].find_one(
                {"wallet_address": wallet_address},
                {"_id": 0, "wallet_address": 1, "username": 1,
                 "selected_skills": 1, "created_at": 1},
            )
        except PyMongoError:
            raise HTTPException(status_code=503, detail="Database temporarily unavailable")
        if user:
            payload["user"] = UserSkillsResponse(
                wallet_address=user["wallet_address"],
                username=user.get("username", ""),
                selected_skills=user.get("selected_skills", []),
                created_at=user.get("created_at"),
            ).model_dump()

    return payload


@router.post("/select", response_model=SkillSelectionResponse)
async def select_skills(body: SkillSelectionRequest) -> SkillSelectionResponse:
    """Create or update a user document with the chosen skills (upsert)."""
    invalid = [s for s in body.selected_skills if s not in AVAILABLE_SKILLS]
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid skills: {invalid}. Choose from: {AVAILABLE_SKILLS}",
        )

    try:
        db = get_database()
        now = datetime.now(timezone.utc)
        await db[USERS_COLLECTION].update_one(
        {"wallet_address": body.wallet_address},
        {
            "$set": {
                "selected_skills": body.selected_skills,
                "username": body.username or body.wallet_address,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    return SkillSelectionResponse(
        wallet_address=body.wallet_address,
        selected_skills=body.selected_skills,
        updated=True,
    )


@router.put("/update", response_model=SkillSelectionResponse)
async def update_skills(body: SkillSelectionRequest) -> SkillSelectionResponse:
    """Replace selected skills for an existing user. Returns 404 if user
    does not exist."""
    invalid = [s for s in body.selected_skills if s not in AVAILABLE_SKILLS]
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid skills: {invalid}. Choose from: {AVAILABLE_SKILLS}",
        )

    try:
        db = get_database()
        result = await db[USERS_COLLECTION].update_one(
            {"wallet_address": body.wallet_address},
            {"$set": {"selected_skills": body.selected_skills}},
        )
    except PyMongoError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail=f"User with wallet_address '{body.wallet_address}' not found.",
        )

    return SkillSelectionResponse(
        wallet_address=body.wallet_address,
        selected_skills=body.selected_skills,
        updated=True,
    )
