import uuid
from datetime import datetime
from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: uuid.UUID
    title: str
    body: str | None
    level: str
    source: str
    source_id: uuid.UUID | None
    link: str | None
    read: bool
    meta: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    count: int
    unread: int
    notifications: list[NotificationRead]