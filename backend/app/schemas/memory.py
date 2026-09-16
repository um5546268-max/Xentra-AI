import uuid
from datetime import datetime
from pydantic import BaseModel, Field


MEMORY_KINDS = ["preference", "fact", "project", "workflow", "correction", "note"]


class MemoryCreate(BaseModel):
    kind: str = Field(pattern="^(preference|fact|project|workflow|correction|note)$")
    key: str = Field(min_length=1, max_length=200)
    value: str = Field(min_length=1, max_length=2000)
    importance: int = Field(default=5, ge=1, le=10)
    pinned: bool = False


class MemoryUpdate(BaseModel):
    key: str | None = Field(default=None, max_length=200)
    value: str | None = Field(default=None, max_length=2000)
    importance: int | None = Field(default=None, ge=1, le=10)
    pinned: bool | None = None
    active: bool | None = None


class MemoryRead(BaseModel):
    id: uuid.UUID
    kind: str
    key: str
    value: str
    importance: int
    source: str
    pinned: bool
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MemoryListResponse(BaseModel):
    count: int
    memories: list[MemoryRead]