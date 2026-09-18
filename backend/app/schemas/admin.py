import uuid
from datetime import datetime
from pydantic import BaseModel


class AdminUserRead(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    is_admin: bool
    emergency_stop: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    count: int
    users: list[AdminUserRead]


class AdminStatsResponse(BaseModel):
    total_users: int
    new_users_7d: int
    active_users_7d: int
    total_conversations: int
    total_messages: int
    total_tasks: int
    tasks_running: int
    total_images: int
    total_files: int
    total_automations: int
    automations_enabled: int
    usage_last_24h: dict
    plan_distribution: dict


class AdminUserUpdate(BaseModel):
    is_admin: bool | None = None
    emergency_stop: bool | None = None