import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class PendingActionRead(BaseModel):
    id: uuid.UUID
    action: str
    scope: str | None
    tier: str | None
    payload: dict | None
    summary: str
    source: str
    source_id: uuid.UUID | None
    status: str
    resolved_at: datetime | None
    resolution_note: str | None
    result: dict | None
    error: str | None
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class PendingActionListResponse(BaseModel):
    count: int
    pending: int
    actions: list[PendingActionRead]


class DenyActionRequest(BaseModel):
    note: str | None = None