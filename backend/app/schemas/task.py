import uuid
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


TaskStatus = Literal["queued", "running", "done", "failed", "paused", "cancelled"]
TaskType = Literal["chat", "research", "code", "shopping", "media", "generic"]


class TaskCreate(BaseModel):
    type: TaskType = "generic"
    conversation_id: uuid.UUID | None = None
    payload: dict[str, Any] | None = None


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    result: dict[str, Any] | None = None


class TaskRead(BaseModel):
    id: uuid.UUID
    type: str
    status: str
    progress: int
    payload: dict[str, Any] | None
    result: dict[str, Any] | None
    conversation_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}