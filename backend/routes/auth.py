from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/challenge")
async def request_challenge(wallet_address: str = "stub") -> dict:
    return {
        "challenge": "sign-this-nonce-123",
        "wallet_address": wallet_address,
        "expires_in": 300,
    }


@router.post("/verify")
async def verify_signature() -> dict:
    return {
        "access_token": "stub-jwt-token",
        "token_type": "bearer",
        "user_id": "stub-user-id",
    }


@router.get("/me")
async def get_current_user() -> dict:
    return {
        "id": "stub-user-id",
        "email": "stub@example.com",
        "username": "stub_user",
        "skills": [],
        "created_at": None,
    }
