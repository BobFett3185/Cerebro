from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/init")
async def init_analysis() -> dict:
    return {
        "analysis_id": "stub-analysis-1",
        "status": "pending",
        "message": "Analysis job queued.",
    }


@router.get("/status")
async def analysis_status() -> dict:
    return {
        "analysis_id": "stub-analysis-1",
        "status": "completed",
        "progress": 100,
        "result_summary": {},
    }
