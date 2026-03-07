"""Solana devnet reward service.

When SOLANA_REWARDS_ENABLED is true and a valid private key is configured,
the service executes real SOL transfers on devnet.  Otherwise every function
returns a deterministic mock response so the rest of the app keeps working.
"""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from config import (
    SOLANA_MINT_ADDRESS,
    SOLANA_PRIVATE_KEY,
    SOLANA_REWARDS_ENABLED,
    SOLANA_RPC_URL,
)

logger = logging.getLogger(__name__)

# Lazy imports — only loaded when rewards are actually enabled so the app
# still boots even if solana/solders aren't installed yet.
_client = None
_keypair = None


def _is_live() -> bool:
    return SOLANA_REWARDS_ENABLED and bool(SOLANA_PRIVATE_KEY)


def _get_client():
    """Return a cached AsyncClient for the configured RPC endpoint."""
    global _client
    if _client is None:
        from solana.rpc.async_api import AsyncClient
        _client = AsyncClient(SOLANA_RPC_URL)
    return _client


def _get_keypair():
    """Deserialise the signer keypair from the base-58 private key in config."""
    global _keypair
    if _keypair is None:
        import base58 as b58
        from solders.keypair import Keypair  # type: ignore[import-untyped]
        secret = b58.b58decode(SOLANA_PRIVATE_KEY)
        _keypair = Keypair.from_bytes(secret)
    return _keypair


def _mock_tx() -> str:
    """Generate a fake but realistic-looking tx signature for mock mode."""
    return f"mock_{uuid.uuid4().hex}"


# ---------------------------------------------------------------------------
# Public API — every function returns a stable dict for route consumption
# ---------------------------------------------------------------------------

async def get_wallet_token_balance(wallet_address: str) -> dict[str, Any]:
    """Return the SOL (or SPL token) balance for *wallet_address*."""
    if not _is_live():
        return {
            "wallet_address": wallet_address,
            "balance": 0.0,
            "token": "SOL",
            "mock": True,
            # TODO: return real SPL token balance when mint is configured
        }

    try:
        from solders.pubkey import Pubkey  # type: ignore[import-untyped]
        client = _get_client()
        pubkey = Pubkey.from_string(wallet_address)
        resp = await client.get_balance(pubkey)
        lamports = resp.value
        return {
            "wallet_address": wallet_address,
            "balance": lamports / 1e9,
            "token": "SOL",
            "mock": False,
        }
    except Exception:
        logger.exception("Failed to fetch balance for %s", wallet_address)
        return {
            "wallet_address": wallet_address,
            "balance": 0.0,
            "token": "SOL",
            "mock": False,
            "error": "balance_fetch_failed",
        }


async def reward_correct_answer(
    wallet_address: str,
    amount: float = 0.001,
) -> dict[str, Any]:
    """Transfer *amount* SOL to *wallet_address* as a correct-answer reward.

    TODO: swap to SPL token mint when SOLANA_MINT_ADDRESS is set up.
    """
    return await _transfer_sol(wallet_address, amount, reason="correct_answer")


async def reward_game_win(
    wallet_address: str,
    amount: float = 0.005,
) -> dict[str, Any]:
    """Transfer *amount* SOL to *wallet_address* as a game-win reward.

    TODO: swap to SPL token mint when SOLANA_MINT_ADDRESS is set up.
    """
    return await _transfer_sol(wallet_address, amount, reason="game_win")


async def get_top_holders(limit: int = 10) -> dict[str, Any]:
    """Return the top token holders.

    TODO: once SPL mint is live, use getProgramAccounts or an indexer.
    For now this returns placeholder data — the leaderboard route should
    prefer its own MongoDB-backed ranking instead.
    """
    # In a real implementation you'd query the token mint's largest accounts
    # via client.get_token_largest_accounts(mint_pubkey).
    return {
        "holders": [],
        "limit": limit,
        "mock": True,
        "note": "Implement with getProgramAccounts or MongoDB leaderboard.",
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _transfer_sol(
    recipient: str,
    amount: float,
    reason: str,
) -> dict[str, Any]:
    """Execute (or mock) a SOL transfer on devnet."""
    if not _is_live():
        logger.info("Mock reward: %s SOL -> %s (%s)", amount, recipient, reason)
        return {
            "wallet_address": recipient,
            "amount": amount,
            "token": "SOL",
            "tx_signature": _mock_tx(),
            "reason": reason,
            "mock": True,
            "status": "success",
        }

    try:
        from solders.pubkey import Pubkey  # type: ignore[import-untyped]
        from solders.system_program import TransferParams, transfer
        from solana.transaction import Transaction
        from solana.rpc.types import TxOpts

        client = _get_client()
        sender = _get_keypair()
        recipient_pubkey = Pubkey.from_string(recipient)
        lamports = int(amount * 1e9)

        ix = transfer(TransferParams(
            from_pubkey=sender.pubkey(),
            to_pubkey=recipient_pubkey,
            lamports=lamports,
        ))

        # Build, sign and send
        recent = await client.get_latest_blockhash()
        tx = Transaction(
            recent_blockhash=recent.value.blockhash,
            fee_payer=sender.pubkey(),
        )
        tx.add(ix)
        tx.sign(sender)

        resp = await client.send_transaction(
            tx,
            sender,
            opts=TxOpts(skip_preflight=True),
        )

        sig = str(resp.value)
        logger.info("Reward sent: %s SOL -> %s | tx=%s (%s)", amount, recipient, sig, reason)
        return {
            "wallet_address": recipient,
            "amount": amount,
            "token": "SOL",
            "tx_signature": sig,
            "reason": reason,
            "mock": False,
            "status": "success",
        }
    except Exception:
        logger.exception("SOL transfer failed: %s -> %s", amount, recipient)
        return {
            "wallet_address": recipient,
            "amount": amount,
            "token": "SOL",
            "tx_signature": None,
            "reason": reason,
            "mock": False,
            "status": "error",
            "error": "transfer_failed",
        }
