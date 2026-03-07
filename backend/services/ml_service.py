from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import numpy as np
from sklearn.preprocessing import MinMaxScaler

from config import EVENTS_COLLECTION, USERS_COLLECTION, get_database

logger = logging.getLogger(__name__)

ANALYSES_COLLECTION = "analyses"

# Minimum events before we trust the model output over cold-start
MIN_EVENTS_FOR_ANALYSIS = 3


# ---------------------------------------------------------------------------
# Cold-start: user has no (or too few) answer events yet
# ---------------------------------------------------------------------------

def _cold_start_profile(wallet_address: str, skills: list[str]) -> dict:
    return {
        "wallet_address": wallet_address,
        "status": "cold_start",
        "total_questions": 0,
        "topic_breakdown": {s: _empty_topic_stats() for s in skills},
        "strongest_topics": [],
        "weakest_topics": skills[:],
        "recommended_focus_topic": skills[0] if skills else "",
        "confidence_score": 0.0,
        "generated_at": datetime.now(timezone.utc),
    }


def _empty_topic_stats() -> dict:
    return {"accuracy": 0.0, "avg_time": 0.0, "total": 0, "score": 0.0}


# ---------------------------------------------------------------------------
# Feature extraction from raw events
# ---------------------------------------------------------------------------

def _compute_topic_stats(events: list[dict]) -> dict[str, dict[str, Any]]:
    """Aggregate per-topic stats from a list of answer events."""
    topics: dict[str, dict[str, Any]] = {}
    for ev in events:
        t = ev.get("skill_topic", "unknown")
        if t not in topics:
            topics[t] = {"correct": 0, "total": 0, "times": [], "recent_correct": 0, "recent_total": 0}
        topics[t]["total"] += 1
        if ev.get("answered_correctly"):
            topics[t]["correct"] += 1
        topics[t]["times"].append(ev.get("time_to_answer", 15.0))

    # Recent window: last 5 events per topic for trend detection
    topic_events: dict[str, list[dict]] = {}
    for ev in events:
        t = ev.get("skill_topic", "unknown")
        topic_events.setdefault(t, []).append(ev)

    for t, evs in topic_events.items():
        recent = sorted(evs, key=lambda e: e.get("timestamp", 0), reverse=True)[:5]
        topics[t]["recent_correct"] = sum(1 for e in recent if e.get("answered_correctly"))
        topics[t]["recent_total"] = len(recent)

    return topics


def _score_topics(topic_stats: dict[str, dict]) -> dict[str, float]:
    """Compute a composite 0-1 score per topic.

    Weighted formula:
      60% accuracy  +  20% speed  +  20% recent trend
    """
    raw_scores: dict[str, float] = {}
    for topic, s in topic_stats.items():
        accuracy = s["correct"] / s["total"] if s["total"] else 0.0

        avg_time = np.mean(s["times"]) if s["times"] else 15.0
        # Speed score: 0s -> 1.0, 30s+ -> 0.0
        speed = max(0.0, 1.0 - float(avg_time) / 30.0)

        recent_acc = s["recent_correct"] / s["recent_total"] if s["recent_total"] else accuracy

        raw_scores[topic] = accuracy * 0.6 + speed * 0.2 + recent_acc * 0.2

    # Normalize across topics so scores are relative
    topics = list(raw_scores.keys())
    if len(topics) >= 2:
        arr = np.array([[raw_scores[t]] for t in topics])
        scaler = MinMaxScaler()
        normed = scaler.fit_transform(arr).flatten()
        return dict(zip(topics, [round(float(v), 3) for v in normed]))

    # Single topic: just clamp to 0-1
    return {t: round(min(1.0, max(0.0, v)), 3) for t, v in raw_scores.items()}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def build_skill_profile(wallet_address: str, selected_skills: list[str]) -> dict:
    """Analyze a user's answer history and return a skill profile dict."""
    db = get_database()

    # If no skills passed, try loading from user doc
    if not selected_skills:
        user = await db[USERS_COLLECTION].find_one({"wallet_address": wallet_address})
        selected_skills = user.get("selected_skills", []) if user else []

    events = await db[EVENTS_COLLECTION].find(
        {"wallet_address": wallet_address},
    ).to_list(length=500)

    if len(events) < MIN_EVENTS_FOR_ANALYSIS:
        return _cold_start_profile(wallet_address, selected_skills)

    topic_stats = _compute_topic_stats(events)
    topic_scores = _score_topics(topic_stats)

    # Rank topics by score descending
    ranked = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)

    strongest = [t for t, sc in ranked if sc >= 0.6][:3]
    weakest = [t for t, sc in ranked if sc < 0.4][:3]
    if not weakest and len(ranked) > 1:
        weakest = [ranked[-1][0]]

    recommended = weakest[0] if weakest else (ranked[-1][0] if ranked else (selected_skills[0] if selected_skills else ""))

    # Confidence grows with data volume — 50 events = 1.0
    confidence = round(min(1.0, len(events) / 50), 2)

    # Build per-topic breakdown for the frontend
    breakdown: dict[str, dict] = {}
    for t, s in topic_stats.items():
        breakdown[t] = {
            "accuracy": round(s["correct"] / s["total"], 2) if s["total"] else 0.0,
            "avg_time": round(float(np.mean(s["times"])), 1) if s["times"] else 0.0,
            "total": s["total"],
            "score": topic_scores.get(t, 0.0),
        }
    # Include selected skills with no events yet
    for sk in selected_skills:
        if sk not in breakdown:
            breakdown[sk] = _empty_topic_stats()

    profile = {
        "wallet_address": wallet_address,
        "status": "ready",
        "total_questions": len(events),
        "topic_breakdown": breakdown,
        "strongest_topics": strongest,
        "weakest_topics": weakest,
        "recommended_focus_topic": recommended,
        "confidence_score": confidence,
        "generated_at": datetime.now(timezone.utc),
    }

    # Persist for fast retrieval on GET
    await db[ANALYSES_COLLECTION].update_one(
        {"wallet_address": wallet_address},
        {"$set": profile},
        upsert=True,
    )

    return profile


async def get_cached_profile(wallet_address: str) -> dict | None:
    """Return the most recent stored profile, or None."""
    db = get_database()
    doc = await db[ANALYSES_COLLECTION].find_one(
        {"wallet_address": wallet_address},
        {"_id": 0},
    )
    return doc
