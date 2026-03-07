from __future__ import annotations

from fastapi import APIRouter

from models.schemas import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    QuestionOption,
    QuestionResponse,
)

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/next", response_model=QuestionResponse)
async def next_question() -> QuestionResponse:
    return QuestionResponse(
        question_id="stub-q-1",
        question_text="What is the time complexity of binary search?",
        options=[
            QuestionOption(id="a", text="O(n)"),
            QuestionOption(id="b", text="O(log n)"),
            QuestionOption(id="c", text="O(n log n)"),
            QuestionOption(id="d", text="O(1)"),
        ],
        difficulty="medium",
    )


@router.post("/submit", response_model=AnswerSubmitResponse)
async def submit_answer(body: AnswerSubmitRequest) -> AnswerSubmitResponse:
    return AnswerSubmitResponse(
        correct=body.selected_option_id == "b",
        correct_option_id="b",
        explanation="Binary search halves the search space each step.",
        score_delta=10 if body.selected_option_id == "b" else 0,
    )
