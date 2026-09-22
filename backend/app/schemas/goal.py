from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    target: int = Field(default=100, ge=1)
    current: int = Field(default=0, ge=0)
    unit: str = Field(default="%", max_length=20)
    subject: str | None = None
    deadline: datetime | None = None


class GoalUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = None
    target: int | None = Field(default=None, ge=1)
    current: int | None = Field(default=None, ge=0)
    unit: str | None = None
    subject: str | None = None
    deadline: datetime | None = None
    completed: bool | None = None


class GoalOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    target: int
    current: int
    unit: str
    subject: str | None
    deadline: datetime | None
    completed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True