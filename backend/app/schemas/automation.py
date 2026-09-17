import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class AutomationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    schedule_type: str = Field(pattern="^(interval|daily|weekly)$")
    interval_minutes: int | None = Field(default=None, ge=1, le=10080)
    time_of_day: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    task_type: str = Field(min_length=1, max_length=30)
    task_payload: dict | None = None
    enabled: bool = True


class AutomationUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = None
    schedule_type: str | None = Field(default=None, pattern="^(interval|daily|weekly)$")
    interval_minutes: int | None = Field(default=None, ge=1, le=10080)
    time_of_day: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    task_type: str | None = Field(default=None, max_length=30)
    task_payload: dict | None = None
    enabled: bool | None = None


class AutomationRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    schedule_type: str
    interval_minutes: int | None
    time_of_day: str | None
    day_of_week: int | None
    task_type: str
    task_payload: dict | None
    enabled: bool
    last_run_at: datetime | None
    next_run_at: datetime | None
    run_count: int
    last_error: str | None
    consecutive_failures: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AutomationListResponse(BaseModel):
    count: int
    automations: list[AutomationRead]