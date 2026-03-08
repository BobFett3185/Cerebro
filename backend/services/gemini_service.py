from __future__ import annotations

import json
import logging
import re
from typing import Any

from google import genai

from config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)

_client: genai.Client | None = None

MCQ_KEYS = {"topic", "difficulty", "question_text", "options", "correct_answer", "explanation"}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _extract_json(text: str) -> dict | list | None:
    """Best-effort extraction of the first JSON object/array from LLM output."""
    text = re.sub(r"```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    start, end = text.find("["), text.rfind("]")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    return None


def _validate_mcq(data: Any) -> dict | None:
    if not isinstance(data, dict):
        return None
    if not MCQ_KEYS.issubset(data.keys()):
        return None
    if not isinstance(data["options"], list) or len(data["options"]) < 2:
        return None
    return data


def _fallback_mcq(topic: str, difficulty: str) -> dict:
    return {
        "topic": topic,
        "difficulty": difficulty,
        "question_text": f"What is a fundamental concept in {topic}?",
        "options": [
            {"id": "a", "text": "Concept A"},
            {"id": "b", "text": "Concept B"},
            {"id": "c", "text": "Concept C"},
            {"id": "d", "text": "Concept D"},
        ],
        "correct_answer": "a",
        "explanation": f"Placeholder question for {topic} — Gemini was unavailable.",
    }


def _fallback_explanation(correct_answer: str) -> str:
    return f"The correct answer is '{correct_answer}'. Review the topic for more details."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_mcq(topic: str, difficulty: str = "medium") -> dict:
    """Generate a single multiple-choice question for *topic* at *difficulty*."""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — returning fallback MCQ")
        return _fallback_mcq(topic, difficulty)

    prompt = (
        f'Generate one multiple-choice question about "{topic}" '
        f"at {difficulty} difficulty. "
        "Do NOT include code snippets in the question text. "
        "Keep the question conceptual and the options short.\n"
        "Return JSON with keys: topic, difficulty, question_text, "
        "options (array of {{id, text}}), correct_answer (a/b/c/d), explanation."
    )

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "temperature": 0.7,
                "max_output_tokens": 2048,
                "response_mime_type": "application/json",
            },
        )
        parsed = _extract_json(response.text)
        validated = _validate_mcq(parsed)
        if validated:
            return validated
        logger.warning("Gemini returned unparseable MCQ for topic=%s", topic)
    except Exception:
        logger.exception("Gemini API error for topic=%s", topic)

    return _fallback_mcq(topic, difficulty)


async def generate_question(topic: str, question_history: list) -> dict:
    """Generate an adaptive question based on topic and the user's past question history."""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — returning fallback MCQ")
        return _fallback_mcq(topic, "beginner")

    # Summarise history for the prompt — only include last 10 entries to keep prompt short
    history_summary = question_history[-10:] if question_history else []

    prompt = (
    f"You are a smart adaptive learning assistant. "
    f"Generate a multiple choice question for a user learning about {topic}. "
    f"Here is the user's question history: {history_summary}. "
    "If they are getting questions correct make it harder, if wrong make it easier. "
    "Return JSON with these exact keys: topic, difficulty, question_text, "
    "options (array of {id, text} objects with ids a/b/c/d), "
    "correct_answer (must be a/b/c/d), explanation. "
    "Return nothing else."
)

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "temperature": 0.7,
                "max_output_tokens": 2048,
                "response_mime_type": "application/json",
            },
        )
        parsed = _extract_json(response.text)
        validated = _validate_mcq(parsed)
        if validated:
            return validated
        logger.warning("Gemini returned unparseable adaptive question for topic=%s", topic)
    except Exception:
        logger.exception("Gemini adaptive question API error for topic=%s", topic)

    return _fallback_mcq(topic, "beginner")


async def generate_question_bank(
    skills: list[str],
    count_per_skill: int = 3,
    difficulty: str = "medium",
) -> list[dict]:
    """Generate an initial batch of MCQs across the given skills."""
    questions: list[dict] = []
    for skill in skills:
        for _ in range(count_per_skill):
            q = await generate_mcq(skill, difficulty)
            questions.append(q)
    return questions


async def generate_explanation(
    question_text: str,
    correct_answer: str,
    user_answer: str,
) -> str:
    """Return a short explanation for why the user's answer was wrong."""
    if not GEMINI_API_KEY:
        return _fallback_explanation(correct_answer)

    prompt = (
        "A student answered a quiz question incorrectly.\n\n"
        f"Question: {question_text}\n"
        f"Correct answer: {correct_answer}\n"
        f"Student's answer: {user_answer}\n\n"
        "In 1-2 sentences, explain why the correct answer is right and "
        "why the student's choice is wrong. Return ONLY the explanation text."
    )

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"temperature": 0.5, "max_output_tokens": 1024},
        )
        text = response.text.strip()
        if text:
            return text
    except Exception:
        logger.exception("Gemini explanation API error")

    return _fallback_explanation(correct_answer)
