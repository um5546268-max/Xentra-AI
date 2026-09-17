from pydantic import BaseModel, Field


class EmergencyStopRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class EmergencyStopResponse(BaseModel):
    active: bool
    reason: str | None
    stopped_at: str | None
    tasks_cancelled: int | None = None
    automations_disabled: int | None = None
    pending_denied: int | None = None