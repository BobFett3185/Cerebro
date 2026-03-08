from __future__ import annotations

import secrets
import time
from datetime import datetime, timedelta, timezone

import base58
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from config import (
    JWT_ALGORITHM,
    JWT_EXPIRY_HOURS,
    JWT_SECRET,
    USERS_COLLECTION,
    get_database,
)
from models.schemas import (
    AuthMeResponse,
    ChallengeRequest,
    ChallengeResponse,
    UserLoginRequest,
    UserLoginResponse,
    VerifyRequest,
    VerifyResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


# ---------------------------------------------------------------------------
# Auth0 User Login (email-based)
# ---------------------------------------------------------------------------

@router.post("/users/login", response_model=UserLoginResponse)
async def users_login(body: UserLoginRequest) -> UserLoginResponse:
    """Find or create a user by email (Auth0 flow — no passwords stored)."""
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
        existing["_id"] = str(existing["_id"])
        user_doc = existing

    return UserLoginResponse(success=True, user=user_doc)

# In-memory challenge store.  Fine for a single-process hackathon demo;
# swap to a Mongo TTL collection or Redis for multi-process production.
_challenges: dict[str, dict[str, str | float]] = {}

CHALLENGE_TTL_SECONDS = 300


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_jwt(wallet_address: str) -> str:
    payload = {
        "wallet_address": wallet_address,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _purge_expired_challenges() -> None:
    """Remove stale entries so the dict doesn't grow unbounded."""
    now = time.time()
    expired = [k for k, v in _challenges.items()
               if now - float(v["created_at"]) > CHALLENGE_TTL_SECONDS]
    for k in expired:
        _challenges.pop(k, None)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/challenge", response_model=ChallengeResponse)
async def request_challenge(body: ChallengeRequest) -> ChallengeResponse:
    _purge_expired_challenges()

    nonce = secrets.token_hex(16)
    challenge = (
        f"Sign this message to verify your wallet for HackAI.\n\n"
        f"Nonce: {nonce}"
    )

    _challenges[body.wallet_address] = {
        "challenge": challenge,
        "created_at": str(time.time()),
    }

    return ChallengeResponse(
        wallet_address=body.wallet_address,
        challenge=challenge,
        expires_in=CHALLENGE_TTL_SECONDS,
    )


@router.post("/verify", response_model=VerifyResponse)
async def verify_signature(body: VerifyRequest) -> VerifyResponse:
    # 1. Look up and consume the stored challenge
    stored = _challenges.pop(body.wallet_address, None)
    if stored is None:
        raise HTTPException(
            status_code=400,
            detail="No pending challenge for this wallet. Request /auth/challenge first.",
        )

    if time.time() - float(stored["created_at"]) > CHALLENGE_TTL_SECONDS:
        raise HTTPException(status_code=400, detail="Challenge expired. Request a new one.")

    # 2. Verify Ed25519 signature
    challenge_bytes = str(stored["challenge"]).encode("utf-8")
    try:
        pubkey_bytes = base58.b58decode(body.wallet_address)
        sig_bytes = base58.b58decode(body.signature)
        verify_key = VerifyKey(pubkey_bytes)
        verify_key.verify(challenge_bytes, sig_bytes)
    except BadSignatureError:
        raise HTTPException(status_code=401, detail="Signature verification failed.")
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed wallet address or signature.")

    # 3. Upsert user in MongoDB
    db = get_database()
    existing = await db[USERS_COLLECTION].find_one({"wallet_address": body.wallet_address})
    is_new_user = existing is None

    if is_new_user:
        await db[USERS_COLLECTION].insert_one({
            "wallet_address": body.wallet_address,
            "username": "",
            "selected_skills": [],
            "created_at": datetime.now(timezone.utc),
        })

    # 4. Issue JWT
    token = _create_jwt(body.wallet_address)

    return VerifyResponse(
        access_token=token,
        token_type="bearer",
        wallet_address=body.wallet_address,
        is_new_user=is_new_user,
    )


@router.get("/me", response_model=AuthMeResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthMeResponse:
    payload = _decode_jwt(credentials.credentials)
    wallet_address: str = payload["wallet_address"]

    db = get_database()
    user = await db[USERS_COLLECTION].find_one(
        {"wallet_address": wallet_address},
        {"_id": 0},
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    return AuthMeResponse(
        wallet_address=user["wallet_address"],
        username=user.get("username", ""),
        selected_skills=user.get("selected_skills", []),
        created_at=user.get("created_at"),
    )
