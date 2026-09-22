from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class PracticeCreate(BaseModel):
    session_id: UUID | None = None
    topic: str | None = None
    subject: str | None = None
    num_questions: int = Field(default=30, ge=10, le=50)
    duration_minutes: int = Field(default=30, ge=5, le=120)
    pass_threshold: int = Field(default=70, ge=0, le=100)


class PracticeSubmit(BaseModel):
    answers: list[int]


class PracticeOut(BaseModel):
    id: UUID
    title: str
    subject: str | None
    duration_minutes: int
    pass_threshold: int
    question_count: int
    started_at: datetime
    submitted_at: datetime | None
    score: int | None
    passed: bool | None

    class Config:
        from_attributes = True


class PracticeDetailOut(PracticeOut):
    questions: list[dict]


class PracticeResultOut(BaseModel):
    score: int
    passed: bool
    correct: int
    total: int
    details: list[dict]