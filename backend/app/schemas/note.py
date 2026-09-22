from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=300)
    body: str = Field(default="")
    color: str = Field(default="default")
    subject: str | None = None
    tags: list[str] | None = None
    session_id: UUID | None = None


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    body: str | None = None
    color: str | None = None
    pinned: bool | None = None
    subject: str | None = None
    tags: list[str] | None = None
    session_id: UUID | None = None


class NoteOut(BaseModel):
    id: UUID
    title: str
    body: str
    color: str
    pinned: bool
    subject: str | None
    tags: list[str] | None
    session_id: UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True