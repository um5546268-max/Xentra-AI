from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# ── Requests ──
class LearnFromTopicRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    num_concepts: int = Field(default=8, ge=4, le=12)
    subject: str | None = None   
    class_name: str | None = None    


class LearnFromTextRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=20)
    subject: str | None = None        # ← NEW


class ReviewFlashcardRequest(BaseModel):
    quality: int = Field(ge=0, le=5)


class SubmitQuizRequest(BaseModel):
    answers: list[int]


# ── Responses ──
class ConceptOut(BaseModel):
    concept: str
    definition: str
    importance: int = 5
    prerequisites: list[str] = []


class FlashcardOut(BaseModel):
    id: UUID
    concept: str | None
    question: str
    answer: str
    difficulty: str
    next_review_at: datetime

    class Config:
        from_attributes = True


class QuizQuestionOut(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class SessionOut(BaseModel):
    id: UUID
    title: str
    topic: str | None
    source_type: str
    subject: str | None = None        # ← NEW
    summary: str | None
    concepts: list[dict[str, Any]] | None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionDetailOut(SessionOut):
    flashcards: list[FlashcardOut]
    latest_quiz: dict[str, Any] | None = None


class StudyStatsOut(BaseModel):
    total_sessions: int
    total_flashcards: int
    due_today: int
    mastered: int